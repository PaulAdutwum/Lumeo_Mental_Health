import React, { useState, useRef, useEffect, useCallback, FC } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Flex,
  IconButton,
  Heading,
  Button,
  SimpleGrid,
  CloseButton,
  Text,
  Icon,
  Slider,
  SliderTrack,
  SliderThumb,
  Spinner,
} from "@chakra-ui/react";
import {
  FaPaintBrush,
  FaEraser,
  FaUndo,
  FaRedo,
  FaTrash,
  FaDownload,
  FaSquare,
  FaCircle,
  FaLongArrowAltRight,
  FaPencilAlt,
  FaMoon,
  FaSun,
  FaPalette,
  FaMicrophone,
  FaMicrophoneSlash,
  FaRobot,
  FaSpinner,
  FaImage,
  FaComment,
  FaCommentDots,
  FaTimes,
  FaSearchPlus,
  FaMagic,
  FaMusic,
  FaVolumeUp,
  FaVolumeDown,
  FaVolumeMute,
  FaPlayCircle,
  FaPauseCircle,
  FaArrowLeft,
  FaPaperPlane,
  FaFont,
  FaMinus,
} from "react-icons/fa";
import { BsHighlighter } from "react-icons/bs";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import * as fabric from "fabric";
import { useNavigate } from "react-router-dom";

// Define proper fabric event types
type FabricPointerEvent = fabric.TEvent<MouseEvent | TouchEvent>;

interface DrawingCanvasProps {
  onClose: () => void;
}

// Define theme types
type CanvasTheme = "light" | "dark" | "nature" | "ocean" | "sunset";

// Fix type for window recognition property
interface WindowWithSpeechRecognition extends Window {
  webkitSpeechRecognition: any;
  recognition?: any;
}

// Add this right after existing window interface extensions
interface Window {
  webkitSpeechRecognition: any;
  recognition?: any;
  YT: {
    Player: any;
    PlayerState: {
      PLAYING: number;
      PAUSED: number;
      ENDED: number;
    };
  };
  onYouTubeIframeAPIReady: () => void;
  cv?: any; // Add OpenCV global object
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    recognition?: any;
  }
}

// Add a type definition for the fabric Canvas that includes the methods we use
type FabricCanvas = fabric.Canvas;

// Fix TypeScript errors for Image constructor by adding proper type
// Type declaration for HTMLImageElement constructor
interface ImageConstructor {
  new (): HTMLImageElement;
  prototype: HTMLImageElement;
}

declare const Image: ImageConstructor;

// Fix TypeScript errors for Image constructor by adding proper type
// Type declaration for HTMLImageElement constructor
interface FabricImage extends fabric.Image {
  data?: any;
}

