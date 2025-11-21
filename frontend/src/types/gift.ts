/**
 * Type definitions for gift suggestions.
 */

export interface GiftSuggestion {
  id: string;
  giftDescription: string;
  giftCategory: string;
  reasoning: string;
  relevanceScore: number;
  matchedInterests: string[];
  occasion?: string;
  createdAt: string;
}

export interface GiftSuggestionRequest {
  recipientId: string;
  requesterId: string;
  occasion?: string;
  budgetMin?: number;
  budgetMax?: number;
  context?: string;
}

export interface ScenarioGiftRequest {
  recipientId: string;
  scenarioDescription: string;
  context?: Record<string, any>;
}

export interface GiftFeedback {
  suggestionId: string;
  userId: string;
  wasHelpful: boolean;
  wasUsed: boolean;
  feedbackText?: string;
}
