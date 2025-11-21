/**
 * Emotion indicator component - shows emotion analysis for a message.
 */

'use client';

import type { EmotionData } from '@/types/message';

interface EmotionIndicatorProps {
  emotionData: EmotionData;
}

/**
 * EmotionIndicator component.
 *
 * TODO:
 * - Display primary emotion with icon/color
 * - Show secondary emotions as tags
 * - Display tone and intent
 * - Show confidence scores (optional)
 * - Add tooltip with full analysis
 * - Enable feedback submission
 */
export function EmotionIndicator({ emotionData }: EmotionIndicatorProps) {
  return (
    <div className="emotion-indicator">
      {/* TODO: Display primary emotion */}
      <div className="primary-emotion">
        {emotionData.primaryEmotion}
      </div>

      {/* TODO: Display tone and intent */}

      {/* TODO: Add feedback buttons (accurate/not accurate) */}
    </div>
  );
}
