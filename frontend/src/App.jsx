import React from 'react';

import AvatarScene from './components/AvatarScene.jsx';
import ConversationHistory from './components/ConversationHistory.jsx';
import MicButton from './components/MicButton.jsx';
import TranscriptPanel from './components/TranscriptPanel.jsx';
import { useVoiceSocket } from './hooks/useVoiceSocket.js';

export default function App() {
  const voice = useVoiceSocket();

  return (
    <main className="app-shell">
      <section className="stage">
        <div className="topbar">
          <div>
            <p>3D AI Voice Assistant</p>
            <h1>Jarvis</h1>
          </div>
        </div>
        <div className="avatar-wrap">
          <AvatarScene />
        </div>
        <TranscriptPanel />
        <MicButton {...voice} />
      </section>
      <ConversationHistory />
    </main>
  );
}
