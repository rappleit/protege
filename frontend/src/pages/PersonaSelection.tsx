import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSession } from '@/context/SessionContext';
import Header from '@/components/Header';
import Button from '@/components/Button';
import PersonaCard from '@/components/PersonaCard';
import type { Persona } from '@/context/SessionContext';

const PersonaSelection = () => {
  const navigate = useNavigate();
  const { topic, selectedPersona, setSelectedPersona } = useSession();
  
  // Redirect to home if no topic is set
  if (!topic) {
    return <Navigate to="/" replace />;
  }
  
  const handlePersonaSelect = (persona: Persona) => {
    setSelectedPersona(persona);
  };
  
  const handleContinue = () => {
    if (selectedPersona) {
      navigate('/live-session');
    }
  };
  
  const personas: Persona[] = ['child', 'professor', 'historical'];
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Header showTopic />
      
      <main className="flex-1 flex flex-col items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-4xl"
        >
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-3">Choose Your Persona</h1>
            <p className="text-gray-300">
              Select who you'd like to explain your topic to. Different personas will ask different types of questions.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {personas.map((persona, index) => (
              <motion.div
                key={persona}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <PersonaCard
                  persona={persona}
                  isSelected={selectedPersona === persona}
                  onClick={() => handlePersonaSelect(persona)}
                />
              </motion.div>
            ))}
          </div>
          
          <div className="flex justify-center">
            <Button
              onClick={handleContinue}
              disabled={!selectedPersona}
              gradient
              size="lg"
            >
              Start Session
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default PersonaSelection;
