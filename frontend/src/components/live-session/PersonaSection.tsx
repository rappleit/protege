import React from 'react';
import { motion } from 'framer-motion';
import { useSession } from '@/context/SessionContext';
import { cn } from '@/lib/utils';


const PersonaSection = () => {
  const { selectedPersona, getPersonaDetails } = useSession();
  const personaDetails = getPersonaDetails(selectedPersona!);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full h-2/3 bg-card rounded-xl shadow-md p-6 flex flex-col bg-gray-800"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white ${personaDetails.color}`}>
          <div className="text-xl font-bold text-scholarly-gold">{personaDetails.name.charAt(0)}</div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-scholarly-gold">{personaDetails.name}</h2>
          <p className="text-sm text-white">{personaDetails.title}</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-muted/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
        
        </div>
      </div>
    </motion.div>
  );
};

export default PersonaSection;
