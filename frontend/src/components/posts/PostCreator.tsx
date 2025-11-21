/**
 * Post creator component - form for creating new posts.
 */

'use client';

import { useState } from 'react';
import { EmotionTagSelector } from './EmotionTagSelector';

interface PostCreatorProps {
  onCreatePost: (content: string, emotionTags: string[], interestTags: string[]) => void;
}

/**
 * PostCreator component.
 * TODO: Implement post creation form with emotion and interest tag selectors
 */
export function PostCreator({ onCreatePost }: PostCreatorProps) {
  const [content, setContent] = useState('');
  const [emotionTags, setEmotionTags] = useState<string[]>([]);
  const [interestTags, setInterestTags] = useState<string[]>([]);

  const handleSubmit = () => {
    // TODO: Validate input
    // TODO: Call onCreatePost
    // TODO: Clear form
  };

  return (
    <div className="post-creator">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
      />
      {/* TODO: Add EmotionTagSelector */}
      {/* TODO: Add InterestTagSelector */}
      <button onClick={handleSubmit}>Post</button>
    </div>
  );
}
