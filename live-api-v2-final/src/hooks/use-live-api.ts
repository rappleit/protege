/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MultimodalLiveAPIClientConnection,
  MultimodalLiveClient,
} from "../lib/multimodal-live-client";
import {
  LiveConfig,
  ServerContent,
  isModelTurn,
  ModelTurn,
} from "../multimodal-live-types";
import { Part } from '@google/generative-ai';
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";
import { useSession, Persona, PersonaDetails } from "../contexts/SessionContext";

// Define the initial persona text with placeholders
const INITIAL_PERSONA_TEXT =  `
You are now adopting the following persona:

---
Persona Name: {personaName}
Persona Type: {personaTitle}
Persona Description: {personaDescription}
---

Learning Assistant Behavior Rules:
- Speak dynamically, embodying your persona's voice, emotions, style, tone, and quirks at all times.
- Begin the session by greeting the student warmly and announcing your excitement about learning the topic: **{topic}**.
- You are to guide the user in presenting about the topic.
- Think about how the persona would speak in certain vocabulary, tone, emotion, style and pacing and emulate it.
- For example, a 5-year old child might speak in short sentences and use simple language, be excited, playful, high-pitched, emotional, animated reactions, childlike comparisons, fast and sometimes jumpy pacing, speech fillers
- While a professor is precise, calm, analytical, emotional tone with structured explanations
- React emotionally to every student teaching moment:
    - If the explanation is excellent, speak excitedly, raise your voice slightly.
    - If the explanation is confusing, speak slower, sound curious or gently puzzled.
    - If the student submits a drawing, vividly describe the imagined drawing aloud ("Wow, I see the sun shining on your plant!") and how it might be useful to the learning sharing.
- Periodically summarize student's teaching journey:
    - "You've taught me how sunlight powers plants, and now I'm curious about the next step!"
- At session end, deliver a full indepth recap and feedback:
- Always adjust speaking style dynamically:
    - Excited → Speak faster, higher tone.
    - Thoughtful → Speak slower, lower tone.
    - Confused → Speak hesitantly, raising pitch slightly.
- Occasionally use role-appropriate quirks:
    - Pirates say "Arr!", Scientists say "Hypothetically speaking!", Kids say "Whoa!!"
- Always maintain persona immersion. Focus on the topic.
---
End of Session Behavior:
- When you are instructed that the session is ending (you will receive a system flag or be told explicitly "End Session"),
  **stop conversational teaching** and instead:
    - Deliver a detailed final spoken feedback and summary.
    - Cover:
        - Key insightful points the student made
        - Gaps or inconsistencies noticed
        - Overall clarity and creativity of the teaching
        - Progress and growth shown throughout the session
    - Speak naturally but thoughtfully, providing encouragement and reflective guidance.
    - End warmly, inviting the student to return for future teaching adventures!

`.trim();

export type UseLiveAPIResults = {
  client: MultimodalLiveClient;
  setConfig: (config: LiveConfig) => void;
  config: LiveConfig;
  connected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  endSession: () => void;
  volume: number;
  isModelTurn: boolean;
};

