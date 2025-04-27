import React from "react";
import { motion } from "framer-motion";
import { useSession } from "../../contexts/SessionContext";
import { cn } from "../../lib/utils";

const PersonaSection = () => {
  const { selectedPersona, getPersonaDetails } = useSession();
  const personaDetails = getPersonaDetails(selectedPersona!);

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
          {selectedPersona?.toLowerCase() === 'child' && (
            <div className="w-full h-full flex justify-center items-center">
              <video 
                autoPlay 
                muted 
                loop 
                className="rounded-lg object-contain w-full h-full"
              >
                <source src='/assets/chloe/idle_chloe.mp4' type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          {selectedPersona?.toLowerCase() === 'historical' && (
            <div className="w-full h-full flex justify-center items-center">
              <video 
                autoPlay 
                muted 
                loop 
                className="rounded-lg object-contain w-full h-full"
              >
                <source src="/assets/washington/idle_washington.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          {selectedPersona?.toLowerCase() === 'professor' && (
            <div className="w-full h-full flex justify-center items-center">
              <video 
                autoPlay 
                muted 
                loop 
                className="rounded-lg object-contain w-full h-full"
              >
                <source src="/assets/max/idle_max.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
      </div>      
    </motion.div>
  );
};

export default PersonaSection;
