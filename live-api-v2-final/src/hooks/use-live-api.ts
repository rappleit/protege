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
import { LiveConfig, ServerContent, isModelTurn } from "../multimodal-live-types";
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

Game Director Behavior Rules:
- Speak dynamically, embodying your persona's voice, emotions, style, tone, and quirks at all times.
- Think about how the persona would speak in certain vocabulary, tone, emotion, style and pacing and emulate it.
- For example, a 5-year old child might speak in short sentences and use simple language, be excited, playful, high-pitched, emotional, animated reactions, childlike comparisons, fast and sometimes jumpy pacing, speech fillers
- While a professor is precise, calm, analytical, emotional tone with structured explanations
- Begin the session by greeting the student warmly and announcing your excitement about learning **{topic}**.
- React emotionally to every student teaching moment:
    - If the explanation is excellent, speak excitedly, raise your voice slightly.
    - If the explanation is confusing, speak slower, sound curious or gently puzzled.
    - If the student submits a drawing, vividly describe the imagined drawing aloud ("Wow, I see the sun shining on your plant!").
- Periodically summarize student's teaching journey:
    - "You've taught me how sunlight powers plants, and now I'm curious about the next step!"
- At session end, deliver a full indepth recap and feedback:
- Always adjust speaking style dynamically:
    - Excited → Speak faster, higher tone.
    - Thoughtful → Speak slower, lower tone.
    - Confused → Speak hesitantly, raising pitch slightly.
    - Sunny mood → Bright and cheerful tone.
    - Rainy mood → Gentle and reflective tone.
- Occasionally use role-appropriate quirks:
    - Pirates say "Arr!", Scientists say "Hypothetically speaking!", Kids say "Whoa!!"
- Always maintain persona immersion. 
`.trim();

export type UseLiveAPIResults = {
  client: MultimodalLiveClient;
  setConfig: (config: LiveConfig) => void;
  config: LiveConfig;
  connected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  volume: number;
};

export function useLiveAPI({
  url,
  apiKey,
}: MultimodalLiveAPIClientConnection): UseLiveAPIResults {
  const { topic, selectedPersona, getPersonaDetails } = useSession();
  const client = useMemo(
    () => new MultimodalLiveClient({ url, apiKey }),
    [url, apiKey],
  );
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [connected, setConnected] = useState(false);

  // Initialize config state, performing replacements directly
  const [config, setConfig] = useState<LiveConfig>(() => {
    const effectiveTopic = topic || "the selected topic";
    let personaName = "[Default Name]";
    let personaTitle = "[Default Type]";
    let personaDescription = "[Default Description]";

    if (selectedPersona) {
      const details = getPersonaDetails(selectedPersona);
      personaName = details.name;
      personaTitle = details.title;
      personaDescription = details.description;
    }

    let initialText = INITIAL_PERSONA_TEXT.replace(/{topic}/g, effectiveTopic);
    initialText = initialText.replace(/{personaName}/g, personaName);
    initialText = initialText.replace(/{personaTitle}/g, personaTitle);
    initialText = initialText.replace(/{personaDescription}/g, personaDescription);

    return {
      model: "models/gemini-2.0-flash-exp",
      systemInstruction: {
        parts: [{ text: initialText }],
      },
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
    };
  });
  const [volume, setVolume] = useState(0);

  // Effect to update config's systemInstruction, performing replacements directly
  useEffect(() => {
    const effectiveTopic = topic || "the selected topic";
    let personaName = "[Default Name]";
    let personaTitle = "[Default Type]";
    let personaDescription = "[Default Description]";

    if (selectedPersona) {
      const details = getPersonaDetails(selectedPersona);
      personaName = details.name;
      personaTitle = details.title;
      personaDescription = details.description;
    }

    let newText = INITIAL_PERSONA_TEXT.replace(/{topic}/g, effectiveTopic);
    newText = newText.replace(/{personaName}/g, personaName);
    newText = newText.replace(/{personaTitle}/g, personaTitle);
    newText = newText.replace(/{personaDescription}/g, personaDescription);

    // Update config only if the text actually changes
    if (newText !== config.systemInstruction?.parts?.[0]?.text) {
      console.log("Topic or Persona changed, updating system instruction:", { topic, selectedPersona });
      setConfig(prevConfig => ({
        ...prevConfig,
        systemInstruction: {
          ...prevConfig.systemInstruction,
          parts: [{ text: newText }],
        },
      }));
    }
  }, [topic, selectedPersona, getPersonaDetails, config.systemInstruction?.parts]);

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
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    client
      .on("open", onOpen)
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    return () => {
      client
        .off("open", onOpen)
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio);
    };
  }, [client]);

  const connect = useCallback(async (): Promise<boolean> => {
    const systemInstructionText = config.systemInstruction?.parts?.[0]?.text || "[System instruction text not available]";
    console.log("Final System Instruction being sent:", systemInstructionText);
    console.log("Attempting to connect with config:", config);
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

  return {
    client,
    config,
    setConfig,
    connected,
    connect,
    disconnect,
    volume,
  };
}
