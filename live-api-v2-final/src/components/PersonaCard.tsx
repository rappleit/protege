import React from "react";
import { motion } from "framer-motion";
import { useSession } from "../contexts/SessionContext";
import { Star, Sword, Book } from "lucide-react";
import { cn } from "../lib/utils";

type PersonaCardProps = {
  persona: "child" | "professor" | "historical";
  isSelected: boolean;
  onClick: () => void;
};

const PersonaCard: React.FC<PersonaCardProps> = ({
  persona,
  isSelected,
  onClick,
}) => {
  const { getPersonaDetails } = useSession();
  const personaDetails = getPersonaDetails(persona);

  const getPersonaIcon = (persona: string) => {
    switch (persona) {
      case "child":
        return Star;
      case "professor":
        return Book;
      case "historical":
        return Sword;
      default:
        return Star;
    }
  };

  const IconComponent = getPersonaIcon(persona);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "rpg-card cursor-pointer transition-all duration-200",
        isSelected && "border-scholarly-gold"
      )}
      onClick={onClick}
    >
      <div className="rpg-gradient" />

      <div className="relative p-6 flex flex-col items-center gap-4">
        <div
          className={cn(
            "rpg-icon-container",
            isSelected
              ? "border-scholarly-gold bg-scholarly-navy/70"
              : "border-scholarly-cream/20 bg-scholarly-navy/50"
          )}
        >
          <IconComponent
            className={cn(
              "rpg-icon",
              isSelected ? "text-scholarly-gold" : "text-scholarly-cream/70"
            )}
          />
        </div>

        <div className="text-center">
          <h3
            className={cn(
              "rpg-title",
              isSelected ? "text-scholarly-gold" : "text-scholarly-cream"
            )}
          >
            {personaDetails.name}
          </h3>
          <p className="rpg-subtitle">{personaDetails.title}</p>
        </div>

        <p className="rpg-text">{personaDetails.description}</p>
      </div>

      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-scholarly-gold/50 via-scholarly-gold to-scholarly-gold/50" />
      )}
    </motion.div>
  );
};

export default PersonaCard;
