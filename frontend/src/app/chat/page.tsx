/**
 * Chat page component.
 */

'use client';

import { ChatWindow } from '@/components/chat/ChatWindow';

/**
 * Chat page with conversation list and message view.
 *
 * TODO:
 * - Display conversation list sidebar
 * - Show active conversation messages
 * - Enable message sending
 * - Show emotion indicators
 * - Handle WebSocket connection
 */
export default function ChatPage() {
  // TODO: Use useChat hook
  // TODO: Get current user from auth context

  return (
    <div>
      <h1>Chat</h1>
      {/* TODO: Add ConversationList component */}
      {/* TODO: Add ChatWindow component */}
      {/* TODO: Add EmotionInsights panel */}
    </div>
  );
}
