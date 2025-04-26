import dotenv from "dotenv";
dotenv.config(); // Load .env file variables into process.env

import express, { Request, Response } from "express";
import { getShortAnswerGemini } from "./llm/chat-processor"; // Import the function

// Define interface for request body
interface ChatRequestBody {
  message: string;
}

const app = express();
const port = 3000;

app.use(express.json()); // Middleware to parse JSON bodies

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "UP" });
});

// New endpoint for chat
// Explicitly type the request body using the interface
// @ts-ignore - Ignore spurious type error for async Express handler
app.post("/api/chat", async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const answer = await getShortAnswerGemini(message);
    res.json({ answer });
  } catch (error) {
    console.error("Error processing chat request:", error);
    // Send a generic error message to the client
    // Check if the error is an instance of Error to access the message property safely
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ error: errorMessage });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
