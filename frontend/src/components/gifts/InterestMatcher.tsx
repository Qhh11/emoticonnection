/**
 * Interest matcher component for gift suggestions.
 */

'use client';

/**
 * InterestMatcher component.
 * TODO: Display how gift matches recipient's interests
 */
export function InterestMatcher({ matchedInterests }: { matchedInterests: string[] }) {
  return (
    <div className="interest-matcher">
      <h5>Matched Interests:</h5>
      {matchedInterests.map((interest) => (
        <span key={interest} className="interest-tag">{interest}</span>
      ))}
    </div>
  );
}
