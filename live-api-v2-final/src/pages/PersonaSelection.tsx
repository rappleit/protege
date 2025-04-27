import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSession, personaData } from "../contexts/SessionContext";
import Header from "../components/Header";
import Button from "../components/Button";
import PersonaCard from "../components/PersonaCard";
import type { Persona } from "../contexts/SessionContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

const PersonaSelection = () => {
  const navigate = useNavigate();
  const {
    topic,
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
  } = useSession();

  if (!topic) {
    return <Navigate to="/" replace />;
  }

  const handlePersonaSelect = (persona: Persona) => {
    setSelectedPersona(persona);
  };

  const handleContinue = () => {
    if (selectedPersona) {
      navigate("/live-session");
    }
  };

  const personas: Persona[] = ["child", "professor", "custom", "washington"];

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
              Select who you'd like to explain your topic to. Different personas
              will ask different types of questions.
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

          {selectedPersona === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="bg-gray-800 p-6 rounded-lg mb-12 border border-protege-historical/50 shadow-lg"
            >
              <h2 className="text-xl font-semibold mb-6 text-center text-protege-historical">Define Your Custom Persona</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-name" className="block text-sm font-medium text-gray-300 mb-1">Name</Label>
                  <Input
                    id="custom-name"
                    value={customPersonaName === personaData.custom.name ? '' : customPersonaName}
                    onChange={(e) => setCustomPersonaName(e.target.value)}
                    placeholder={personaData.custom.name}
                    style={{ color: 'white' }}
                    className="bg-gray-700 border-gray-600 text-black dark:text-black placeholder:text-gray-500 w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="custom-title" className="block text-sm font-medium text-gray-300 mb-1">Title</Label>
                  <Input
                    id="custom-title"
                    value={customPersonaTitle === personaData.custom.title ? '' : customPersonaTitle}
                    onChange={(e) => setCustomPersonaTitle(e.target.value)}
                    placeholder={personaData.custom.title}
                    style={{ color: 'white' }}
                    className="bg-gray-700 border-gray-600 text-black dark:text-black placeholder:text-gray-500 w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="custom-description" className="block text-sm font-medium text-gray-300 mb-1">Description/Backstory</Label>
                  <Textarea
                    id="custom-description"
                    value={customPersonaDescription === personaData.custom.description ? '' : customPersonaDescription}
                    onChange={(e) => setCustomPersonaDescription(e.target.value)}
                    placeholder={personaData.custom.description}
                    style={{ color: 'white' }}
                    className="bg-gray-700 border-gray-600 text-black dark:text-black placeholder:text-gray-500 w-full h-24"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="custom-gender" className="block text-sm font-medium text-gray-300 mb-1">Gender (for voice)</Label>
                  <Select value={customPersonaGender} onValueChange={setCustomPersonaGender}>
                    <SelectTrigger
                      id="custom-gender"
                      className="bg-gray-700 border-gray-600 text-black dark:text-black placeholder:text-gray-500 w-full md:w-1/2"
                    >
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 text-white border-gray-600">
                      <SelectItem value="female" className="hover:bg-gray-600 focus:bg-gray-600 text-black dark:text-black focus:text-white dark:focus:text-white">Female</SelectItem>
                      <SelectItem value="male" className="hover:bg-gray-600 focus:bg-gray-600 text-black dark:text-black focus:text-white dark:focus:text-white">Male</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-4">These details will shape the persona's interactions and voice.</p>
            </motion.div>
          )}

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
