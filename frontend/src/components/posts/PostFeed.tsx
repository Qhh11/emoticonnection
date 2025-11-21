/**
 * Post feed component.
 */

'use client';

import { PostCard } from './PostCard';
import type { Post } from '@/types/post';

interface PostFeedProps {
  posts: Post[];
  onReact: (postId: string, reaction: string) => void;
}

/**
 * PostFeed component. TODO: Implement post feed display
 */
export function PostFeed({ posts, onReact }: PostFeedProps) {
  return (
    <div className="post-feed">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onReact={onReact} />
      ))}
      {/* TODO: Add infinite scroll */}
    </div>
  );
}
