import dotenv from "dotenv";
dotenv.config(); // Load .env file variables into process.env

import express, { Request, Response } from "express";
// Remove the old import
// import { getShortAnswerGemini } from "./llm/chat-processor";

// Import necessary persona classes and interfaces
import { PersonaInput, PersonaOutput, IPersona } from "./src/personas/persona.interface";
import { KaiPersona } from "./src/personas/kai.persona";
import { ErikPersona } from "./src/personas/erik.persona";
import { callGeminiWithPersona } from "./src/services/gemini.service"; // This function is now used inside the persona classes

// A simple factory to get the persona instance
// In a real app, you might load these dynamically or use dependency injection
const personas: { [key: string]: IPersona } = {
  kai: new KaiPersona(),
  erik: new ErikPersona(),
};

const app = express();
const port = process.env.BACKEND_PORT || 3000; // Use env var for port

app.use(express.json()); // Middleware to parse JSON bodies

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "UP" });
});

// Updated chat endpoint to handle personas
// @ts-ignore - Ignore spurious type error for async Express handler
app.post("/api/chat", async (req: Request, res: Response) => {
  // Expect the full PersonaInput structure in the body
  const { personaId, sessionId, explanation, inputType, imageBase64, timestamp } = req.body as PersonaInput & { personaId: string };

  // Basic validation
  if (!personaId || !sessionId || !explanation || !inputType || !timestamp) {
    return res.status(400).json({ error: "Missing required fields: personaId, sessionId, explanation, inputType, timestamp" });
  }

  const persona = personas[personaId];
  if (!persona) {
    return res.status(400).json({ error: `Invalid personaId: ${personaId}. Available: ${Object.keys(personas).join(', ')}` });
  }

  try {
    // Create the input object for the persona's interact method
    const personaInput: PersonaInput = {
        sessionId,
        explanation,
        inputType,
        imageBase64, // Will be undefined if not provided
        timestamp
    };

    // Call the persona's interact method, which internally calls the LLM
    const output: PersonaOutput = await persona.interact(personaInput);

    // Return the structured JSON response from the persona
    res.json(output);

  } catch (error) {
    console.error(`Error processing chat request for persona ${personaId}:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error processing chat request";
    res.status(500).json({ error: errorMessage });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
