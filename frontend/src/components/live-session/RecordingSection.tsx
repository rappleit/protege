import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from '@/context/SessionContext';
import { MessageSquare, Mic, Send } from 'lucide-react';
import Button from '@/components/Button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Message = {
  text: string;
  sender: 'user' | 'persona';
};

type RecordingSectionProps = {
  showWhiteboard: boolean;
  onToggleWhiteboard: () => void;
  messages?: Message[];
  onMessagesUpdate?: (messages: Message[]) => void;
};

const RecordingSection: React.FC<RecordingSectionProps> = ({ 
  showWhiteboard, 
  onToggleWhiteboard,
  messages: externalMessages,
  onMessagesUpdate
}) => {
  const { topic, selectedPersona, getPersonaDetails, isRecording } = useSession();
  const personaDetails = getPersonaDetails(selectedPersona!);
  const [textInput, setTextInput] = useState('');
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  
  // Use either external messages (if provided) or internal state
  const messages = externalMessages || internalMessages;
  
  // Update the parent component when messages change, if callback provided
  useEffect(() => {
    if (!externalMessages && onMessagesUpdate) {
      onMessagesUpdate(internalMessages);
    }
  }, [internalMessages, externalMessages, onMessagesUpdate]);

  const handleSendMessage = () => {
    if (textInput.trim()) {
      const newMessage = { text: textInput, sender: 'user' as const };
      
      if (externalMessages && onMessagesUpdate) {
        // If we're using external state management
        onMessagesUpdate([...externalMessages, newMessage]);
      } else {
        // If we're using internal state management
        setInternalMessages([...internalMessages, newMessage]);
      }
      
      setTextInput('');
      
      // Simulate persona response after a short delay
      setTimeout(() => {
        const responseMessage = { 
          text: `That's interesting! Can you tell me more about ${topic}?`, 
          sender: 'persona' as const 
        };
        
        if (externalMessages && onMessagesUpdate) {
          // If we're using external state management
          onMessagesUpdate([...externalMessages, newMessage, responseMessage]);
        } else {
          // If we're using internal state management
          setInternalMessages(prev => [...prev, responseMessage]);
        }
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="w-full md:w-2/3 bg-card rounded-xl shadow-md p-6 flex flex-col h-[550px]"
    >
      <div className="mb-4">
        <h2 className="text-xl font-bold">Your Teaching Session</h2>
        <p className="text-sm text-muted-foreground">
          Explain "{topic}" to {personaDetails.name} as clearly as possible. 
          Use voice, text, or the whiteboard to help with your explanation.
        </p>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto mb-4 p-3 bg-muted/40 rounded-lg">
          {messages.length === 0 ? (
            <div className="text-center h-full flex flex-col items-center justify-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare size={30} className="text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">Start your explanation</p>
              <p className="text-sm text-muted-foreground mt-2">
                {personaDetails.name} will respond with follow-up questions
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={index}
                  className={cn(
                    "p-3 rounded-lg max-w-[80%]",
                    message.sender === 'user' 
                      ? "bg-primary text-primary-foreground ml-auto" 
                      : "bg-muted"
                  )}
                >
                  {message.text}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="relative">
          <Textarea
            placeholder="Type your explanation here..."
            className="resize-none pr-12"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            size="sm"
            className="absolute right-2 bottom-2"
            onClick={handleSendMessage}
            disabled={!textInput.trim()}
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isRecording 
              ? "bg-red-500 animate-pulse" 
              : "bg-muted"
          )}>
            <Mic size={18} className={isRecording ? "text-white" : "text-muted-foreground"} />
          </div>
          <div className="text-sm">
            {isRecording 
              ? <span className="text-red-500 font-medium">Recording active</span>
              : <span className="text-muted-foreground">Mic inactive</span>
            }
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={onToggleWhiteboard}
        >
          {showWhiteboard ? 'Hide Whiteboard' : 'Show Whiteboard'}
        </Button>
      </div>
    </motion.div>
  );
};

export default RecordingSection;
