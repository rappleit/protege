import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerateContentRequest,
  GenerationConfig,
  SafetySetting,
} from "@google/generative-ai";
import { PersonaInput, PersonaOutput, PersonaScore } from "../personas/persona.interface"; // Adjusted path

const MODEL_NAME = "gemini-2.5-pro-exp-03-25";
const API_KEY = process.env.GEMINI_API_KEY;

// Define the expected JSON structure for the LLM response
const jsonOutputSchema = `
\`\`\`json
{
  "reaction": "string", // Your textual emotional response as the persona.
  "currentEmotionState": "string", // Your primary emotion: e.g., "excited", "confused", "bored", "neutral", "annoyed". Base this on your reaction.
  "followUpQuestion": "string", // Your follow-up question as the persona.
  "score": {
    "clarity": number, // 0-100 score based on simplicity and understandability for your persona.
    "engagement": number, // 0-100 score based on how interesting and relevant the explanation was for your persona.
    "accuracy": number, // 0-100 score based on the factual correctness (your best guess).
    "structure": number, // 0-100 score based on the organization and conciseness, according to your persona's preference.
    "overall": number // 0-100 weighted average, considering your persona's priorities.
  },
  "badgesUnlocked": [] // Leave empty for now: [].
}
\`\`\`
`;

/**
 * Calls the Gemini model with a specific persona system prompt and user input,
 * expecting a structured JSON response.
 *
 * @param systemPrompt The persona-specific instructions for the LLM.
 * @param userInput The user's input details.
 * @returns A promise that resolves to the PersonaOutput object.
 * @throws Throws an error if the API key is missing, the API call fails, or JSON parsing fails.
 */
export async function callGeminiWithPersona(
  systemPrompt: string,
  userInput: PersonaInput
): Promise<PersonaOutput> {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set.");
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig: GenerationConfig = {
    temperature: 0.7, // Keep some creativity
    topK: 1,
    topP: 1,
    maxOutputTokens: 1024, // Allow more tokens for JSON structure and response
    responseMimeType: "application/json", // Request JSON output directly
  };

  const safetySettings: SafetySetting[] = [
    // Standard safety settings
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  // Construct the detailed prompt
  // TODO: Incorporate imageBase64 if present (requires multimodal model capabilities)
  const parts = [
    { text: systemPrompt }, // Persona instructions first
    { text: `--- User Explanation (Input Type: ${userInput.inputType}) ---` },
    { text: userInput.explanation },
    { text: "--- Task ---" },
    { text: `Based on the user's explanation and your persona, evaluate the teaching and provide your response ONLY in the following JSON format. Ensure your response is valid JSON matching this structure exactly:\n${jsonOutputSchema}` },
  ];

  const request: GenerateContentRequest = {
      contents: [{ role: "user", parts }],
      generationConfig,
      safetySettings,
  };

  try {
    console.log("Sending request to Gemini:", JSON.stringify(request, null, 2)); // Log the request for debugging
    const result = await model.generateContent(request);

    // Check for blocked content or missing response
    if (
      !result.response ||
      !result.response.candidates ||
      result.response.candidates.length === 0
    ) {
      const blockReason = result.response?.promptFeedback?.blockReason;
      console.error("Gemini response blocked or empty.", { blockReason });
      throw new Error(`Gemini response was blocked or empty. Reason: ${blockReason || "Unknown"}`);
    }

    const candidate = result.response.candidates[0];

    // Check finish reason
     if (
      candidate.finishReason &&
      candidate.finishReason !== "STOP" &&
      candidate.finishReason !== "MAX_TOKENS"
    ) {
      // Log safety ratings if available and finish reason is abnormal
      console.error(`Gemini generation finished unexpectedly. Reason: ${candidate.finishReason}`, { safetyRatings: candidate.safetyRatings });
      throw new Error(`Gemini generation finished unexpectedly: ${candidate.finishReason}`);
    }


    // Extract and parse the JSON text
    const jsonText = candidate.content?.parts?.[0]?.text;
    if (!jsonText) {
       console.error("No text found in Gemini response candidate parts:", candidate.content?.parts);
       console.error("Full candidate:", candidate);
      throw new Error("No text found in Gemini response candidate.");
    }

    console.log("Raw Gemini Response Text:", jsonText); // Log the raw text for debugging

    try {
      // Attempt to parse the JSON string
      const parsedOutput: PersonaOutput = JSON.parse(jsonText);

      // Basic validation (can be expanded)
      if (!parsedOutput.reaction || !parsedOutput.followUpQuestion || !parsedOutput.score || !parsedOutput.currentEmotionState) {
         console.error("Parsed JSON is missing required fields:", parsedOutput);
        throw new Error("Parsed JSON response is missing required fields.");
      }
      // Add more specific score validation if needed
      if (typeof parsedOutput.score.clarity !== 'number' /* ... etc */) {
         console.error("Parsed JSON score field has incorrect type:", parsedOutput.score);
         throw new Error("Parsed JSON score field has incorrect type.");
      }


      return parsedOutput;
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError);
      console.error("Invalid JSON string received:", jsonText); // Log the problematic string
      throw new Error(`Failed to parse Gemini response as JSON: ${parseError instanceof Error ? parseError.message : parseError}`);
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to get response from Gemini: ${error.message}`);
    } else {
      throw new Error("An unknown error occurred while contacting the Gemini API.");
    }
  }
}
