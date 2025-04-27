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

import cn from "classnames";

import { memo, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";
import SettingsDialog from "../settings-dialog/SettingsDialog";

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
  enableEditingSettings?: boolean;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop }: MediaStreamButtonProps) =>
    isStreaming ? (
      <button className="action-button" onClick={stop}>
        <span className="material-symbols-outlined text-scholarly-gold">{onIcon}</span>
      </button>
    ) : (
      <button className="action-button" onClick={start}>
        <span className="material-symbols-outlined text-scholarly-gold">{offIcon}</span>
      </button>
    )
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
  enableEditingSettings,
}: ControlTrayProps) {
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] =
    useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  // Ref to track the current connection status reliably
  const isConnectedRef = useRef(connected);
  useEffect(() => {
    isConnectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`
    );
  }, [inVolume]);

  useEffect(() => {
    const onData = (base64: string) => {
      // Check the CURRENT connection status via the ref
      if (!isConnectedRef.current) {
        return;
      }
      // Add try...catch to handle potential race condition on disconnect
      try {
        client.sendRealtimeInput([
          {
            mimeType: "audio/pcm;rate=16000",
            data: base64,
          },
        ]);
      } catch (error) {
        // Check if the error is the specific WebSocket error we expect
        if ((error as Error)?.message?.includes('WebSocket is not connected')) {
          // console.warn("Attempted to send audio data after WebSocket closed. Ignored.");
          // Swallow the error specifically for this case during disconnection
        } else {
          // Log or re-throw other unexpected errors
          console.error("Error sending audio data:", error);
        }
      }
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
    }

    let timeoutId = -1;

    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas) {
        return;
      }

      const ctx = canvas.getContext("2d")!;
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;
      if (canvas.width + canvas.height > 0) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 1.0);
        const data = base64.slice(base64.indexOf(",") + 1, Infinity);
        client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
      }
      if (connected) {
        timeoutId = window.setTimeout(sendVideoFrame, 1000 / 0.5);
      }
    }
    if (connected && activeVideoStream !== null) {
      requestAnimationFrame(sendVideoFrame);
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef]);

  //handler for swapping from one video-stream to the next
  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    if (next) {
      const mediaStream = await next.start();
      setActiveVideoStream(mediaStream);
      onVideoStreamChange(mediaStream);
    } else {
      setActiveVideoStream(null);
      onVideoStreamChange(null);
    }

    videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
  };

  return (
    <section className="control-tray flex items-center justify-center border-scholarly-gold border-2 rounded-lg bg-scholarly-navy p-4 min-h-[80px]">
      <canvas style={{ display: "none" }} ref={renderCanvasRef} />

      {!connected ? (
        // --- State: Not Connected ---
        <div className="flex justify-center z-10">
          <button
            ref={connectButtonRef}
            className="action-button connect-toggle flex items-center gap-2 bg-scholarly-navy/70 hover:bg-scholarly-navy/90 text-scholarly-gold border-2 border-scholarly-gold/30 hover:border-scholarly-gold/50 px-4 py-2 rounded-lg"
            onClick={connect}
          >
            <span className="material-symbols-outlined filled">play_arrow</span>
            <span>Start Session</span>
          </button>
        </div>
      ) : (
        // --- State: Connected ---
        <div className="flex items-center justify-center w-full z-10 gap-4">
          {/* Left side: Mic button */}
          <button
            className={cn("action-button mic-button rounded-full w-12 h-12 flex items-center justify-center p-0 border-2 border-scholarly-gold/30 hover:border-scholarly-gold/50",
                         !muted ? "bg-scholarly-navy/70 hover:bg-scholarly-navy/90" : "bg-red-500/80 hover:bg-red-600/80"
                        )}
            onClick={() => setMuted(!muted)}
          >
            {!muted ? (
              <span className="material-symbols-outlined filled text-scholarly-gold">mic</span>
            ) : (
              <span className="material-symbols-outlined filled text-white">mic_off</span>
            )}
          </button>

          {/* Center: Audio Visualizer placeholder */}
          <div className="flex flex-col items-center">
            <div className="flex gap-1 mb-1 h-6 items-end">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-scholarly-gold rounded-full transition-all duration-100"
                  style={{
                    height: `${Math.max(2, Math.min(4 + (i + 1) * 2, 4 + (i + 1) * 2 * inVolume * 5))}px`,
                    opacity: inVolume > (i * 0.1) ? 1 : 0.3,
                  }}
                ></div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {/* Use material icon for volume */}
              <span className="material-symbols-outlined text-scholarly-gold/80 text-sm">volume_up</span>
              <p className="text-xs font-medium text-scholarly-gold/80">LIVE</p>
            </div>
          </div>

          {/* Right side: End Session button */}
          <button
            className="action-button end-session-button flex items-center gap-2 bg-scholarly-navy/70 hover:bg-scholarly-navy/90 text-scholarly-gold border-2 border-scholarly-gold/30 hover:border-scholarly-gold/50 px-4 py-2 rounded-lg"
            onClick={disconnect}
          >
            <span className="material-symbols-outlined filled">stop</span>
            <span>End Session</span>
          </button>
          {children} {/* Keep children, though placement might need review */}
        </div>
      )}

      {/* Removed the old connection-container div */}
      {/* Settings dialog remains outside the main conditional rendering */}
      {enableEditingSettings ? <SettingsDialog /> : ""}
    </section>
  );
}

export default memo(ControlTray);
