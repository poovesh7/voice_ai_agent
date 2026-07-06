import { Clock3 } from 'lucide-react';
import React from 'react';

import { useAssistantStore } from '../store/assistantStore.js';

function cleanMessageContent(content) {
  return content
    .replace(/\{\s*"name"\s*:\s*"[^"]+".*?\}/gs, '')
    .replace(/\[\s*,?\s*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ConversationHistory() {
  const messages = useAssistantStore((state) => state.messages);

  return (
    <aside className="history-panel">
      <div className="history-heading">
        <Clock3 size={18} />
        <h2>History</h2>
      </div>
      <div className="message-list">
        {messages.length === 0 ? (
          <p className="empty-state">No messages yet.</p>
        ) : (
          messages.map((message) => {
            const content = cleanMessageContent(message.content);
            if (!content) return null;
            return (
              <article className={`message ${message.role}`} key={message.id}>
                <span>{message.role}</span>
                <p>{content}</p>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}
