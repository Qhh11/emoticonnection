/**
 * Message input component - text input for sending messages.
 */

'use client';

import { useState } from 'react';

interface MessageInputProps {
  onSend: (content: string) => void;
}

/**
 * MessageInput component.
 *
 * TODO:
 * - Render textarea for message input
 * - Add send button
 * - Handle Enter key to send (Shift+Enter for new line)
 * - Clear input after sending
 * - Trigger typing indicator
 * - Add emoji picker (optional)
 */
export function MessageInput({ onSend }: MessageInputProps) {
  const [content, setContent] = useState('');

  const handleSend = () => {
    if (content.trim()) {
      onSend(content);
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // TODO: Handle Enter key to send
    // TODO: Handle Shift+Enter for new line
  };

  return (
    <div className="message-input">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
