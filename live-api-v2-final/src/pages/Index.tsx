import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { motion } from "framer-motion";
import { useSession } from "../contexts/SessionContext";
import { Input } from "../components/ui/input";

const Index = () => {
  const navigate = useNavigate();
  const { setTopic } = useSession();
  const [inputTopic, setInputTopic] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputTopic.trim()) {
      setError("Please enter a topic");
      return;
    }

    setTopic(inputTopic.trim());
    navigate("/persona-selection");
  };

  return (
    <div className="min-h-screen flex flex-col bg-scholarly-charcoal text-scholarly-cream bg-gradient-to-b from-scholarly-charcoal to-scholarly-navy/90">
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-scholarly-cream">
            Protege<span className="text-scholarly-gold">.</span>
          </h1>
          <p className="text-xl font-light mb-8 text-scholarly-parchment">
            Learn better by teaching others
          </p>

          <div className="bg-scholarly-navy/80 shadow-lg rounded-xl p-8 border border-scholarly-gold/30">
            <h2 className="text-2xl font-semibold mb-6 inline-block text-scholarly-cream border-b-2 border-scholarly-gold pb-2">
              Start Your Session
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="topic"
                  className="text-sm font-medium text-scholarly-parchment"
                >
                  What topic would you like to teach?
                </label>
                <Input
                  id="topic"
                  value={inputTopic}
                  onChange={(e) => {
                    setInputTopic(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="e.g., Photosynthesis, The Water Cycle, etc."
                  className="w-full bg-scholarly-charcoal/50 border-scholarly-gold/40 text-scholarly-cream placeholder:text-scholarly-parchment/50 focus:border-scholarly-gold focus:ring-scholarly-gold/30"
                />
                {error && (
                  <p className="text-sm text-scholarly-burgundy">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                gradient
                fullWidth
                className="bg-gradient-to-r from-scholarly-gold to-scholarly-russet hover:from-scholarly-russet hover:to-scholarly-gold text-scholarly-navy font-medium"
              >
                Continue
              </Button>
            </form>
          </div>

          <p className="mt-8 text-sm text-scholarly-parchment/80">
            Explain any topic to one of our curious personas <br /> and improve
            your understanding through teaching.
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