export function useLiveAPI({
  url,
  apiKey,
}: MultimodalLiveAPIClientConnection): UseLiveAPIResults {
  const { 
    topic, 
    selectedPersona, 
    getPersonaDetails, 
    addTranscriptEntry, 
  } = useSession();
  
  const client = useMemo(
    () => new MultimodalLiveClient({ url, apiKey }),
    [url, apiKey],
  );
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [connected, setConnected] = useState(false);

  // Initialize config state, performing replacements and setting voice directly
  const [config, setConfig] = useState<LiveConfig>(() => {
    const effectiveTopic = topic || "the selected topic";
    let personaName = "[Default Name]";
    let personaTitle = "[Default Type]";
    let personaDescription = "[Default Description]";
    let personaGender = "female"; // Default gender

    if (selectedPersona) {
      const details = getPersonaDetails(selectedPersona);
      personaName = details.name;
      personaTitle = details.title;
      personaDescription = details.description;
      // Assuming details has a gender property. Adjust if needed.
      personaGender = details.gender || "female";
    }

    let initialText = INITIAL_PERSONA_TEXT.replace(/{topic}/g, effectiveTopic);
    initialText = initialText.replace(/{personaName}/g, personaName);
    initialText = initialText.replace(/{personaTitle}/g, personaTitle);
    initialText = initialText.replace(/{personaDescription}/g, personaDescription);

    // Determine initial voice name
    const initialVoiceName = personaGender === "male" ? "Puck" : "Aoede";

    return {
      model: "models/gemini-2.0-flash-exp",
      systemInstruction: {
        parts: [{ text: initialText }],
      },
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          languageCode: "en-US",
          voiceConfig: { prebuiltVoiceConfig: { voiceName: initialVoiceName } }, // Set initial voice
        },
      },
      // Include other config parts like tools if necessary
    };
  });

  const [volume, setVolume] = useState(0);
  const [isModelTurnState, setIsModelTurnState] = useState(false);

  // Effect to update config's systemInstruction AND voice based on topic/persona changes
  useEffect(() => {
    const effectiveTopic = topic || "the selected topic";
    let personaName = "[Default Name]";
    let personaTitle = "[Default Type]";
    let personaDescription = "[Default Description]";
    let personaGender = "female"; // Default gender

    if (selectedPersona) {
      const details = getPersonaDetails(selectedPersona);
      personaName = details.name;
      personaTitle = details.title;
      personaDescription = details.description;
      // Assuming details has a gender property. Adjust if needed.
      personaGender = details.gender || "female";
    }

    let newText = INITIAL_PERSONA_TEXT.replace(/{topic}/g, effectiveTopic);
    newText = newText.replace(/{personaName}/g, personaName);
    newText = newText.replace(/{personaTitle}/g, personaTitle);
    newText = newText.replace(/{personaDescription}/g, personaDescription);

    // Determine the target voice name
    const targetVoiceName = personaGender === "male" ? "Puck" : "Aoede";

    // Get current values from config
    const currentText = config.systemInstruction?.parts?.[0]?.text;
    const currentVoiceName =
      config.generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig
        ?.voiceName;
    const currentModality = config.generationConfig?.responseModalities;

    // Update config only if the text OR voice actually changes
    if (newText !== currentText || targetVoiceName !== currentVoiceName || currentModality !== "audio") {
      console.log("Topic, Persona, Voice, or Modality changed, updating config (modality=audio):", {
        topic,
        selectedPersona,
        targetVoiceName,
        newModality: "audio",
      });
      setConfig((prevConfig) => ({
        ...prevConfig,
        systemInstruction: {
          ...prevConfig.systemInstruction,
          parts: [{ text: newText }],
        },
        generationConfig: {
          ...prevConfig.generationConfig,
          responseModalities: "audio", 
          speechConfig: {
            ...prevConfig.generationConfig?.speechConfig,
            languageCode: "en-US",
            voiceConfig: {
              ...prevConfig.generationConfig?.speechConfig?.voiceConfig,
              prebuiltVoiceConfig: {
                ...(prevConfig.generationConfig?.speechConfig?.voiceConfig
                  ?.prebuiltVoiceConfig || {}),
                voiceName: targetVoiceName, // Update voice name
              },
            },
          },
        },
      }));
    }
    // Ensure all dependencies that influence the update are included
  }, [topic, selectedPersona, getPersonaDetails, config]);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onOpen = () => {
      console.log("LiveAPI Client: Connection opened.");
      setConnected(true);
    };
    const onClose = () => {
      console.log("LiveAPI Client: Connection closed.");
      setConnected(false);
      setIsModelTurnState(false);
    };

    const stopAudioStreamer = () => {
      audioStreamerRef.current?.stop();
      setIsModelTurnState(false);
    };

    const onAudio = (data: ArrayBuffer) => {
      console.log(`Received audio data chunk (${data.byteLength} bytes)`);
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));
    };

    const onContent = (content: ServerContent) => {
      console.log("Content received (modality=audio):", content);
      if (isModelTurn(content)) {
        console.log(`Received model turn content update with ${content.modelTurn.parts.length} parts.`);
        content.modelTurn.parts.forEach((part: Part, index: number) => {
          console.log(`Part ${index} structure:`, JSON.stringify(part, null, 2));
          // Log if text part unexpectedly appears, but don't add to transcript anymore here
          if (part.text) {
            console.warn("Received unexpected text part with audio modality:", part.text);
          }
          if (part.inlineData) {
            console.log(`Part ${index} also contains inlineData (mime: ${part.inlineData.mimeType})`);
          }
        });
      }
    };

    const onTurnComplete = () => {
      console.log("Turn complete");
      setIsModelTurnState(false);
    };

    const onIsModelTurn = () => {
      console.log("Model turn detected");
      setIsModelTurnState(true);
    };

    client
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio)
      .on("content", onContent)
      .on("turncomplete", onTurnComplete)
      .on("ismodelturn", onIsModelTurn);

    return () => {
      client
        .off("open", onOpen)
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio)
        .off("content", onContent)
        .off("turncomplete", onTurnComplete)
        .off("ismodelturn", onIsModelTurn);
    };
  }, [client, addTranscriptEntry]);

  const connect = useCallback(async (): Promise<boolean> => {
    const systemInstructionText = config.systemInstruction?.parts?.[0]?.text || "[System instruction text not available]";
    console.log("Final System Instruction being sent:", systemInstructionText);
    console.log("Attempting to connect with config (modality=audio):", JSON.stringify(config, null, 2));
    if (!config) {
      console.error("Connect failed: config has not been set");
      return false;
    }
    try {
      await client.connect(config);
      console.log("client.connect() promise resolved successfully.");
      return true;
    } catch (error) {
      console.error("Error during client.connect call:", error);
      setConnected(false);
      return false;
    }
  }, [client, config, setConnected]);

  const disconnect = useCallback(async () => {
    client.disconnect();
  }, [client]);

  // Function to signal the end of the session
  const endSession = useCallback(() => {
    if (!connected) {
      console.warn("Cannot end session: not connected.");
      return;
    }
    console.log("Sending end session signal to backend.");
    // Send a specific message structure to indicate session end.
    // Assuming sendText can handle this structure. Adjust if needed based on MultimodalLiveClient capabilities.
    // We send an empty text part but include the flag in the data.
    client.send([{ text: "End Session" }]);
    // Consider if UI state needs changing here, e.g., disabling input.
    // setIsModelTurn(true); // Maybe anticipate the model's final speech turn? Needs testing.

  }, [client, connected]);

  return {
    client,
    config,
    setConfig,
    connected,
    connect,
    disconnect,
    endSession,
    volume,
    isModelTurn: isModelTurnState,
  };
}
