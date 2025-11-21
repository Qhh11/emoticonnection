/**
 * API service for chat and messaging functionality.
 */

import { apiGet, apiPost, apiPut } from './api';
import type { Message, Conversation, SendMessagePayload } from '@/types/message';

/**
 * Send a new message.
 *
 * TODO: Implement message sending via HTTP POST
 */
export async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  // TODO: POST to /api/chat/messages
  throw new Error('Not implemented');
}

/**
 * Get messages for a conversation.
 *
 * TODO: Implement message retrieval with pagination
 */
export async function getConversationMessages(
  conversationId: string,
  limit?: number,
  offset?: number
): Promise<Message[]> {
  // TODO: GET from /api/chat/messages/{conversationId}
  throw new Error('Not implemented');
}

/**
 * Get all conversations for a user.
 *
 * TODO: Implement conversation list retrieval
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  // TODO: GET from /api/chat/conversations
  throw new Error('Not implemented');
}

/**
 * Create a new conversation.
 *
 * TODO: Implement conversation creation
 */
export async function createConversation(participantIds: string[]): Promise<Conversation> {
  // TODO: POST to /api/chat/conversations
  throw new Error('Not implemented');
}

/**
 * Mark a message as read.
 *
 * TODO: Implement read status update
 */
export async function markMessageRead(messageId: string, userId: string): Promise<void> {
  // TODO: PUT to /api/chat/messages/{messageId}/read
  throw new Error('Not implemented');
}

/**
 * Connect to WebSocket for real-time chat.
 *
 * @param userId - User ID to connect as
 * @param onMessage - Callback for incoming messages
 *
 * TODO:
 * - Establish WebSocket connection
 * - Handle incoming messages
 * - Handle connection errors
 * - Implement reconnection logic
 */
export function connectToChatWebSocket(
  userId: string,
  onMessage: (message: Message) => void
): WebSocket {
  // TODO: Connect to /api/chat/ws/{userId}
  // TODO: Set up message handlers
  // TODO: Return WebSocket instance
  throw new Error('Not implemented');
}
