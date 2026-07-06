import { Mic, Send, Square } from 'lucide-react';
import React from 'react';
import { useState } from 'react';

import { useAssistantStore } from '../store/assistantStore.js';

export default function MicButton({ startListening, stopListening, sendText }) {
  const [text, setText] = useState('');
  const status = useAssistantStore((state) => state.status);
  const isRecording = status === 'listening';

  const submit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    sendText(text.trim());
    setText('');
  };

  return (
    <div className="control-strip">
      <button
        className={`mic-button ${isRecording ? 'recording' : ''}`}
        type="button"
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        title={isRecording ? 'Stop recording' : 'Start recording'}
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={(event) => {
          event.preventDefault();
          startListening();
        }}
        onTouchEnd={(event) => {
          event.preventDefault();
          stopListening();
        }}
      >
        {isRecording ? <Square size={24} /> : <Mic size={26} />}
      </button>
      <form className="text-input" onSubmit={submit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type a fallback question"
          aria-label="Typed question"
        />
        <button type="submit" title="Send text" aria-label="Send text">
          <Send size={19} />
        </button>
      </form>
    </div>
  );
}
