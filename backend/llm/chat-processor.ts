import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Use the specified experimental model
const API_KEY = process.env.GEMINI_API_KEY;

/**
 * Generates a short answer to a user's input using the specified Gemini model.
 *
 * @param userInput The text input from the user.
 * @returns A promise that resolves to a short string answer.
 * @throws Throws an error if the API key is missing or if the API call fails.
 */
export async function getShortAnswerGemini(userInput: string): Promise<string> {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set.");
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.7, // Adjust for creativity vs. factuality, lower might be better for short answers
    topK: 1,
    topP: 1,
    maxOutputTokens: 512, // Increase output limit
  };

  // Safety settings - adjust as needed
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  // Construct the prompt instructing the model for a short answer
  const parts = [
    { text: `User question: "${userInput}"` },
    { text: "Provide a very short answer (ideally one sentence or less)." },
  ];

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
      safetySettings,
    });

    // Check for blocked content or missing response
    if (
      !result.response ||
      !result.response.candidates ||
      result.response.candidates.length === 0
    ) {
      // Attempt to access promptFeedback if available for block reason
      const blockReason = result.response?.promptFeedback?.blockReason;
      const safetyRatings = result.response?.promptFeedback?.safetyRatings;
      console.error("Gemini response blocked or empty.", {
        blockReason,
        safetyRatings,
      });
      throw new Error(
        `Gemini response was blocked or empty. Reason: ${
          blockReason || "Unknown"
        }`
      );
    }

    // Check finish reason in the first candidate
    const candidate = result.response.candidates[0];
    if (
      candidate.finishReason &&
      candidate.finishReason !== "STOP" &&
      candidate.finishReason !== "MAX_TOKENS"
    ) {
      console.error(
        `Gemini generation finished unexpectedly. Reason: ${candidate.finishReason}`,
        { safetyRatings: candidate.safetyRatings }
      );
      throw new Error(
        `Gemini generation finished unexpectedly: ${candidate.finishReason}`
      );
    }

    // Extract text, ensuring content and parts exist
    const text = candidate.content?.parts?.[0]?.text;

    if (!text) {
      console.error(
        "No text found in Gemini response candidate. Logging candidate content parts:",
        candidate.content?.parts // Log the parts array directly
      );
      console.error("Full candidate object:", { candidate }); // Keep logging the full candidate too
      throw new Error("Failed to extract text from Gemini response.");
    }

    return text.trim();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Re-throw a more specific error or handle as appropriate
    if (error instanceof Error) {
      throw new Error(
        `Failed to get short answer from Gemini: ${error.message}`
      );
    } else {
      throw new Error(
        "An unknown error occurred while contacting the Gemini API."
      );
    }
  }
}
