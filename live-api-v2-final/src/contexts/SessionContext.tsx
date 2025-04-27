import React, { createContext, useContext, useState } from 'react';

export type Persona = 'child' | 'professor' | 'historical';

type PersonaDetails = {
  name: string;
  title: string;
  description: string;
  imageUrl: string;
  color: string;
};

type SessionContextType = {
  topic: string;
  setTopic: (topic: string) => void;
  selectedPersona: Persona | null;
  setSelectedPersona: (persona: Persona) => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  recordingTime: number;
  setRecordingTime: (time: number) => void;
  score: number;
  setScore: (score: number) => void;
  feedback: string[];
  setFeedback: (feedback: string[]) => void;
  getPersonaDetails: (persona: Persona) => PersonaDetails;
  resetSession: () => void;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const personaData: Record<Persona, PersonaDetails> = {
  child: {
    name: "Curious Chloe",
    title: "Modern 5-Year-Old",
    description: "Explain to me like I'm 5! I'll ask simple but deep questions that get to the heart of your topic.",
    imageUrl: "/placeholder.svg",
    color: "bg-protege-child",
  },
  professor: {
    name: "Dr. Maxwell",
    title: "Expert Professor",
    description: "I'll challenge your knowledge with expert questions to ensure you truly understand your subject.",
    imageUrl: "/placeholder.svg",
    color: "bg-protege-professor",
  },
  historical: {
    name: "Marie Curie",
    title: "Historical Figure",
    description: "I'll provide a unique historical perspective on your topic based on my era and experiences.",
    imageUrl: "/placeholder.svg",
    color: "bg-protege-historical",
  }
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [topic, setTopic] = useState<string>('');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string[]>([]);

  const getPersonaDetails = (persona: Persona): PersonaDetails => {
    return personaData[persona];
  };

  const resetSession = () => {
    setTopic('');
    setSelectedPersona(null);
    setIsRecording(false);
    setRecordingTime(0);
    setScore(0);
    setFeedback([]);
  };

  return (
    <SessionContext.Provider 
      value={{ 
        topic, 
        setTopic,
        selectedPersona, 
        setSelectedPersona,
        isRecording,
        setIsRecording,
        recordingTime,
        setRecordingTime,
        score,
        setScore,
        feedback,
        setFeedback,
        getPersonaDetails,
        resetSession
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
