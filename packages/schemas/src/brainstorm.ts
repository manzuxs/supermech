export interface BrainstormNodeMetadata {
  description: string;
  tags: string[];
  score: number;
}

export interface BrainstormSession {
  topic: string;
  round: number;
  totalRounds: number;
}
