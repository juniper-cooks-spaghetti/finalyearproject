export interface Content {
  id: string;
  title: string;
  type: string;
  url: string;
  description: string;
  createdAt: Date;
  userInteractions?: ContentLike[];
  _count?: {
    userInteractions: number;
  };
}

export interface ContentLike {
  id: string;
  userId: string;
  contentId: string;
  topicId: string;
  createdAt: Date;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  difficulty: number | null;
  estimatedTime: number | null;
  contents?: {
    content: {
      id: string;
      title: string;
      description: string;
      type: string;
      url: string;
    }
  }[];
}

export type TopicStatus = 'not_started' | 'in_progress' | 'completed';

export interface UserRoadmapTopic {
  id: string;
  customOrder: number;
  isSkipped: boolean;
  topic: Topic & {
    contents: {
      content: Content;
    }[];
  };
}

export interface TopicRecommendation {
  id: string;
  weight: number;
  transitionCount: number;
  lastTransitionAt: Date;
  afterTopic: Topic;
  afterTopicId: string;
  beforeTopic?: Topic;
  beforeTopicId?: string;
}

export interface CompletionState {
  status: TopicStatus;
  difficultyRating: number | null;
  timeSpent: number | null;
}

export interface TopicCompletion {
  id: string;
  userId: string;
  topicId: string;
  status: TopicStatus;
  difficultyRating: number | null;
  timeSpent: number | null;
  lastUpdated: Date;
}

export interface TopicCompletionResponse {
  success: boolean;
  completion: TopicCompletion | null;
  error?: string;
}

