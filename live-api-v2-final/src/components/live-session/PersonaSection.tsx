import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "../../contexts/SessionContext";
import { cn } from "../../lib/utils";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

const PersonaSection = () => {
  const { selectedPersona, getPersonaDetails } = useSession();
  const personaDetails = getPersonaDetails(selectedPersona!);
  const { isModelTurn } = useLiveAPIContext();
  
  useEffect(() => {
    console.log("isModelTurn:", isModelTurn);
  }, [isModelTurn]);

  // Helper function to get the correct video source based on persona and model turn
  const getVideoSource = (persona: string) => {
    const personaLower = persona.toLowerCase();
    
    if (personaLower === 'child') {
      return isModelTurn ? '/assets/chloe/talking_chloe.mp4' : '/assets/chloe/idle_chloe.mp4';
    } else if (personaLower === 'custom') {
      return isModelTurn ? '/assets/faceless/talking_faceless.mp4' : '/assets/faceless/idle_faceless.mp4';
    } else if (personaLower === 'professor') {
      return isModelTurn ? '/assets/max/talking_max.mp4' : '/assets/max/idle_max.mp4';
    } else if (personaLower === 'washington') {
      return isModelTurn ? '/assets/washington/talking_washington.mp4' : '/assets/washington/idle_washington.mp4';
    } 
    
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full h-2/3 bg-card rounded-xl shadow-md p-6 flex flex-col bg-scholarly-navy"
    >
      <div className="flex items-center gap-4 mb-6">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white ${personaDetails.color}`}
        >
          <div className="text-xl font-bold text-scholarly-gold">
            {personaDetails.name.charAt(0)}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-scholarly-gold">
            {personaDetails.name}
          </h2>
          <p className="text-sm text-scholarly-parchment">
            {personaDetails.title}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-scholarly-charcoal/50 border-scholarly-gold/40">
        {selectedPersona && (
          <div className="w-full h-full flex justify-center items-center">
            <video 
              key={`${selectedPersona}-${isModelTurn}`} // Add key to force re-render when source changes
              autoPlay 
              muted 
              loop 
              className="rounded-lg object-contain w-full h-full"
            >
              <source src={getVideoSource(selectedPersona)} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>      
    </motion.div>
  );
};

export default PersonaSection;
