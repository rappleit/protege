import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff, Camera, CameraOff } from 'lucide-react';
import Button from '@/components/Button';

const WebcamSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsWebcamActive(true);
        setWebcamError(null);
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      setWebcamError('Could not access webcam. Please check permissions.');
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsWebcamActive(false);
    }
  };

  const toggleWebcam = () => {
    if (isWebcamActive) {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
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
        <h3 className="text-lg font-medium text-scholarly-gold">Your Camera</h3>
        <Button 
          onClick={toggleWebcam} 
          variant="outline" 
          size="sm"
          className="border-scholarly-gold/30"
        >
          {isWebcamActive ? (
            <>
              <CameraOff size={16} className="mr-2" />
              Turn Off
            </>
          ) : (
            <>
              <Camera size={16} className="mr-2" />
              Turn On
            </>
          )}
        </Button>
      </div>
      
      <div className="relative aspect-video bg-black/50 rounded-lg overflow-hidden">
        {webcamError && (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm p-4 text-center">
            {webcamError}
          </div>
        )}
        
        {!isWebcamActive && !webcamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-scholarly-cream/70 gap-2">
            <VideoOff size={32} />
            <p className="text-sm">Camera is turned off</p>
          </div>
        )}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isWebcamActive ? 'hidden' : ''}`}
        />
      </div>
    </motion.div>
  );
};

export default WebcamSection; 