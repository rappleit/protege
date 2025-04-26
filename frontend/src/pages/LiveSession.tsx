import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSession } from '@/context/SessionContext';
import Header from '@/components/Header';
import RecordingControls from '@/components/RecordingControls';
import WhiteboardTool from '@/components/WhiteboardTool';
import PersonaSection from '@/components/live-session/PersonaSection';
import ProgressSection from '@/components/live-session/ProgressSection';
import TranscriptSection from '@/components/live-session/TranscriptSection';
import { getInitialMessage, getFollowUpQuestion } from '@/utils/messageUtils';
import { generateFeedback } from '@/utils/feedbackUtils';
import { toast } from 'sonner';

const LiveSession = () => {
  const navigate = useNavigate();
  const { topic, selectedPersona, setScore, setFeedback } = useSession();
  const [messages, setMessages] = useState<string[]>([]);
  const [isPersonaThinking, setIsPersonaThinking] = useState(false);
  const [userMessages, setUserMessages] = useState<{text: string; sender: 'user' | 'persona'}[]>([]);
  const [audioData, setAudioData] = useState<Blob | null>(null);
  const whiteboardRef = useRef<HTMLCanvasElement | null>(null);
  
  if (!topic || !selectedPersona) {
    return <Navigate to="/" replace />;
  }
  
  useEffect(() => {
    const initialMessage = getInitialMessage(selectedPersona);
    setMessages([initialMessage]);
    setUserMessages([{ text: initialMessage, sender: 'persona' }]);
    
    const questionTimer = setTimeout(() => {
      setIsPersonaThinking(true);
      
      setTimeout(() => {
        const followUpQuestion = getFollowUpQuestion(selectedPersona, topic);
        setMessages(prev => [...prev, followUpQuestion]);
        setUserMessages(prev => [...prev, { text: followUpQuestion, sender: 'persona' }]);
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
  
  const handleSendAllData = async (audioBlob?: Blob) => {
    try {
      // Save audio data if provided
      if (audioBlob) {
        setAudioData(audioBlob);
      }
      
      // 1. Get the whiteboard image if available
      let whiteboardImage = null;
      const whiteboardCanvas = document.querySelector('.whiteboard-container canvas') as HTMLCanvasElement;
      if (whiteboardCanvas) {
        whiteboardImage = whiteboardCanvas.toDataURL('image/png');
      }
      
      // 2. Prepare the data object
      const sessionData = {
        topic,
        persona: selectedPersona,
        messages: userMessages,
        whiteboard: whiteboardImage,
        audio: audioBlob || audioData, // Use either the new blob or previously saved blob
        timestamp: new Date().toISOString()
      };
      
      // 3. Send the data to the backend (simulate for now)
      console.log('Sending session data to backend:', sessionData);
      
      // 4. For debugging - create download links for audio and whiteboard
      if (process.env.NODE_ENV === 'development') {
        if (sessionData.audio) {
          const audioUrl = URL.createObjectURL(sessionData.audio as Blob);
          console.log('Audio URL for testing:', audioUrl);
          
          // Optional: Create a download link for testing
          const link = document.createElement('a');
          link.href = audioUrl;
          link.download = 'recording.webm';
          link.style.display = 'none';
          document.body.appendChild(link);
          // Uncomment this to trigger automatic download: link.click();
          setTimeout(() => {
            URL.revokeObjectURL(audioUrl);
            document.body.removeChild(link);
          }, 100);
        }
      }
      
      // 5. Mock API call - replace with actual API endpoint in production
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Session data successfully sent to the backend!');
      
      return true;
    } catch (error) {
      console.error('Error sending session data:', error);
      toast.error('Failed to send session data to the backend.');
      return false;
    }
  };
  
  const handleMessageUpdate = (messages: {text: string; sender: 'user' | 'persona'}[]) => {
    setUserMessages(messages);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <Header showTopic />
      
      <main className="flex-1 flex flex-col p-4 md:p-6 relative">
        <div className="flex-1 flex flex-col md:flex-row gap-4">
          <div className="flex flex-col gap-4 w-full md:w-1/4">
            <PersonaSection />
            <ProgressSection />
          </div>
          
          <div className="w-full md:w-1/4">
            <TranscriptSection messages={userMessages} />
          </div>
          
          <div className="w-full md:w-2/4 flex flex-col gap-4">
            <div className=" rounded-xl shadow-md p-4 flex-1 bg-gray-800">
              <h2 className="text-xl font-bold mb-4 text-scholarly-gold">Whiteboard</h2>
              <div className="h-[450px] ">
                <WhiteboardTool 
                  ref={whiteboardRef}
                  isPopup={false}
                  className="bg-white rounded-lg"
                />
              </div>
            </div>
            
            <div className="flex justify-center">
              <RecordingControls 
                onSessionEnd={handleSessionEnd}
                onSendData={handleSendAllData}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveSession;
