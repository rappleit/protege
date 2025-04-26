
import React from 'react';
import { motion } from 'framer-motion';
import { useSession } from '@/context/SessionContext';
import { MessageSquare } from 'lucide-react';
import Button from '@/components/Button';

type RecordingSectionProps = {
  showWhiteboard: boolean;
  onToggleWhiteboard: () => void;
};

const RecordingSection: React.FC<RecordingSectionProps> = ({ 
  showWhiteboard, 
  onToggleWhiteboard 
}) => {
  const { topic, selectedPersona, getPersonaDetails } = useSession();
  const personaDetails = getPersonaDetails(selectedPersona!);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="w-full md:w-2/3 bg-card rounded-xl shadow-md p-6 flex flex-col"
    >
      <div className="mb-6">
        <h2 className="text-xl font-bold">Your Teaching Session</h2>
        <p className="text-sm text-muted-foreground">
          Explain "{topic}" to {personaDetails.name} as clearly as possible. 
          Remember, the best way to test your understanding is to teach it to someone else!
        </p>
      </div>
      
      <div className="flex-1 flex items-center justify-center mb-6">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare size={48} className="text-muted-foreground" />
          </div>
          <p className="text-lg font-medium">Start speaking to begin your explanation</p>
          <p className="text-sm text-muted-foreground mt-2">
            {personaDetails.name} will listen and ask follow-up questions to test your understanding
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-4">
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
