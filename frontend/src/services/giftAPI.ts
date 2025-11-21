/**
 * API service for gift suggestion functionality.
 */

import { apiGet, apiPost } from './api';
import type { GiftSuggestion, GiftSuggestionRequest, ScenarioGiftRequest, GiftFeedback } from '@/types/gift';

/**
 * Get gift suggestions for a recipient.
 * TODO: Implement gift suggestion request
 */
export async function getGiftSuggestions(
  request: GiftSuggestionRequest
): Promise<GiftSuggestion[]> {
  // TODO: POST to /api/gifts/suggest
  throw new Error('Not implemented');
}

/**
 * Get saved gift suggestions.
 * TODO: Implement saved suggestions retrieval
 */
export async function getSavedSuggestions(
  userId: string,
  recipientId?: string,
  limit?: number
): Promise<GiftSuggestion[]> {
  // TODO: GET from /api/gifts/suggestions/{userId}
  throw new Error('Not implemented');
}

/**
 * Get scenario-based gift suggestions.
 * TODO: Implement scenario matching
 */
export async function getScenarioGifts(
  request: ScenarioGiftRequest
): Promise<GiftSuggestion[]> {
  // TODO: POST to /api/gifts/scenario-match
  throw new Error('Not implemented');
}

/**
 * Submit feedback on a gift suggestion.
 * TODO: Implement feedback submission
 */
export async function submitGiftFeedback(feedback: GiftFeedback): Promise<void> {
  // TODO: POST to /api/gifts/suggestions/{suggestionId}/feedback
  throw new Error('Not implemented');
}

/**
 * Get gift categories.
 * TODO: Implement category retrieval
 */
export async function getGiftCategories(): Promise<any[]> {
  // TODO: GET from /api/gifts/categories
  throw new Error('Not implemented');
}

/**
 * Get trending gifts.
 * TODO: Implement trending gifts retrieval
 */
export async function getTrendingGifts(
  interestCategory?: string,
  limit?: number
): Promise<GiftSuggestion[]> {
  // TODO: GET from /api/gifts/trending
  throw new Error('Not implemented');
}

/**
 * Compare multiple gift options.
 * TODO: Implement gift comparison
 */
export async function compareGifts(
  giftIds: string[],
  recipientId: string
): Promise<any> {
  // TODO: POST to /api/gifts/compare
  throw new Error('Not implemented');
}
