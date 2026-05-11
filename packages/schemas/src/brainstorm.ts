export interface BrainstormNodeMetadata {
  description: string;
  tags: string[];
}

export interface BrainstormSession {
  topic: string;
  round: number;
  totalRounds: number;
  lastProcessedFeedbackAt?: string;
}
