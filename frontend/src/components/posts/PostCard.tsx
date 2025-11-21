/**
 * Post card component - displays a single post.
 */

'use client';

import type { Post } from '@/types/post';

interface PostCardProps {
  post: Post;
  onReact: (postId: string, reaction: string) => void;
}

/**
 * PostCard component.
 * TODO: Implement post display with emotion/interest tags and reactions
 */
export function PostCard({ post, onReact }: PostCardProps) {
  return (
    <div className="post-card">
      <h3>{post.title}</h3>
      <p>{post.content}</p>
      {/* TODO: Display emotion tags */}
      {/* TODO: Display interest tags */}
      {/* TODO: Add reaction buttons */}
      {/* TODO: Show reaction counts */}
    </div>
  );
}
