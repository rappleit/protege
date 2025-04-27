import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Video, VideoOff, Camera, CameraOff, Monitor } from "lucide-react";
import { Button } from "../ui/button";
import { useWebcam } from "../../hooks/use-webcam";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

const WebcamSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [frameRate, setFrameRate] = useState(0.5); // frames per second

  const videoStreams = [useWebcam(), useScreenCapture()];
  const [webcam, screenCapture] = videoStreams;
  const [activeStream, setActiveStream] = useState<"webcam" | "screen" | null>(
    null
  );

  // Get the client and connected state from LiveAPIContext
  const { client, connected } = useLiveAPIContext();

  const startStream = async (type: "webcam" | "screen") => {
    try {
      const streamToUse = type === "webcam" ? webcam : screenCapture;
      const stream = await streamToUse.start();

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setActiveStream(type);
        setWebcamError(null);
      }
    } catch (error) {
      console.error(`Error accessing ${type}:`, error);
      setWebcamError(`Could not access ${type}. Please check permissions.`);
      setActiveStream(null);
    }
  };

  const stopStream = () => {
    if (activeStream === "webcam") {
      webcam.stop();
    } else if (activeStream === "screen") {
      screenCapture.stop();
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setActiveStream(null);
  };

  // Send video frames to the client
  useEffect(() => {
    let timeoutId = -1;

    const captureAndSendFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || !video.srcObject) {
        return;
      }

      // Make sure video is actually playing and has dimensions
      if (
        video.readyState < 2 ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        if (connected && activeStream) {
          timeoutId = window.setTimeout(captureAndSendFrame, 500); // Try again soon
        }
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Scale down to save bandwidth
      canvas.width = video.videoWidth * 0.25;
      canvas.height = video.videoHeight * 0.25;

      // Draw the current frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64 JPEG
      const base64 = canvas.toDataURL("image/jpeg", 0.8);
      // Remove the data URL prefix
      const data = base64.slice(base64.indexOf(",") + 1);

      // Send to the client
      client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);

      // Schedule next frame
      if (connected && activeStream) {
        timeoutId = window.setTimeout(captureAndSendFrame, 1000 / frameRate);
      }
    };

    // Start capturing if we're connected and have an active stream
    if (connected && activeStream) {
      requestAnimationFrame(captureAndSendFrame);
    }

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeStream, client, frameRate]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full bg-card rounded-xl shadow-md p-4 flex flex-col bg-scholarly-navy"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-scholarly-gold">
          Video Source {connected && activeStream ? "(Streaming)" : ""}
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              activeStream === "webcam" ? stopStream() : startStream("webcam")
            }
            variant="outline"
            size="sm"
            className={`border-scholarly-gold/30 ${
              activeStream === "webcam" ? "bg-scholarly-gold/20" : ""
            }`}
          >
            {activeStream === "webcam" ? (
              <>
                <CameraOff size={16} className="mr-2" />
                Turn Off
              </>
            ) : (
              <>
                <Camera size={16} className="mr-2" />
                Camera
              </>
            )}
          </Button>

          <Button
            onClick={() =>
              activeStream === "screen" ? stopStream() : startStream("screen")
            }
            variant="outline"
            size="sm"
            className={`border-scholarly-gold/30 ${
              activeStream === "screen" ? "bg-scholarly-gold/20" : ""
            }`}
          >
            {activeStream === "screen" ? (
              <>
                <VideoOff size={16} className="mr-2" />
                Stop Sharing
              </>
            ) : (
              <>
                <Monitor size={16} className="mr-2" />
                Screen
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="relative aspect-video bg-black/50 rounded-lg overflow-hidden">
        {webcamError && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm p-4 text-center">
            {webcamError}
          </div>
        )}

        {!activeStream && !webcamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-scholarly-cream/70 gap-2">
            <VideoOff size={32} />
            <p className="text-sm">No video source active</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            !activeStream ? "hidden" : ""
          }`}
        />

        {/* Hidden canvas used for capturing video frames */}
        <canvas ref={canvasRef} className="hidden" width="320" height="240" />
      </div>
    </motion.div>
  );
};

export default WebcamSection;
