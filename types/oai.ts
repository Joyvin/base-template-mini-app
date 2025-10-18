export interface OAIResponse {
  question: string;
  type: string;
  options?: string[];
  answer: string | number;
  hint: string;
  steps?: string[];
  pairs?: Record<string, string>;
  range?: {
    min: number;
    max: number;
  };
}
