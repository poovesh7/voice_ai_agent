import { Activity, AlertCircle } from 'lucide-react';
import React from 'react';

import { useAssistantStore } from '../store/assistantStore.js';

export default function TranscriptPanel() {
  const status = useAssistantStore((state) => state.status);
  const transcript = useAssistantStore((state) => state.transcript);
  const liveResponse = useAssistantStore((state) => state.liveResponse);
  const error = useAssistantStore((state) => state.error);

  return (
    <section className="transcript-panel" aria-live="polite">
      <div className="status-row">
        <Activity size={17} />
        <span>{status}</span>
      </div>
      <p className="caption user-caption">{transcript || 'Voice caption will appear here.'}</p>
      <p className="caption assistant-caption">{liveResponse || 'The assistant response streams here.'}</p>
      {error ? (
        <div className="error-row">
          <AlertCircle size={17} />
          <span>{error}</span>
        </div>
      ) : null}
    </section>
  );
}
