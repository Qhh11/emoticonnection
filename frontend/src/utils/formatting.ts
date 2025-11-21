/**
 * Formatting utilities.
 */

/**
 * Format a date to relative time (e.g., "2 hours ago").
 * TODO: Implement relative time formatting
 */
export function formatRelativeTime(date: string | Date): string {
  // TODO: Calculate time difference
  // TODO: Return formatted string (e.g., "2 hours ago", "yesterday")
  return 'TODO';
}

/**
 * Format emotion score as percentage.
 * TODO: Implement percentage formatting
 */
export function formatEmotionScore(score: number): string {
  // TODO: Convert 0-1 score to percentage
  return `${Math.round(score * 100)}%`;
}

/**
 * Truncate text to max length with ellipsis.
 * TODO: Implement text truncation
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Format user display name.
 * TODO: Implement display name formatting
 */
export function formatDisplayName(user: { displayName?: string; username: string }): string {
  return user.displayName || user.username;
}
