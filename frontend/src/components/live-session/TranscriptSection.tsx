import React from 'react';
import { motion } from 'framer-motion';

type Message = {
  text: string;
  sender: 'user' | 'persona';
};

type TranscriptSectionProps = {
  messages: Message[];
};

const TranscriptSection: React.FC<TranscriptSectionProps> = ({ messages }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-card rounded-xl shadow-md p-4 flex flex-col h-full bg-gray-800"
    >
      <h3 className="text-lg font-medium mb-3 text-scholarly-gold">Transcript</h3>
      
      <div className="flex-1 overflow-y-auto bg-muted/30 rounded-lg p-4 min-h-[500px]">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 h-full flex items-center justify-center">
            <p>No messages yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg ${
                  message.sender === 'user' 
                    ? "bg-primary text-primary-foreground ml-auto" 
                    : "bg-muted"
                } max-w-[90%] ${message.sender === 'user' ? "ml-auto" : "mr-auto"}`}
              >
                <p className="text-xs text-gray-400 mb-1">{message.sender === 'user' ? 'You' : 'Persona'}</p>
                {message.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TranscriptSection; 