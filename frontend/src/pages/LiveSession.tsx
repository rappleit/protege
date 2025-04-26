
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSession } from '@/context/SessionContext';
import Header from '@/components/Header';
import RecordingControls from '@/components/RecordingControls';
import WhiteboardTool from '@/components/WhiteboardTool';
import PersonaSection from '@/components/live-session/PersonaSection';
import RecordingSection from '@/components/live-session/RecordingSection';
import { getInitialMessage, getFollowUpQuestion } from '@/utils/messageUtils';
import { generateFeedback } from '@/utils/feedbackUtils';

const LiveSession = () => {
  const navigate = useNavigate();
  const { topic, selectedPersona, setScore, setFeedback } = useSession();
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [isPersonaThinking, setIsPersonaThinking] = useState(false);
  
  if (!topic || !selectedPersona) {
    return <Navigate to="/" replace />;
  }
  
  useEffect(() => {
    const initialMessage = getInitialMessage(selectedPersona);
    setMessages([initialMessage]);
    
    const questionTimer = setTimeout(() => {
      setIsPersonaThinking(true);
      
      setTimeout(() => {
        const followUpQuestion = getFollowUpQuestion(selectedPersona, topic);
        setMessages(prev => [...prev, followUpQuestion]);
        setIsPersonaThinking(false);
      }, 8000);
    }, 20000);
    
    return () => {
      clearTimeout(questionTimer);
    };
  }, [selectedPersona, topic]);
  
  const handleSessionEnd = () => {
    const generatedScore = Math.floor(Math.random() * 31) + 65;
    setScore(generatedScore);
    const generatedFeedback = generateFeedback(selectedPersona, generatedScore);
    setFeedback(generatedFeedback);
    navigate('/results');
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header showTopic />
      
      <main className="flex-1 flex flex-col p-4 md:p-6 relative">
        <div className="flex-1 flex flex-col md:flex-row gap-6">
          <PersonaSection />
          <RecordingSection 
            showWhiteboard={showWhiteboard}
            onToggleWhiteboard={() => setShowWhiteboard(!showWhiteboard)}
          />
        </div>
        
        <WhiteboardTool isOpen={showWhiteboard} onClose={() => setShowWhiteboard(false)} />
        
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2">
          <RecordingControls onSessionEnd={handleSessionEnd} />
        </div>
      </main>
    </div>
  );
};

export default LiveSession;
