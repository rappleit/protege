import React from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../contexts/SessionContext";
import { cn } from "../lib/utils";

type HeaderProps = {
  showLogo?: boolean;
  showTopic?: boolean;
  className?: string;
};

const Header: React.FC<HeaderProps> = ({
  showLogo = true,
  showTopic = false,
  className,
}) => {
  const navigate = useNavigate();
  const { topic, resetSession } = useSession();

  const handleLogoClick = () => {
    if (
      window.confirm(
        "Are you sure you want to return to the home page? Your current session will be lost."
      )
    ) {
      resetSession();
      navigate("/");
    }
  };

  return (
    <header
      className={cn(
        "w-full py-4 px-6 flex items-center justify-between bg-scholarly-navy",
        className
      )}
    >
      {showLogo && (
        <div
          className="flex items-center cursor-pointer group"
          onClick={handleLogoClick}
        >
          <h1 className="text-2xl font-bold text-scholarly-gold group-hover:opacity-90 transition-opacity">
            Protege<span className="text-scholarly-burgundy">.</span>
          </h1>
        </div>
      )}

      {showTopic && topic && (
        <div className="bg-gray-800 px-4 py-2 rounded-full">
          <p className="text-sm font-medium text-gray-200">
            Topic: <span className="text-scholarly-gold">{topic}</span>
          </p>
        </div>
      )}
    </header>
  );
};

export default Header;