const DrawingCanvas: FC<DrawingCanvasProps> = ({ onClose }) => {
  const [tool, setTool] = useState<
    | "pen"
    | "eraser"
    | "rect"
    | "circle"
    | "arrow"
    | "text"
    | "brush"
    | "highlighter"
    | "line"
  >("pen");
  const [color, setColor] = useState<string>("#3182ce");
  const [fillColor, setFillColor] = useState<string>("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState<number>(5);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [canvasReady, setCanvasReady] = useState<boolean>(false);
  const [theme, setTheme] = useState<CanvasTheme>("light");
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef<boolean>(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  // Add state for image generation
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedArea, setSelectedArea] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [promptInput, setPromptInput] = useState("");

  // Add state for AI conversation
  const [showConversation, setShowConversation] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<
    Array<{
      text: string;
      isAI: boolean;
      timestamp: Date;
    }>
  >([]);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add OpenCV reference and loading state
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const openCVRef = useRef<any>(null);

  // Add auto-enhance state
  const [autoEnhanceEnabled, setAutoEnhanceEnabled] = useState<boolean>(false);

  // Add useNavigate hook for routing
  const navigate = useNavigate();

  // Add states for music player
  const [showMusicPlayer, setShowMusicPlayer] = useState<boolean>(false);
  const [musicCategory, setMusicCategory] = useState<string>("relaxing");
  const [musicVideos, setMusicVideos] = useState<any[]>([]);
  const [currentMusic, setCurrentMusic] = useState<any>(null);
  const [musicPlayerReady, setMusicPlayerReady] = useState<boolean>(false);
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);
  const [musicVolume, setMusicVolume] = useState<number>(50);
  const [loadingMusic, setLoadingMusic] = useState<boolean>(false);
  const musicPlayerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);

  // Add canvasModified state variable
  const [canvasModified, setCanvasModified] = useState(false);

  // Get theme-based colors
  const themeColors = {
    light: {
      bg: "rgba(255, 255, 255, 0.97)",
      text: "gray.800",
      border: "gray.200",
      canvas: "#f8f9fa",
      panel: "white",
      shadow: "0 1px 3px rgba(0,0,0,0.12)",
    },
    dark: {
      bg: "rgba(23, 25, 35, 0.97)",
      text: "gray.100",
      border: "gray.700",
      canvas: "#2D3748",
      panel: "gray.800",
      shadow: "0 4px 6px rgba(0,0,0,0.3)",
    },
    nature: {
      bg: "rgba(226, 232, 240, 0.97)",
      text: "green.800",
      border: "green.200",
      canvas: "#f0f4f8",
      panel: "green.50",
      shadow: "0 1px 3px rgba(0,0,0,0.12)",
    },
    ocean: {
      bg: "rgba(214, 234, 248, 0.97)",
      text: "blue.800",
      border: "blue.200",
      canvas: "#EBF8FF",
      panel: "blue.50",
      shadow: "0 1px 3px rgba(0,0,0,0.12)",
    },
    sunset: {
      bg: "rgba(254, 235, 200, 0.97)",
      text: "orange.800",
      border: "orange.200",
      canvas: "#FFFAF0",
      panel: "orange.50",
      shadow: "0 1px 3px rgba(0,0,0,0.12)",
    },
  };

  // Colors to choose from
  const colorPalettes = {
    standard: [
      "#000000", // Black
      "#FF0000", // Red
      "#00FF00", // Green
      "#0000FF", // Blue
      "#FFFF00", // Yellow
      "#FF00FF", // Magenta
      "#00FFFF", // Cyan
      "#FFA500", // Orange
      "#800080", // Purple
      "#FFFFFF", // White
    ],
    pastel: [
      "#FFB6C1", // Light Pink
      "#FFD700", // Gold
      "#98FB98", // Pale Green
      "#ADD8E6", // Light Blue
      "#FFA07A", // Light Salmon
      "#E6E6FA", // Lavender
      "#F0E68C", // Khaki
      "#AFEEEE", // Pale Turquoise
      "#D8BFD8", // Thistle
      "#FFFFFF", // White
    ],
    bold: [
      "#000000", // Black
      "#8B0000", // Dark Red
      "#006400", // Dark Green
      "#00008B", // Dark Blue
      "#FF8C00", // Dark Orange
      "#8B008B", // Dark Magenta
      "#008B8B", // Dark Cyan
      "#A52A2A", // Brown
      "#2F4F4F", // Dark Slate Gray
      "#FFFFFF", // White
    ],
  };

  const [colorPalette, setColorPalette] =
    useState<keyof typeof colorPalettes>("standard");
  const colors = colorPalettes[colorPalette];

  // Tools to choose from
  const tools = [
    { id: "pen", name: "Pen", icon: <FaPencilAlt /> },
    { id: "brush", name: "Brush", icon: <FaPaintBrush /> },
    { id: "highlighter", name: "Highlighter", icon: <BsHighlighter /> },
    { id: "eraser", name: "Eraser", icon: <FaEraser /> },
    { id: "line", name: "Line", icon: <FaMinus /> },
    { id: "rect", name: "Rectangle", icon: <FaSquare /> },
    { id: "circle", name: "Circle", icon: <FaCircle /> },
    { id: "arrow", name: "Arrow", icon: <FaLongArrowAltRight /> },
    { id: "text", name: "Text", icon: <FaFont /> },
  ];

  // Save canvas state to history
  const saveToHistory = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const json = fabricCanvasRef.current.toJSON();
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), json]);
    setHistoryIndex((prev) => prev + 1);
    setCanvasModified(true); // Mark canvas as modified
  }, [historyIndex]);

  // Shape drawing variables
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const activeObjectRef = useRef<fabric.Object | null>(null);

  // Handle mouse down event for shape creation
  const handleMouseDown = useCallback(
    (opt: FabricPointerEvent) => {
      if (
        tool === "pen" ||
        tool === "eraser" ||
        tool === "brush" ||
        tool === "highlighter" ||
        !canvasReady
      )
        return;
      if (!fabricCanvasRef.current) return;

      const canvas = fabricCanvasRef.current;
      const pointer = canvas.getPointer(opt.e);
      startPointRef.current = { x: pointer.x, y: pointer.y };

      if (tool === "text") {
        const text = new fabric.IText("Click to edit text", {
          left: pointer.x,
          top: pointer.y,
          fontFamily: "Arial",
          fill: color,
          fontSize: strokeWidth * 3,
          selectable: true,
          editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        canvas.renderAll();
        activeObjectRef.current = null;
        saveToHistory();
        return;
      }

      if (tool === "rect") {
        const rect = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: fillColor,
          stroke: color,
          strokeWidth: strokeWidth,
          selectable: false,
          evented: false,
        });
        canvas.add(rect);
        activeObjectRef.current = rect;
        canvas.renderAll();
      } else if (tool === "circle") {
        const circle = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          fill: fillColor,
          stroke: color,
          strokeWidth: strokeWidth,
          selectable: false,
          evented: false,
        });
        canvas.add(circle);
        activeObjectRef.current = circle;
        canvas.renderAll();
      } else if (tool === "arrow") {
        const line = new fabric.Line(
          [pointer.x, pointer.y, pointer.x, pointer.y],
          {
            stroke: color,
            strokeWidth: strokeWidth,
            selectable: false,
            evented: false,
          }
        );
        canvas.add(line);
        activeObjectRef.current = line;
        canvas.renderAll();
      } else if (tool === "line") {
        const line = new fabric.Line(
          [pointer.x, pointer.y, pointer.x, pointer.y],
          {
            stroke: color,
            strokeWidth: strokeWidth,
            selectable: false,
            evented: false,
          }
        );
        canvas.add(line);
        activeObjectRef.current = line;
        canvas.renderAll();
      }

      setIsDrawing(true);
    },
    [tool, color, fillColor, strokeWidth, canvasReady, saveToHistory]
  );

  // Handle mouse move for shape resizing
  const handleMouseMove = useCallback(
    (options: FabricPointerEvent) => {
      if (
        !isDrawing ||
        !startPointRef.current ||
        !activeObjectRef.current ||
        !fabricCanvasRef.current ||
        !canvasReady
      )
        return;
      if (
        tool === "pen" ||
        tool === "eraser" ||
        tool === "brush" ||
        tool === "highlighter"
      )
        return;

      const canvas = fabricCanvasRef.current;
      const pointer = canvas.getPointer(options.e);

      if (tool === "rect") {
        const rect = activeObjectRef.current as fabric.Rect;
        const startPoint = startPointRef.current;

        const width = Math.abs(pointer.x - startPoint.x);
        const height = Math.abs(pointer.y - startPoint.y);

        rect.set({
          left: Math.min(startPoint.x, pointer.x),
          top: Math.min(startPoint.y, pointer.y),
          width: width,
          height: height,
        });

        canvas.renderAll();
      } else if (tool === "circle") {
        const circle = activeObjectRef.current as fabric.Circle;
        const startPoint = startPointRef.current;

        const radius =
          Math.sqrt(
            Math.pow(pointer.x - startPoint.x, 2) +
              Math.pow(pointer.y - startPoint.y, 2)
          ) / 2;

        const centerX = (startPoint.x + pointer.x) / 2;
        const centerY = (startPoint.y + pointer.y) / 2;

        circle.set({
          left: centerX - radius,
          top: centerY - radius,
          radius: radius,
        });

        canvas.renderAll();
      } else if (tool === "arrow" || tool === "line") {
        const line = activeObjectRef.current as fabric.Line;

        line.set({
          x2: pointer.x,
          y2: pointer.y,
        });

        canvas.renderAll();

        // For arrow, add arrowhead at end
        if (tool === "arrow" && activeObjectRef.current) {
          // The following code will be added after mouseup to create arrowhead
        }
      }
    },
    [isDrawing, tool, canvasReady]
  );

  // Handle mouse up to complete shape drawing
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !fabricCanvasRef.current || !canvasReady) return;
    const canvas = fabricCanvasRef.current;

    // For arrow tool, add arrowhead
    if (tool === "arrow" && activeObjectRef.current) {
      const line = activeObjectRef.current as fabric.Line;
      const x1 = line.x1 || 0;
      const y1 = line.y1 || 0;
      const x2 = line.x2 || 0;
      const y2 = line.y2 || 0;

      // Calculate angle for arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);

      // Create arrowhead (triangle)
      const headLength = strokeWidth * 3;
      const arrowHead = new fabric.Triangle({
        left: x2,
        top: y2,
        width: headLength,
        height: headLength,
        fill: color,
        stroke: color,
        strokeWidth: 1,
        angle: (angle * 180) / Math.PI + 90,
        originX: "center",
        originY: "bottom",
        selectable: true, // Make selectable
        evented: true, // Allow interactions
      });

      canvas.add(arrowHead);
    }

    setIsDrawing(false);
    startPointRef.current = null;
    activeObjectRef.current = null;

    // Manually save to history if a shape was created
    if (
      tool !== "pen" &&
      tool !== "brush" &&
      tool !== "highlighter" &&
      tool !== "eraser"
    ) {
      const json = fabricCanvasRef.current.toJSON();
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), json]);
      setHistoryIndex((prev) => prev + 1);
      setCanvasModified(true);
    }

    // Force render to ensure objects stay visible
    canvas.renderAll();
  }, [isDrawing, canvasReady, tool, strokeWidth, color, historyIndex]);

  // Undo function
  const handleUndo = () => {
    if (historyIndex <= 0 || !fabricCanvasRef.current || !canvasReady) return;

    const newIndex = historyIndex - 1;
    const canvas = fabricCanvasRef.current;

    canvas.loadFromJSON(history[newIndex], () => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  // Redo function
  const handleRedo = () => {
    if (
      historyIndex >= history.length - 1 ||
      !fabricCanvasRef.current ||
      !canvasReady
    )
      return;

    const newIndex = historyIndex + 1;
    const canvas = fabricCanvasRef.current;

    canvas.loadFromJSON(history[newIndex], () => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
    });
  };

  // Clear canvas
  const handleClear = () => {
    if (!fabricCanvasRef.current || !canvasReady) return;

    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = themeColors[theme].canvas;

    // Add grid if enabled
    if (showGrid) {
      addGridToCanvas();
    }

    fabricCanvasRef.current.renderAll();

    saveToHistory();
  };

  // Download drawing
  const handleDownload = () => {
    if (!fabricCanvasRef.current || !canvasReady) return;

    const canvas = fabricCanvasRef.current;
    const dataURL = canvas.toDataURL({
      format: "png",
      multiplier: 2,
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `drawing-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Change theme
  const handleThemeChange = (newTheme: CanvasTheme) => {
    setTheme(newTheme);

    if (fabricCanvasRef.current && canvasReady) {
      fabricCanvasRef.current.backgroundColor = themeColors[newTheme].canvas;

      // Re-add grid if enabled
      if (showGrid) {
        addGridToCanvas();
      }

      fabricCanvasRef.current.renderAll();
    }
  };

  // Add grid to canvas
  const addGridToCanvas = () => {
    if (!fabricCanvasRef.current || !canvasReady) return;

    const canvas = fabricCanvasRef.current;

    // Remove existing grid lines
    const objects = canvas.getObjects();
    const objectsToRemove = [];

    for (let i = 0; i < objects.length; i++) {
      // @ts-ignore - fabric.js internal API
      if (objects[i]._gridLine) {
        objectsToRemove.push(objects[i]);
      }
    }

    objectsToRemove.forEach((obj) => canvas.remove(obj));

    if (!showGrid) return;

    // Define grid properties
    const gridSize = 20;
    const gridColor =
      theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)";
    const canvasWidth = canvas.width || 0;
    const canvasHeight = canvas.height || 0;

    // Create vertical lines
    for (let i = 0; i <= canvasWidth; i += gridSize) {
      const line = new fabric.Line([i, 0, i, canvasHeight], {
        stroke: gridColor,
        selectable: false,
        evented: false,
      });

      // @ts-ignore - add custom property
      line._gridLine = true;
      canvas.add(line);

      // Ensure line is at the back - setZIndex is more compatible
      // @ts-ignore - using fabric.js method
      canvas.bringToFront(line);
      // @ts-ignore - using fabric.js method
      canvas.sendObjectToBack(line);
    }

    // Create horizontal lines
    for (let i = 0; i <= canvasHeight; i += gridSize) {
      const line = new fabric.Line([0, i, canvasWidth, i], {
        stroke: gridColor,
        selectable: false,
        evented: false,
      });

      // @ts-ignore - add custom property
      line._gridLine = true;
      canvas.add(line);

      // Ensure line is at the back - setZIndex is more compatible
      // @ts-ignore - using fabric.js method
      canvas.bringToFront(line);
      // @ts-ignore - using fabric.js method
      canvas.sendObjectToBack(line);
    }

    canvas.renderAll();
  };

  // Toggle grid visibility
  const toggleGrid = () => {
    setShowGrid(!showGrid);
  };

  // Handle color palette change
  const handlePaletteChange = (newPalette: keyof typeof colorPalettes) => {
    setColorPalette(newPalette);
  };

  // Add AI suggestion handling
  const getAISuggestion = async () => {
    if (!fabricCanvasRef.current || !canvasReady) return;

    try {
      setIsSuggestingAI(true);
      setAiSuggestion("");

      // Get canvas as data URL (PNG image)
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: "png",
        quality: 0.8,
        multiplier: 1,
      });

      // Send to backend for analysis
      const response = await axios.post("/api/canvas/suggest", {
        imageData: dataURL,
        prompt: "What improvements would you suggest for this drawing?",
      });

      if (response.data && response.data.suggestion) {
        setAiSuggestion(response.data.suggestion);

        // If response includes drawing instructions, apply them
        if (response.data.instructions) {
          applyAIInstructions(response.data.instructions);
        }
      }
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      setAiSuggestion("Sorry, I couldn't analyze your drawing right now.");
    } finally {
      setIsSuggestingAI(false);
    }
  };

  // Apply drawing instructions from AI
  const applyAIInstructions = (instructions: any) => {
    if (!fabricCanvasRef.current || !canvasReady) return;

    try {
      if (instructions.shapes) {
        instructions.shapes.forEach((shape: any) => {
          if (shape.type === "circle") {
            const circle = new fabric.Circle({
              left: shape.x,
              top: shape.y,
              radius: shape.radius || 50,
              fill: shape.fill || "transparent",
              stroke: shape.stroke || color,
              strokeWidth: shape.strokeWidth || strokeWidth,
            });
            fabricCanvasRef.current?.add(circle);
          } else if (shape.type === "rectangle") {
            const rect = new fabric.Rect({
              left: shape.x,
              top: shape.y,
              width: shape.width || 100,
              height: shape.height || 80,
              fill: shape.fill || "transparent",
              stroke: shape.stroke || color,
              strokeWidth: shape.strokeWidth || strokeWidth,
            });
            fabricCanvasRef.current?.add(rect);
          } else if (shape.type === "text") {
            const text = new fabric.Text(shape.text || "Text", {
              left: shape.x,
              top: shape.y,
              fill: shape.fill || color,
              fontSize: shape.fontSize || 20,
            });
            fabricCanvasRef.current?.add(text);
          }
        });

        fabricCanvasRef.current.renderAll();
        saveToHistory();
      }
    } catch (error) {
      console.error("Error applying AI instructions:", error);
    }
  };

  // Update OpenCV initialization code
  const initOpenCV = () => {
    // Use dynamic import to load OpenCV
    try {
      // Instead of requiring opencv.js, we'll use a script tag to load it
      if (!document.getElementById("opencv-script")) {
        const script = document.createElement("script");
        script.id = "opencv-script";
        script.async = true;
        script.src = "https://docs.opencv.org/master/opencv.js";
        script.onload = () => {
          // Use type assertion to handle the global OpenCV object
          const cv = (window as any).cv;
          if (cv) {
            openCVRef.current = cv;
            setIsOpenCVReady(true);
            console.log("OpenCV.js loaded successfully");
          }
        };
        script.onerror = (err) => {
          console.warn("Failed to load OpenCV.js:", err);
        };
        document.body.appendChild(script);
      } else if ((window as any).cv) {
        // If script is already loaded but not initialized
        openCVRef.current = (window as any).cv;
        setIsOpenCVReady(true);
        console.log("OpenCV.js already available");
      }
    } catch (err) {
      console.warn("Failed to initialize OpenCV.js:", err);
    }
  };

  // Initialize OpenCV when component mounts
  useEffect(() => {
    initOpenCV();

    // Cleanup when component unmounts
    return () => {
      const script = document.getElementById("opencv-script");
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Fix process image function to use try/catch
  const processImageWithOpenCV = (imageElement: HTMLImageElement) => {
    if (!isOpenCVReady || !openCVRef.current) {
      console.warn("OpenCV not ready, skipping image processing");
      return null;
    }

    try {
      const cv = openCVRef.current;

      // Create OpenCV matrix from image
      const src = cv.imread(imageElement);

      // Create a destination matrix
      const dst = new cv.Mat();

      // Apply image processing operations
      // 1. Convert to grayscale for processing
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // 2. Apply adaptive threshold to find edges
      const edges = new cv.Mat();
      cv.adaptiveThreshold(
        gray,
        edges,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY,
        11,
        2
      );

      // 3. Find contours - useful for object detection
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(
        edges,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      console.log(`Found ${contours.size()} objects in the image`);

      // Create a canvas to display the processed image
      const canvas = document.createElement("canvas");
      canvas.width = src.cols;
      canvas.height = src.rows;
      cv.imshow(canvas, dst);

      // Clean up OpenCV resources
      src.delete();
      dst.delete();
      gray.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();

      return {
        processedImageUrl: canvas.toDataURL(),
        objectCount: contours.size(),
      };
    } catch (error) {
      console.error("Error processing image with OpenCV:", error);
      return null;
    }
  };

  // Update image generation to use OpenCV
  const generateImageInSelectedArea = async () => {
    if (
      !fabricCanvasRef.current ||
      !canvasReady ||
      !selectedArea ||
      !promptInput
    )
      return;

    try {
      setIsGeneratingImage(true);

      // Call API to generate image
      const response = await axios.post("/api/media-gen/image", {
        prompt: promptInput,
        area: selectedArea,
      });

      if (response.data && response.data.imageUrl) {
        // Create an HTML image first, then process with OpenCV
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
          // Process with OpenCV if available
          const processedResult = isOpenCVReady
            ? processImageWithOpenCV(img)
            : null;

          if (fabricCanvasRef.current) {
            // Use either the processed image or the original
            const imageToUse = processedResult?.processedImageUrl || img.src;
            const finalImage = new Image();
            finalImage.crossOrigin = "anonymous";

            finalImage.onload = function () {
              const fabricImage = new fabric.Image(finalImage);
              fabricImage.set({
                left: selectedArea.x,
                top: selectedArea.y,
                scaleX: selectedArea.width / (finalImage.width || 100),
                scaleY: selectedArea.height / (finalImage.height || 100),
              });

              // Remove selection rectangle
              if (fabricCanvasRef.current) {
                fabricCanvasRef.current.getObjects().forEach((obj) => {
                  if (obj.fill === "rgba(0,0,255,0.1)") {
                    fabricCanvasRef.current?.remove(obj);
                  }
                });

                // Add the generated image
                fabricCanvasRef.current.add(fabricImage);

                // If we detected objects with OpenCV, add annotations
                if (processedResult && processedResult.objectCount > 0) {
                  const label = new fabric.Text(
                    `Objects: ${processedResult.objectCount}`,
                    {
                      left: selectedArea.x,
                      top: selectedArea.y - 20,
                      fontSize: 14,
                      fill: "#00AA00",
                      backgroundColor: "rgba(255,255,255,0.7)",
                      padding: 5,
                    }
                  );

                  fabricCanvasRef.current.add(label);
                }

                fabricCanvasRef.current.renderAll();
                saveToHistory();
              }

              // Reset selection mode
              setSelectionMode(false);
              setSelectedArea(null);
              setPromptInput("");
            };

            finalImage.src = imageToUse;
          }
        };
        img.src = response.data.imageUrl;
      }
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Cancel selection mode
  const cancelSelectionMode = () => {
    if (!fabricCanvasRef.current || !canvasReady) return;

    // Remove selection rectangle
    fabricCanvasRef.current.getObjects().forEach((obj) => {
      if (obj.fill === "rgba(0,0,255,0.1)") {
        fabricCanvasRef.current?.remove(obj);
      }
      // Re-enable object selection
      obj.selectable = true;
    });

    fabricCanvasRef.current.renderAll();
    setSelectionMode(false);
    setSelectedArea(null);
    setPromptInput("");
  };

  // Initialize fabric canvas
  useEffect(() => {
    // Only run this once
    if (initializedRef.current) return;

    // Make sure we have the DOM elements
    if (!canvasRef.current || !containerRef.current) return;

    initializedRef.current = true;

    // Create the canvas with proper options
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: themeColors[theme].canvas,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      preserveObjectStacking: true, // Ensure objects stay in the order they were created
      stopContextMenu: true, // Prevent context menu from appearing on right-click
      fireRightClick: true, // Enable right-click events
      renderOnAddRemove: true, // Always render when objects are added/removed
    });

    fabricCanvasRef.current = fabricCanvas;

    // Now that we have the canvas, we can set up the drawing brush
    if (fabricCanvas.isDrawingMode) {
      const freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
      freeDrawingBrush.color = color;
      freeDrawingBrush.width = strokeWidth;
      fabricCanvas.freeDrawingBrush = freeDrawingBrush;
    }

    // Path creation complete handler - save history when a path is finished
    fabricCanvas.on("path:created", () => {
      // Only save history on path creation, not during path creation
      setTimeout(() => {
        if (fabricCanvasRef.current) {
          const json = fabricCanvasRef.current.toJSON();
          setHistory((prev) => [...prev.slice(0, historyIndex + 1), json]);
          setHistoryIndex((prev) => prev + 1);
          setCanvasModified(true);
        }
      }, 0);
    });

    // Mark the canvas as ready
    setCanvasReady(true);

    // Save the initial state
    setTimeout(() => {
      if (fabricCanvasRef.current) {
        const initialState = JSON.stringify(fabricCanvasRef.current.toJSON());
        setHistory([initialState]);
        setHistoryIndex(0);
      }
    }, 100);

    // Set up window resize event
    const handleResize = () => {
      if (fabricCanvasRef.current && containerRef.current) {
        // Get current content to preserve
        const json = fabricCanvasRef.current.toJSON();

        // Update canvas dimensions
        fabricCanvasRef.current.setWidth(containerRef.current.clientWidth);
        fabricCanvasRef.current.setHeight(containerRef.current.clientHeight);

        // Restore content
        fabricCanvasRef.current.loadFromJSON(json, () => {
          fabricCanvasRef.current?.renderAll();
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      // Clean up
      window.removeEventListener("resize", handleResize);
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.off("path:created");
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      initializedRef.current = false;
      setCanvasReady(false);
    };
  }, [color, strokeWidth, theme, historyIndex]);

  // Update brush styles when tool or color changes
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasReady) return;

    const canvas = fabricCanvasRef.current;

    // Configure brush - only if canvas is in drawing mode
    if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
      if (tool === "eraser") {
        canvas.freeDrawingBrush.color = themeColors[theme].canvas;
        canvas.freeDrawingBrush.width = strokeWidth * 2;
      } else if (tool === "pen") {
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = strokeWidth;
        // Use pencil brush for pen
        if (!(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          canvas.freeDrawingBrush.color = color;
          canvas.freeDrawingBrush.width = strokeWidth;
        }
      } else if (tool === "brush") {
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = strokeWidth * 2;
        // Use pencil brush with larger width
        if (!(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          canvas.freeDrawingBrush.color = color;
          canvas.freeDrawingBrush.width = strokeWidth * 2;
        }
      } else if (tool === "highlighter") {
        // Create semi-transparent color for highlighter
        const rgbColor = hexToRgb(color);
        const highlighterColor = rgbColor
          ? `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.4)`
          : `${color}66`; // Add 40% opacity

        canvas.freeDrawingBrush.color = highlighterColor;
        canvas.freeDrawingBrush.width = strokeWidth * 3;
        // Use pencil brush with transparency
        if (!(canvas.freeDrawingBrush instanceof fabric.PencilBrush)) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          canvas.freeDrawingBrush.color = highlighterColor;
          canvas.freeDrawingBrush.width = strokeWidth * 3;
        }
      }

      // Ensure brush settings are properly applied
      canvas.freeDrawingBrush.shadow = null;
    }

    // Configure drawing mode based on selected tool
    canvas.isDrawingMode =
      tool === "pen" ||
      tool === "eraser" ||
      tool === "brush" ||
      tool === "highlighter";

    // Make sure objects are selectable, but only when not in drawing mode
    canvas.selection = !canvas.isDrawingMode;

    // Setup object creation mode
    canvas.off("mouse:down", handleMouseDown);
    canvas.off("mouse:move", handleMouseMove);
    canvas.off("mouse:up", handleMouseUp);

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);

    // Force canvas to re-render
    canvas.renderAll();

    return () => {
      if (!canvas) return;

      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
    };
  }, [
    color,
    strokeWidth,
    tool,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    canvasReady,
    theme,
  ]);

  // Helper function to convert hex to rgb
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // Update functions that indicate completion of work to reset modification state
  const handleSave = () => {
    if (!fabricCanvasRef.current) return;

    try {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 1,
      });

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "drawing.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setCanvasModified(false);
    } catch (error) {
      console.error("Error saving canvas:", error);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "10px 15px",
          background: "#f0f4f8",
          borderBottom: "1px solid #e2e8f0",
          alignItems: "center",
          flexWrap: "wrap", // Allow wrapping on small screens
        }}
      >
        {/* Header with back button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "5px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: "#4A5568",
              fontWeight: "bold",
              padding: "8px",
              fontSize: "14px", // Slightly smaller for mobile
            }}
          >
            <FaArrowLeft style={{ marginRight: "5px" }} /> Back
          </button>

          <h2
            style={{
              fontWeight: "bold",
              fontSize: "18px",
              color: "#2D3748",
              whiteSpace: "nowrap",
            }}
          >
            Lumeo Drawing Canvas
          </h2>
        </div>
        <div
          style={{
            display: "flex",
            gap: "5px",
            alignItems: "center",
            flexWrap: "wrap", // Allow wrapping on small screens
            justifyContent: "flex-end",
          }}
        >
          {canvasModified && (
            <span
              style={{
                color: "#E53E3E",
                fontWeight: "bold",
                fontSize: "12px",
                margin: "0 5px",
              }}
            >
              Unsaved
            </span>
          )}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            style={{
              padding: "6px 10px",
              background: historyIndex <= 0 ? "#CBD5E0" : "#4299E1",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: historyIndex <= 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "13px", // Slightly smaller for mobile
            }}
          >
            <FaUndo /> Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            style={{
              padding: "6px 10px",
              background:
                historyIndex >= history.length - 1 ? "#CBD5E0" : "#4299E1",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                historyIndex >= history.length - 1 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "13px", // Slightly smaller for mobile
            }}
          >
            <FaRedo /> Redo
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: "6px 10px",
              background: "#F56565",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "13px", // Slightly smaller for mobile
            }}
          >
            <FaTrash /> Clear
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "6px 10px",
              background: "#38A169",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "13px", // Slightly smaller for mobile
            }}
          >
            <FaDownload /> Save
          </button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 70px)",
          maxHeight: "calc(100vh - 70px)",
        }}
      >
        <div
          className="tools-panel"
          style={{
            width: "200px", // Narrower on mobile
            maxWidth: "30%", // Limit width on small screens
            background: "#f8f8f8",
            padding: "15px 10px",
            borderRight: "1px solid #ddd",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            color: "#2D3748", // Ensure text is visible
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {/* Drawing tools */}
          <div>
            <h3
              style={{
                marginBottom: "10px",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#2D3748", // Ensure text is visible
              }}
            >
              Drawing Tools
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {tools.map((toolItem) => (
                <button
                  key={toolItem.id}
                  onClick={() => setTool(toolItem.id as any)}
                  style={{
                    padding: "8px 5px",
                    background: toolItem.id === tool ? "#3182CE" : "#e2e8f0",
                    color: toolItem.id === tool ? "white" : "#2D3748",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: "13px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "5px",
                    boxShadow:
                      toolItem.id === tool
                        ? "0 2px 5px rgba(0,0,0,0.2)"
                        : "none",
                    transform:
                      toolItem.id === tool ? "translateY(1px)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ fontSize: "16px" }}>{toolItem.icon}</div>
                  <span style={{ fontSize: "12px" }}>{toolItem.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            position: "relative",
            flex: 1,
            overflow: "hidden",
            touchAction: "none", // Prevent touch scrolling when drawing
          }}
          ref={containerRef}
        >
          <canvas
            ref={canvasRef}
            style={{
              background: themeColors[theme].canvas, // Use the theme colors
              touchAction: "none",
              width: "100%",
              height: "100%",
              minHeight: "300px", // Smaller minimum height for mobile
              borderRadius: "0",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DrawingCanvas;
