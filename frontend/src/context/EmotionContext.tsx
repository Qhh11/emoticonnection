/**
 * Emotion context provider.
 */

'use client';

import { createContext, useContext, useState } from 'react';

interface EmotionContextType {
  showEmotionIndicators: boolean;
  toggleEmotionIndicators: () => void;
  emotionFeedbackEnabled: boolean;
}

const EmotionContext = createContext<EmotionContextType | undefined>(undefined);

/**
 * EmotionProvider component.
 * TODO: Manage global emotion settings and preferences
 */
export function EmotionProvider({ children }: { children: React.ReactNode }) {
  const [showEmotionIndicators, setShowEmotionIndicators] = useState(true);
  const [emotionFeedbackEnabled, setEmotionFeedbackEnabled] = useState(true);

  const toggleEmotionIndicators = () => {
    setShowEmotionIndicators(!showEmotionIndicators);
  };

  return (
    <EmotionContext.Provider
      value={{
        showEmotionIndicators,
        toggleEmotionIndicators,
        emotionFeedbackEnabled,
      }}
    >
      {children}
    </EmotionContext.Provider>
  );
}

export function useEmotionContext() {
  const context = useContext(EmotionContext);
  if (!context) {
    throw new Error('useEmotionContext must be used within EmotionProvider');
  }
  return context;
}
