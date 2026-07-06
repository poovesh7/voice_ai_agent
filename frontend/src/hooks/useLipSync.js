import { useCallback, useEffect, useRef } from 'react';

export function useLipSync(setMouthLevel) {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const attachAudio = useCallback(async (audioElement) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext || !audioElement) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
    }

    if (!sourceRef.current) {
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    await audioContextRef.current.resume();
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);

    const tick = () => {
      analyserRef.current.getByteFrequencyData(data);
      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      setMouthLevel(Math.min(1, average / 130));
      frameRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, [setMouthLevel]);

  const stop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setMouthLevel(0);
  }, [setMouthLevel]);

  return { attachAudio, stop };
}
