import React, { createContext, useContext, useState } from 'react';

export type Persona = 'child' | 'professor' | 'custom';

export type PersonaDetails = {
  name: string;
  title: string;
  description: string;
  imageUrl: string;
  color: string;
  gender: string;
};

export type TranscriptEntry = {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
};

type SessionContextType = {
  topic: string;
  setTopic: (topic: string) => void;
  selectedPersona: Persona | null;
  setSelectedPersona: (persona: Persona) => void;
  customPersonaName: string;
  setCustomPersonaName: (name: string) => void;
  customPersonaTitle: string;
  setCustomPersonaTitle: (title: string) => void;
  customPersonaDescription: string;
  setCustomPersonaDescription: (description: string) => void;
  customPersonaGender: string;
  setCustomPersonaGender: (gender: string) => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  recordingTime: number;
  setRecordingTime: (time: number) => void;
  score: number;
  setScore: (score: number) => void;
  feedback: string[];
  setFeedback: (feedback: string[]) => void;
  transcript: TranscriptEntry[];
  addTranscriptEntry: (entry: Omit<TranscriptEntry, 'timestamp'>) => void;
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
    gender: "female",
  },
  professor: {
    name: "Dr. Maxwell",
    title: "Expert Professor",
    description: "I'll challenge your knowledge with expert questions to ensure you truly understand your subject.",
    imageUrl: "/placeholder.svg",
    color: "bg-protege-professor",
    gender: "male",
  },
  custom: {
    name: "Dynamic Character",
    title: "Historical Figure",
    description: "I'll provide a unique perspective on your topic based on my era and experiences. Please define my details!",
    imageUrl: "/placeholder.svg",
    color: "bg-protege-historical",
    gender: "male",
  }
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [topic, setTopic] = useState<string>('Explain quantum physics');
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>('professor');
  const [customPersonaName, setCustomPersonaName] = useState<string>('');
  const [customPersonaTitle, setCustomPersonaTitle] = useState<string>('');
  const [customPersonaDescription, setCustomPersonaDescription] = useState<string>('');
  const [customPersonaGender, setCustomPersonaGender] = useState<string>('male');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const getPersonaDetails = (persona: Persona): PersonaDetails => {
    if (persona === 'custom') {
      return {
        name: customPersonaName || personaData.custom.name,
        title: customPersonaTitle || personaData.custom.title,
        description: customPersonaDescription || personaData.custom.description,
        imageUrl: personaData.custom.imageUrl,
        color: personaData.custom.color,
        gender: customPersonaGender || personaData.custom.gender,
      };
    }
    return personaData[persona];
  };

  const addTranscriptEntry = (entry: Omit<TranscriptEntry, 'timestamp'>) => {
    setTranscript(prev => [...prev, { ...entry, timestamp: new Date() }]);
  };

  const resetSession = () => {
    setTopic('Explain quantum physics');
    setSelectedPersona('professor');
    setCustomPersonaName('');
    setCustomPersonaTitle('');
    setCustomPersonaDescription('');
    setCustomPersonaGender('male');
    setIsRecording(false);
    setRecordingTime(0);
    setScore(0);
    setFeedback([]);
    setTranscript([]);
  };

  return (
    <SessionContext.Provider
      value={{
        topic,
        setTopic,
        selectedPersona,
        setSelectedPersona,
        customPersonaName,
        setCustomPersonaName,
        customPersonaTitle,
        setCustomPersonaTitle,
        customPersonaDescription,
        setCustomPersonaDescription,
        customPersonaGender,
        setCustomPersonaGender,
        isRecording,
        setIsRecording,
        recordingTime,
        setRecordingTime,
        score,
        setScore,
        feedback,
        setFeedback,
        transcript,
        addTranscriptEntry,
        getPersonaDetails,
        resetSession,
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
