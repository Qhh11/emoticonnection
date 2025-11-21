/**
 * Type definitions for posts.
 */

export interface Post {
  id: string;
  authorId: string;
  authorName?: string;
  content: string;
  title?: string;
  emotionTags: string[];
  interestTags: string[];
  visibility: 'public' | 'friends' | 'private';
  viewCount: number;
  reactionCounts: Record<string, number>;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePostPayload {
  authorId: string;
  content: string;
  title?: string;
  emotionTags: string[];
  interestTags: string[];
  visibility?: 'public' | 'friends' | 'private';
}

export interface PostReaction {
  postId: string;
  userId: string;
  reactionType: string;
  createdAt: string;
}

// TODO: Add comment types if implementing comments
export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}
