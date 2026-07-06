import { useCallback, useEffect, useRef } from 'react';

import { useLipSync } from './useLipSync.js';
import { useAssistantStore } from '../store/assistantStore.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
const MIN_RECORDING_BYTES = 2048;
const MIN_RECORDING_MS = 600;

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadHistory(sessionId, setMessages) {
  if (!sessionId) return;
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}`);
  if (!response.ok) return;
  const data = await response.json();
  setMessages(data.messages ?? []);
}

async function ensureSession(sessionId, setSessionId) {
  if (sessionId) return sessionId;
  const response = await fetch(`${API_URL}/api/sessions`, { method: 'POST' });
  if (!response.ok) throw new Error('Backend unreachable. Start FastAPI and try again.');
  const data = await response.json();
  setSessionId(data.id);
  return data.id;
}

export function useVoiceSocket() {
  const socketRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(new Audio());
  const assistantTextRef = useRef('');
  const recordedBytesRef = useRef(0);
  const recordingStartedAtRef = useRef(0);
  const recordingMimeTypeRef = useRef('audio/webm');
  const pendingChunkPromisesRef = useRef([]);

  const {
    sessionId,
    setSessionId,
    setStatus,
    setTranscript,
    setLiveResponse,
    appendLiveResponse,
    setMessages,
    addMessage,
    setError,
    setMouthLevel,
    resetTurn,
  } = useAssistantStore();
  const { attachAudio, stop: stopLipSync } = useLipSync(setMouthLevel);

  const waitForSocketOpen = useCallback((socket) => {
    if (socket.readyState === WebSocket.OPEN) return Promise.resolve(socket);

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('Backend WebSocket did not open.')), 8000);
      socket.addEventListener(
        'open',
        () => {
          window.clearTimeout(timeout);
          resolve(socket);
        },
        { once: true },
      );
      socket.addEventListener(
        'error',
        () => {
          window.clearTimeout(timeout);
          reject(new Error('Backend unreachable. Check VITE_WS_URL and the FastAPI server.'));
        },
        { once: true },
      );
    });
  }, []);

  const connect = useCallback(async () => {
    const activeSessionId = await ensureSession(sessionId, setSessionId);
    if (socketRef.current?.readyState === WebSocket.OPEN) return socketRef.current;

    const socket = new WebSocket(`${WS_URL}/ws/${activeSessionId}`);
    socketRef.current = socket;

    socket.onopen = () => {
      setError('');
      loadHistory(activeSessionId, setMessages).catch(() => {});
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'status') {
        setStatus(message.status);
      }

      if (message.type === 'transcript') {
        setTranscript(message.text);
        addMessage({
          id: crypto.randomUUID(),
          session_id: activeSessionId,
          role: 'user',
          content: message.text,
          created_at: new Date().toISOString(),
        });
      }

      if (message.type === 'response_chunk') {
        setStatus('speaking');
        assistantTextRef.current += message.text;
        appendLiveResponse(message.text);
      }

      if (message.type === 'audio_chunk') {
        const audio = audioRef.current;
        audio.src = `data:${message.mime_type || 'audio/mpeg'};base64,${message.data}`;
        await attachAudio(audio);
        await audio.play();
      }

      if (message.type === 'response_end') {
        const finalText = message.text || assistantTextRef.current;
        if (finalText.trim()) {
          addMessage({
            id: crypto.randomUUID(),
            session_id: activeSessionId,
            role: 'assistant',
            content: finalText,
            created_at: new Date().toISOString(),
          });
          if (!message.audio_sent && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(finalText);
            utterance.onstart = () => setStatus('speaking');
            utterance.onend = () => {
              setStatus('idle');
              stopLipSync();
            };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          } else {
            setStatus('idle');
          }
        }
        assistantTextRef.current = '';
      }

      if (message.type === 'error') {
        setStatus('idle');
        setError(message.message);
      }
    };

    socket.onclose = () => {
      setStatus('idle');
    };

    socket.onerror = () => {
      setError('Backend unreachable. Check VITE_WS_URL and the FastAPI server.');
      setStatus('idle');
    };

    return waitForSocketOpen(socket);
  }, [
    sessionId,
    setSessionId,
    setStatus,
    setTranscript,
    setLiveResponse,
    appendLiveResponse,
    setMessages,
    addMessage,
    setError,
    attachAudio,
    stopLipSync,
    waitForSocketOpen,
  ]);

  useEffect(() => {
    connect().catch((error) => setError(error.message));
    return () => {
      socketRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [connect, setError]);

  const startListening = async () => {
    resetTurn();
    recordedBytesRef.current = 0;
    pendingChunkPromisesRef.current = [];
    recordingStartedAtRef.current = Date.now();
    setStatus('listening');
    const socket = await connect();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Mic capture is not available in this browser.');
      setStatus('idle');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: preferredMimeType });
      recordingMimeTypeRef.current = recorder.mimeType || preferredMimeType;
      recorderRef.current = recorder;

      recorder.ondataavailable = async (event) => {
        if (event.data.size && socket.readyState === WebSocket.OPEN) {
          recordedBytesRef.current += event.data.size;
          const chunkPromise = blobToBase64(event.data).then((data) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  type: 'audio_chunk',
                  data,
                  mime_type: event.data.type || recordingMimeTypeRef.current,
                }),
              );
            }
          });
          pendingChunkPromisesRef.current.push(chunkPromise);
        }
      };

      recorder.onstop = async () => {
        const recordingMs = Date.now() - recordingStartedAtRef.current;
        await Promise.allSettled(pendingChunkPromisesRef.current);
        if (socket.readyState === WebSocket.OPEN) {
          if (recordedBytesRef.current >= MIN_RECORDING_BYTES && recordingMs >= MIN_RECORDING_MS) {
            socket.send(JSON.stringify({ type: 'audio_end', mime_type: recordingMimeTypeRef.current }));
          } else {
            setStatus('idle');
            setError('Hold the mic a little longer before releasing.');
          }
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
    } catch (error) {
      setStatus('idle');
      setError(error.name === 'NotAllowedError' ? 'Mic permission denied.' : error.message);
    }
  };

  const stopListening = () => {
    setStatus('thinking');
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  };

  const sendText = async (text) => {
    resetTurn();
    const socket = await connect();
    assistantTextRef.current = '';
    setLiveResponse('');
    setStatus('thinking');
    socket.send(JSON.stringify({ type: 'text_input', data: text }));
  };

  return { startListening, stopListening, sendText };
}
