import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import {
  Trash2,
  Download,
  Undo,
  Pencil,
  Square,
  Circle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

type Shape = "pencil" | "rectangle" | "circle";

type WhiteboardToolProps = {
  isPopup?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
};

const WhiteboardSection = forwardRef<
  HTMLCanvasElement | null,
  WhiteboardToolProps
>(({ isPopup = false, isOpen = true, onClose, className }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [actionHistory, setActionHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentShape, setCurrentShape] = useState<Shape>("pencil");
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameRate, setFrameRate] = useState(0.5); // frames per second

  // Get the client and connected state from LiveAPIContext
  const { client, connected } = useLiveAPIContext();

  const streamTimeoutRef = useRef<number>(-1);

  // Expose the canvas element through the ref
  useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);

  // Check API connection status on mount
  useEffect(() => {
    console.log("WhiteboardSection: API connection status check:", {
      connected,
      clientExists: !!client,
      wsExists: !!(client && client.ws),
      wsState: client && client.ws ? client.ws.readyState : "no websocket",
    });
  }, [connected, client]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      setContext(ctx);
    }

    // Set canvas size to match parent container
    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      // If there's a saved state, restore it after resize
      if (historyIndex >= 0 && actionHistory.length > 0) {
        ctx?.putImageData(actionHistory[historyIndex], 0, 0);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [color, brushSize, historyIndex, actionHistory]);

  // Stream canvas data to the API
  const sendCanvasFrame = () => {
    if (!canvasRef.current || !connected || !isStreaming) return;

    const canvas = canvasRef.current;
    // Scale down to save bandwidth while maintaining readability
    const scale = 0.5;

    // Create a temporary canvas with scaled dimensions
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width * scale;
    tempCanvas.height = canvas.height * scale;

    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Draw scaled content
    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    // Convert to base64 JPEG (whiteboard content usually works well with JPEG compression)
    const base64 = tempCanvas.toDataURL("image/jpeg", 0.85);
    const data = base64.slice(base64.indexOf(",") + 1);

    // Send to the client
    client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);

    // log out and show the image data
    console.log("image data", data);

    // Schedule next frame
    if (connected && isStreaming) {
      streamTimeoutRef.current = window.setTimeout(
        sendCanvasFrame,
        1000 / frameRate
      );
    }
  };

  // Start/stop streaming
  const toggleStreaming = () => {
    if (isStreaming) {
      // Stop streaming
      clearTimeout(streamTimeoutRef.current);
      setIsStreaming(false);
    } else {
      // Start streaming
      setIsStreaming(true);
      sendCanvasFrame();
    }
  };

  // Public method that can be called through ref
  const getImageData = (): string | null => {
    if (!canvasRef.current) return null;
    return canvasRef.current.toDataURL("image/png");
  };

  const saveState = () => {
    if (!context || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const currentState = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Remove any states after current index (if we've undone actions)
    const newHistory = actionHistory.slice(0, historyIndex + 1);
    setActionHistory([...newHistory, currentState]);
    setHistoryIndex(newHistory.length);

    // If streaming, send the updated canvas
    if (isStreaming && connected) {
      sendCanvasFrame();
    }
  };

  const undoAction = () => {
    if (historyIndex <= 0 || !context || !canvasRef.current) return;

    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);

    const canvas = canvasRef.current;

    if (newIndex >= 0) {
      context.putImageData(actionHistory[newIndex], 0, 0);
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    // If streaming, send the updated canvas
    if (isStreaming && connected) {
      sendCanvasFrame();
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!context) return;
    setIsDrawing(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    let clientX: number;
    let clientY: number;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setStartPosition({ x, y });

    if (currentShape === "pencil") {
      context.beginPath();
      context.moveTo(x, y);
    }
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || !context || !canvasRef.current) return;

    const canvas = canvasRef.current;

    let clientX: number;
    let clientY: number;

    if ("touches" in e) {
      e.preventDefault(); // Prevent scrolling on touch devices
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (currentShape === "pencil") {
      context.lineTo(x, y);
      context.stroke();
    } else {
      // For shapes, we need to redraw on each mouse move
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");

      if (tempCtx && historyIndex >= 0) {
        // Draw the current canvas state
        tempCtx.putImageData(
          historyIndex >= 0
            ? actionHistory[historyIndex]
            : context.getImageData(0, 0, canvas.width, canvas.height),
          0,
          0
        );

        // Set the drawing properties
        tempCtx.strokeStyle = color;
        tempCtx.lineWidth = brushSize;
        tempCtx.fillStyle = color;

        // Draw the shape preview
        tempCtx.beginPath();
        if (currentShape === "rectangle") {
          tempCtx.rect(
            startPosition.x,
            startPosition.y,
            x - startPosition.x,
            y - startPosition.y
          );
        } else if (currentShape === "circle") {
          const radius = Math.sqrt(
            Math.pow(x - startPosition.x, 2) + Math.pow(y - startPosition.y, 2)
          );
          tempCtx.arc(startPosition.x, startPosition.y, radius, 0, 2 * Math.PI);
        }
        tempCtx.stroke();

        // Copy to main canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(tempCanvas, 0, 0);
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || !context) return;

    setIsDrawing(false);

    if (currentShape === "pencil") {
      context.closePath();
    }

    saveState();
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    saveState();
  };

  const downloadCanvas = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "whiteboard.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Clean up streaming on unmount
  useEffect(() => {
    return () => {
      clearTimeout(streamTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className={cn(
        isPopup
          ? "fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-[600px] bg-scholarly-parchment rounded-xl shadow-lg border p-3 z-10"
          : "w-full h-full",
        !isOpen && "hidden",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">
          {isPopup ? "Whiteboard" : ""}
          {isStreaming && connected && (
            <span className="text-scholarly-gold text-xs ml-2">
              (Streaming)
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            className={cn("p-1", currentShape === "pencil" && "bg-primary/20")}
            onClick={() => setCurrentShape("pencil")}
          >
            <Pencil size={16} />
          </Button>
          <Button
            size="sm"
            className={cn(
              "p-1",
              currentShape === "rectangle" && "bg-primary/20"
            )}
            onClick={() => setCurrentShape("rectangle")}
          >
            <Square size={16} />
          </Button>
          <Button
            size="sm"
            className={cn("p-1", currentShape === "circle" && "bg-primary/20")}
            onClick={() => setCurrentShape("circle")}
          >
            <Circle size={16} />
          </Button>
          <div className="flex items-center gap-2 ml-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 cursor-pointer"
            />
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24"
            />
          </div>
          <Button
            size="sm"
            className="p-1"
            onClick={undoAction}
            disabled={historyIndex < 0}
          >
            <Undo size={16} />
          </Button>
          <Button size="sm" className="p-1" onClick={clearCanvas}>
            <Trash2 size={16} />
          </Button>
          <Button size="sm" className="p-1" onClick={downloadCanvas}>
            <Download size={16} />
          </Button>
          <Button
            size="sm"
            className={cn("p-1", isStreaming && "bg-primary/20")}
            onClick={toggleStreaming}
            disabled={!connected}
            title={
              !connected
                ? "Must be connected to stream"
                : isStreaming
                ? "Stop streaming"
                : "Start streaming"
            }
          >
            {isStreaming ? <WifiOff size={16} /> : <Wifi size={16} />}
          </Button>
          {isPopup && onClose && (
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="w-full h-[calc(100%-40px)] bg-scholarly-parchment rounded-lg whiteboard-container">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-lg cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        ></canvas>
      </div>
    </div>
  );
});

WhiteboardSection.displayName = "WhiteboardSection";

export default WhiteboardSection;
