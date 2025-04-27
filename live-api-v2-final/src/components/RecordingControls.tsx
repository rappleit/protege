import React, { useEffect, useState, useRef } from "react";
import Button from "./Button";
import { cn } from "../lib/utils";
import {
  Mic,
  MicOff,
  CircleStop,
  Volume2,
  VolumeX,
  Send,
  Upload,
  Play,
  RefreshCw,
} from "lucide-react";
import { useSession } from "../contexts/SessionContext";
import { toast } from "sonner";

type RecordingControlsProps = {
  onSessionEnd: () => void;
  className?: string;
  onSendData?: (audioBlob?: Blob) => void;
};

const RecordingControls: React.FC<RecordingControlsProps> = ({
  onSessionEnd,
  className,
  onSendData,
}) => {
  const { isRecording, setIsRecording, recordingTime, setRecordingTime } =
    useSession();
  const [isPaused, setIsPaused] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(recordingTime + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused, recordingTime, setRecordingTime]);

  useEffect(() => {
    let animationFrameId: number;

    const updateAudioLevel = () => {
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const values = dataArrayRef.current;
        let sum = 0;
        for (let i = 0; i < values.length; i++) {
          sum += values[i];
        }
        const average = sum / values.length;
        setAudioLevel(average / 256); // Normalized to 0-1
      }
      animationFrameId = requestAnimationFrame(updateAudioLevel);
    };

    if (audioStream) {
      updateAudioLevel();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [audioStream]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const setupAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      setAudioError(null);

      // Setup analyzer for visualizing audio levels
      const audioContext = audioContextRef.current;
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Setup MediaRecorder for recording audio
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioBlob(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      return stream;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setAudioError(
        "Microphone access denied. Please check your browser permissions."
      );
      return null;
    }
  };

  const stopAudio = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(console.error);
    }
  };

  const startSession = () => {
    setSessionStarted(true);
    toggleRecording();
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      const stream = await setupAudio();
      if (stream) {
        setIsRecording(true);
        setIsPaused(false);
      }
    } else {
      if (isPaused) {
        // Resume recording
        const stream = await setupAudio();
        if (stream) {
          setIsPaused(false);
        }
      } else {
        // Pause recording
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          mediaRecorderRef.current.stop();
        }
        stopAudio();
        setIsPaused(true);
      }
    }
  };

  const clearAndRestart = async () => {
    // Stop current recording
    stopAudio();

    // Clear audio data
    audioChunksRef.current = [];
    setAudioBlob(null);

    // Reset recording state
    setIsPaused(false);

    // Start a new recording
    const stream = await setupAudio();
    if (stream) {
      setIsRecording(true);
      toast.success("Recording cleared and restarted");
    } else {
      setIsRecording(false);
      toast.error("Failed to restart recording");
    }
  };

  const stopRecording = () => {
    if (window.confirm("Are you sure you want to end your session?")) {
      stopAudio();
      setIsRecording(false);
      setIsPaused(false);
      onSessionEnd();
    }
  };

  const handleSendData = async () => {
    try {
      setIsSending(true);

      // If we're currently recording, finalize the recording first
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
        // Wait a short time for the onstop event to fire and create the blob
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Call the parent handler if provided, passing the audio blob
      if (onSendData) {
        onSendData(audioBlob || undefined);
      }

      toast.success("Response sent successfully!");

      // Reset audio chunks for next recording
      audioChunksRef.current = [];
      setAudioBlob(null);

      // Restart recording
      if (isRecording) {
        const stream = await setupAudio();
        if (!stream) {
          setIsRecording(false);
        }
      }
    } catch (error) {
      console.error("Error sending data:", error);
      toast.error("Failed to send response.");
    } finally {
      setIsSending(false);
    }
  };

  // Function to play back the recorded audio (for testing)
  const playRecordedAudio = () => {
    if (!audioBlob) {
      toast.error("No audio has been recorded yet");
      return;
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  };

  return (
    <div className={cn("rpg-card flex flex-col items-center p-4 bg-scholarly-navy", className)}>
      <div className="rpg-gradient" />

      {!sessionStarted ? (
        <div className="flex justify-center z-10 py-4">
          <Button
            onClick={startSession}
            size="lg"
            variant="default"
            className="bg-scholarly-navy hover:bg-scholarly-navy/90 text-scholarly-gold border-2 border-scholarly-gold/30 px-8"
          >
            <Play size={20} className="mr-2" /> Start Session
          </Button>
        </div>
      ) : (
        <>
          <div className="relative flex items-center gap-4 mb-4 z-10">
            <div className="w-20 text-center">
              <p className="text-xl font-medium text-scholarly-parchment">
                {formatTime(recordingTime)}
              </p>
              <p className="text-xs text-scholarly-gold/80">Recording</p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={toggleRecording}
                size="sm"
                variant={isPaused ? "outline" : "default"}
                className={cn(
                  "rounded-full w-12 h-12 flex items-center justify-center p-0 border-2 border-scholarly-gold/30",
                  isRecording && !isPaused
                    ? "bg-red-500/80 hover:bg-red-600/80"
                    : "bg-scholarly-navy/70 hover:bg-scholarly-navy/90"
                )}
              >
                {isRecording && !isPaused ? (
                  <MicOff size={20} className="text-scholarly-cream" />
                ) : (
                  <Mic size={20} className="text-scholarly-gold" />
                )}
              </Button>

              <Button
                onClick={handleSendData}
                size="sm"
                variant="outline"
                className="rounded-full w-12 h-12 flex items-center justify-center p-0 border-2 border-scholarly-gold/30 bg-scholarly-navy/70 hover:bg-scholarly-navy/90"
                disabled={isSending}
              >
                <Send size={20} className="text-scholarly-gold" />
              </Button>

              <Button
                onClick={clearAndRestart}
                size="sm"
                variant="outline"
                className="rounded-full w-12 h-12 flex items-center justify-center p-0 border-2 border-scholarly-gold/30 bg-scholarly-navy/70 hover:bg-scholarly-navy/90"
              >
                <RefreshCw size={20} className="text-scholarly-gold" />
              </Button>
            </div>

            <div className="w-24 flex items-center justify-center">
              {isRecording && !isPaused ? (
                <div className="flex flex-col items-center">
                  <div className="flex gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-scholarly-gold rounded-full"
                        style={{
                          height: `${Math.min(
                            4 + (i + 1) * 3,
                            4 + (i + 1) * 3 * audioLevel * 5
                          )}px`,
                          opacity: audioLevel > i * 0.2 ? 1 : 0.3,
                        }}
                      ></div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Volume2 size={14} className="text-scholarly-gold/80" />
                    <p className="text-xs font-medium text-scholarly-gold/80">
                      LIVE
                    </p>
                  </div>
                </div>
              ) : isPaused ? (
                <div className="flex items-center gap-1">
                  <VolumeX size={14} className="text-amber-500/80" />
                  <p className="text-xs font-medium text-amber-500">PAUSED</p>
                </div>
              ) : null}

              {audioError && (
                <p className="text-xs text-red-500">{audioError}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 z-10">
            <Button
              onClick={stopRecording}
              variant="default"
              size="sm"
              className="bg-scholarly-burgundy/80 hover:bg-scholarly-burgundy text-scholarly-cream border-2 border-scholarly-gold/30"
            >
              End Session
            </Button>

            {audioBlob && process.env.NODE_ENV === "development" && (
              <Button
                onClick={playRecordedAudio}
                variant="outline"
                size="sm"
                className="border-scholarly-gold/30"
              >
                Test Audio
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RecordingControls;
