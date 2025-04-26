export interface PersonaInput {
  sessionId: string;
  explanation: string;
  imageBase64?: string;
  inputType: string; // "text", "speech", "text+drawing", etc.
  timestamp: string; // ISO 8601 format recommended
  // Potentially add previous chat history / emotion state here later
}

export interface PersonaScore {
  clarity: number; // 0-100
  engagement: number; // 0-100
  accuracy: number; // 0-100
  structure: number; // 0-100
  overall: number; // 0-100
}

export interface PersonaOutput {
  reaction: string;
  currentEmotionState: string; // e.g., "excited", "confused", "bored", "neutral"
  followUpQuestion: string;
  score: PersonaScore;
  badgesUnlocked: string[]; // List of badge names/IDs
}

export interface IPersona {
  personaId: string;
  systemPrompt: string; // The core instruction prompt for the LLM

  // Method to process user input and generate the persona's response
  interact(input: PersonaInput): Promise<PersonaOutput>;

  // Potentially other methods for initialization, state loading, etc.
} 