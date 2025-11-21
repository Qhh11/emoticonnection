/**
 * Type definitions for messages and conversations.
 */

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
  emotionData?: EmotionData;
}

export interface EmotionData {
  primaryEmotion: string;
  secondaryEmotions: string[];
  tone: string;
  intent: string;
  sentimentScore: number;
  confidenceScores: Record<string, number>;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  title?: string;
  createdAt: string;
  lastMessageAt?: string;
  unreadCount?: number;
  lastMessage?: Message;
}

export interface SendMessagePayload {
  senderId: string;
  receiverId: string;
  conversationId: string;
  content: string;
}

// TODO: Add WebSocket message types
export interface WebSocketMessage {
  type: 'message' | 'typing' | 'read';
  data: any;
}
