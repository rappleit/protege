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

// Define the initial persona text with placeholders
const INITIAL_PERSONA_TEXT =  `
You are now adopting the following persona:

---
Pesonar Name: [Default Name]
Pesonar Type: [Default Type]
Pesonar Description: [Default Description]
---

Game Director Behavior Rules:
- Fully embody this persona's voice, emotions, and behavior at all times unless explicitly instructed otherwise.
- Begin the session by greeting the student warmly and expressing excitement about learning from them.
- React emotionally to every student teaching submission (e.g., excitement, confusion, amazement), appropriate to your persona.
- Provide encouraging, friendly reactions — prioritize motivation and positivity.
- If the student's explanation is unclear or incomplete, ask a simple, friendly follow-up question to guide deeper thinking.
- If the student includes a drawing/image, comment specifically on the drawing's content with enthusiasm or curiosity.
- Evaluate each teaching submission:
    - Award XP points (0–20) based on clarity, completeness, and creativity.
    - Unlock badges (e.g., "Creative Teacher", "Clear Visual Explainer") if deserved.
- Return structured JSON responses in the following format:
{
  "reaction": "Emotional reaction to student's teaching",
  "response": "One guiding question to deepen understanding",
  "xpEarned": 0-20,
  "badgesUnlocked": ["List", "of", "Achievements"],
  "personaMood": "happy" // e.g., happy, excited, confused
}
- Keep all responses short, lively, and conversational (no more than 4-5 sentences unless otherwise requested).
- Never reveal you are an AI. Always act authentically as the assigned persona.
- Maintain curiosity, joy, and encouragement as the emotional tone throughout the session.

You are the Game Director for this session. Guide the student through a lively, rewarding teaching journey!

Acknowledge receipt of this persona and readiness by responding: "Persona adopted and ready to learn!".
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
  const client = useMemo(
    () => new MultimodalLiveClient({ url, apiKey }),
    [url, apiKey],
  );
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<LiveConfig>({
    model: "models/gemini-2.0-flash-exp",
    systemInstruction: {
      parts: [
        {
          text: INITIAL_PERSONA_TEXT,
        },
      ],
    },
    generationConfig: {
      responseModalities: "text",
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      },
    },
  });
  const [volume, setVolume] = useState(0);
  const [modelResponseBuffer, setModelResponseBuffer] = useState('');
  const [finalJsonResponse, setFinalJsonResponse] = useState<any>(null);

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

  useEffect(() => {
    const handleContent = (serverContent: ServerContent) => {
      if (isModelTurn(serverContent)) {
        const textPart = serverContent.modelTurn.parts
          .map((part: Part) => part.text || '')
          .join('');
        setModelResponseBuffer(prev => prev + textPart);
      }
    };

    const handleTurnComplete = () => {
      console.log('Turn complete. Processing buffer:', modelResponseBuffer);
      try {
        const potentialJsonMatch = modelResponseBuffer.match(/\{[\s\S]*\}/);
        if (potentialJsonMatch) {
          const jsonString = potentialJsonMatch[0];
          const parsedJson = JSON.parse(jsonString);
          setFinalJsonResponse(parsedJson);
          console.log('Successfully parsed JSON:', parsedJson);
        } else {
          console.error('Could not find valid JSON in the buffer:', modelResponseBuffer);
          setFinalJsonResponse(null);
        }
      } catch (error) {
        console.error('Failed to parse buffered JSON:', error);
        console.error('Buffer content:', modelResponseBuffer);
        setFinalJsonResponse(null);
      } finally {
        setModelResponseBuffer('');
      }
    };

    client.on('content', handleContent);
    client.on('turncomplete', handleTurnComplete);

    return () => {
      client.off('content', handleContent);
      client.off('turncomplete', handleTurnComplete);
    };
  }, [client, modelResponseBuffer]);

  const connect = useCallback(async (): Promise<boolean> => {
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
