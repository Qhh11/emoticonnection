/**
 * Gift suggestion list component.
 */

'use client';

import { GiftCard } from './GiftCard';
import type { GiftSuggestion } from '@/types/gift';

interface GiftSuggestionListProps {
  suggestions: GiftSuggestion[];
  onFeedback?: (suggestionId: string, wasHelpful: boolean) => void;
}

/**
 * GiftSuggestionList component.
 * TODO: Display list of gift suggestions with GiftCard components
 */
export function GiftSuggestionList({ suggestions, onFeedback }: GiftSuggestionListProps) {
  return (
    <div className="gift-suggestion-list">
      {suggestions.map((suggestion) => (
        <GiftCard key={suggestion.id} suggestion={suggestion} onFeedback={onFeedback} />
      ))}
    </div>
  );
}
