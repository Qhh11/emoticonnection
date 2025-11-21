/**
 * Gift card component - displays a single gift suggestion.
 */

'use client';

import type { GiftSuggestion } from '@/types/gift';

interface GiftCardProps {
  suggestion: GiftSuggestion;
  onFeedback?: (suggestionId: string, wasHelpful: boolean) => void;
}

/**
 * GiftCard component.
 * TODO: Display gift description, reasoning, matched interests, and relevance score
 */
export function GiftCard({ suggestion, onFeedback }: GiftCardProps) {
  return (
    <div className="gift-card">
      <h4>{suggestion.giftDescription}</h4>
      <p>{suggestion.reasoning}</p>
      {/* TODO: Display matched interests */}
      {/* TODO: Display relevance score */}
      {/* TODO: Add feedback buttons */}
    </div>
  );
}
