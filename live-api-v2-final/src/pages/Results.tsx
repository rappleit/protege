import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSession } from "../contexts/SessionContext";
import Header from "../components/Header";
import Button from "../components/Button";
import { Progress } from "../components/ui/progress";

const Results = () => {
  const navigate = useNavigate();
  const {
    topic,
    selectedPersona,
    score,
    feedback,
    resetSession,
    getPersonaDetails,
  } = useSession();

  // Redirect if essential data is missing
  if (!topic || !selectedPersona || !feedback.length) {
    return <Navigate to="/" replace />;
  }

  const personaDetails = getPersonaDetails(selectedPersona);

  const handleTryAgain = () => {
    navigate("/persona-selection");
  };

  const handleNewTopic = () => {
    resetSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-scholarly-charcoal  bg-gradient-to-b from-scholarly-charcoal to-scholarly-navy/90">
      <Header showTopic />

      <main className="flex-1 flex flex-col items-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-3xl"
        >
          <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3 font-outfit text-white">Your Results</h1>

          <p className="text-muted-foreground text-scholarly-parchment">
              Here's how well you explained "{topic}" to {personaDetails.name}.
            </p>
          </div>

          <div className="bg-card shadow-md rounded-xl p-8 mb-8 bg-scholarly-navy text-scholarly-cream">
            <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center mb-8">
              <div className="text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white ${personaDetails.color} mx-auto`}>

                  <div className="text-2xl font-bold text-scholarly-gold">
                    {personaDetails.name.charAt(0)}
                  </div>
                </div>
                <h3 className="mt-2 font-medium font-medieval">
                  {personaDetails.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {personaDetails.title}
                </p>
              </div>

              <div className="flex-1">
                <div className="flex items-end justify-between mb-2">
                  <h3 className="font-bold text-lg font-medieval">
                    Understanding Score
                  </h3>
                  <span className="text-3xl font-bold">{score}%</span>
                </div>
                <Progress value={score} className="h-3" />
                <p className="mt-3 text-sm text-muted-foreground">
                  This score represents how well {personaDetails.name}{" "}
                  understood your explanation.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 fancy-border inline-block font-medieval">
                Personalized Feedback
              </h3>
              <div className="space-y-3">
                {feedback.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="bg-muted/40 p-4 rounded-lg"
                  >
                    <p>{item}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleTryAgain} variant="outline" size="lg">
              Try Again (Same Topic)
            </Button>
            <Button onClick={handleNewTopic} gradient size="lg">
              New Topic
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Results;
