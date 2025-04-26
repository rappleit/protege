
import React, { useEffect, useState } from 'react';
import Button from './Button';
import { cn } from '@/lib/utils';
import { Mic, MicOff, CircleStop } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

type RecordingControlsProps = {
  onSessionEnd: () => void;
  className?: string;
};

const RecordingControls: React.FC<RecordingControlsProps> = ({ onSessionEnd, className }) => {
  const { isRecording, setIsRecording, recordingTime, setRecordingTime } = useSession();
  const [isPaused, setIsPaused] = useState(false);
  
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
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setIsPaused(false);
    } else {
      setIsPaused(!isPaused);
    }
  };
  
  const stopRecording = () => {
    if (window.confirm('Are you sure you want to end your session?')) {
      setIsRecording(false);
      onSessionEnd();
    }
  };
  
  return (
    <div className={cn('flex flex-col items-center p-4 rounded-lg bg-scholarly-navy/80 backdrop-blur border border-scholarly-gold/20 shadow-lg shadow-scholarly-gold/10', className)}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-24 text-center">
          <p className="text-xl font-medium text-scholarly-parchment">{formatTime(recordingTime)}</p>
          <p className="text-xs text-scholarly-gold/80">Recording Time</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={toggleRecording}
            size="sm"
            variant={isPaused ? "outline" : "default"}
            className={cn(
              "rounded-full w-12 h-12 flex items-center justify-center p-0 border-2 border-scholarly-gold/30",
              isRecording && !isPaused ? "bg-red-500/80 hover:bg-red-600/80" : "bg-scholarly-navy/70 hover:bg-scholarly-navy/90"
            )}
          >
            {isRecording && !isPaused ? <MicOff size={20} className="text-scholarly-cream" /> : <Mic size={20} className="text-scholarly-gold" />}
          </Button>
          
          <Button 
            onClick={stopRecording}
            size="sm"
            variant="outline"
            className="rounded-full w-12 h-12 flex items-center justify-center p-0 border-2 border-scholarly-gold/30 bg-scholarly-navy/70 hover:bg-scholarly-navy/90"
            disabled={!isRecording && recordingTime === 0}
          >
            <CircleStop size={20} className="text-scholarly-gold" />
          </Button>
        </div>
        
        <div className="w-24 flex justify-center">
          {isRecording && !isPaused && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-medium text-red-500">LIVE</p>
            </div>
          )}
          {isRecording && isPaused && (
            <p className="text-xs font-medium text-amber-500">PAUSED</p>
          )}
        </div>
      </div>
      
      {recordingTime > 0 && (
        <Button 
          onClick={stopRecording}
          variant="default"
          size="sm"
          className="bg-scholarly-burgundy/80 hover:bg-scholarly-burgundy text-scholarly-cream border-2 border-scholarly-gold/30"
        >
          End Session
        </Button>
      )}
    </div>
  );
};

export default RecordingControls;
