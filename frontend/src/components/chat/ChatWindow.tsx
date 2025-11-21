/**
 * Chat window component - displays messages and input.
 */

'use client';

import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import type { Message } from '@/types/message';

interface ChatWindowProps {
  conversationId: string;
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUserId: string;
}

/**
 * ChatWindow component.
 *
 * TODO:
 * - Render message list with MessageItem components
 * - Show MessageInput for sending messages
 * - Auto-scroll to bottom on new messages
 * - Show loading state while fetching messages
 * - Show typing indicator when other user is typing
 * - Display emotion indicators for received messages
 */
export function ChatWindow({
  conversationId,
  messages,
  onSendMessage,
  currentUserId,
}: ChatWindowProps) {
  // TODO: Implement auto-scroll to bottom
  // TODO: Handle typing indicator

  return (
    <div className="chat-window">
      <div className="messages-container">
        {/* TODO: Map over messages and render MessageItem */}
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwnMessage={message.senderId === currentUserId}
          />
        ))}
      </div>

      <MessageInput onSend={onSendMessage} />
    </div>
  );
}
