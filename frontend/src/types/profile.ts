/**
 * Type definitions for user profiles and personality.
 */

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  interestTags: string[];
  emotionProfile?: EmotionProfile;
  personalityData?: PersonalityData;
  communicationStyle?: string;
  totalMessages: number;
  totalPosts: number;
  createdAt: string;
  updatedAt?: string;
}

export interface EmotionProfile {
  dominantEmotions: string[];
  emotionDistribution: Record<string, number>;
  emotionStability: number;
  lastUpdated: string;
}

export interface PersonalityData {
  traits: Record<string, number>; // trait name -> score (0-100)
  communicationStyle: string;
  strengths: string[];
  growthAreas: string[];
  summary?: string;
  lastGenerated: string;
}

export interface PersonalityInsights {
  traits: Record<string, number>;
  communicationStyle: string;
  strengths: string[];
  growthAreas: string[];
  summary: string;
}

export interface UpdateInterestsPayload {
  addInterests: string[];
  removeInterests: string[];
}
