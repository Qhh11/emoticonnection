/**
 * Message item component - displays a single message.
 */

'use client';

import { EmotionIndicator } from './EmotionIndicator';
import type { Message } from '@/types/message';

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

/**
 * MessageItem component.
 *
 * TODO:
 * - Display message content
 * - Show sender name and timestamp
 * - Show emotion indicator for received messages
 * - Apply different styling for sent vs received messages
 * - Show read status for sent messages
 */
export function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  return (
    <div className={`message-item ${isOwnMessage ? 'sent' : 'received'}`}>
      <div className="message-content">
        {message.content}
      </div>

      {/* TODO: Add timestamp */}

      {/* TODO: Show emotion indicator only for received messages */}
      {!isOwnMessage && message.emotionData && (
        <EmotionIndicator emotionData={message.emotionData} />
      )}

      {/* TODO: Show read status for sent messages */}
    </div>
  );
}
