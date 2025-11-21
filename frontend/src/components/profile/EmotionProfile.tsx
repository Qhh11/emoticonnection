/**
 * Emotion profile component.
 */

'use client';

import type { EmotionProfile } from '@/types/profile';

interface EmotionProfileProps {
  emotionProfile: EmotionProfile;
}

/**
 * EmotionProfile component.
 * TODO: Display emotion distribution chart and dominant emotions
 */
export function EmotionProfile({ emotionProfile }: EmotionProfileProps) {
  return (
    <div className="emotion-profile">
      <h3>Emotion Profile</h3>
      {/* TODO: Display dominant emotions */}
      {/* TODO: Display emotion distribution chart */}
      {/* TODO: Display emotion stability score */}
    </div>
  );
}
