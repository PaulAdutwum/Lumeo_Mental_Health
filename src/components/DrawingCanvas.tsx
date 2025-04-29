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
} from "react-icons/fa";
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
    "pen" | "eraser" | "rect" | "circle" | "arrow"
  >("pen");
  const [color, setColor] = useState<string>("#000000");
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
      canvas: "#ffffff",
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
    { id: "eraser", name: "Eraser", icon: <FaEraser /> },
    { id: "rect", name: "Rectangle", icon: <FaSquare /> },
    { id: "circle", name: "Circle", icon: <FaCircle /> },
    { id: "arrow", name: "Arrow", icon: <FaLongArrowAltRight /> },
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
      if (tool === "pen" || tool === "eraser" || !canvasReady) return;
      if (!fabricCanvasRef.current) return;

      const canvas = fabricCanvasRef.current;
      const pointer = canvas.getPointer(opt.e);
      startPointRef.current = { x: pointer.x, y: pointer.y };

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
      }

      setIsDrawing(true);
    },
    [tool, color, fillColor, strokeWidth, canvasReady]
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
      if (tool === "pen" || tool === "eraser") return;

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
      } else if (tool === "arrow") {
        const line = activeObjectRef.current as fabric.Line;

        line.set({
          x2: pointer.x,
          y2: pointer.y,
        });

        // Add arrow head (triangle) at the end
        canvas.renderAll();
      }
    },
    [isDrawing, tool, canvasReady]
  );

  // Handle mouse up to complete shape drawing
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !fabricCanvasRef.current || !canvasReady) return;

    setIsDrawing(false);
    startPointRef.current = null;
    activeObjectRef.current = null;

    // Add to history
    saveToHistory();
  }, [isDrawing, saveToHistory, canvasReady]);

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

  // Add voice command handler
  const toggleVoiceCommand = () => {
    if (!isRecording) {
      startVoiceRecognition();
    } else {
      stopVoiceRecognition();
    }
    setIsRecording(!isRecording);
  };

  // Voice recognition implementation
  const startVoiceRecognition = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice commands are not supported in this browser");
      return;
    }

    // No need to cast window since we've declared the global interface
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          processVoiceCommand(transcript);
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Voice recognition error", event);
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (isRecording) {
        recognition.start();
      }
    };

    recognition.start();
    window.recognition = recognition;
  };

  const stopVoiceRecognition = () => {
    if (window.recognition) {
      window.recognition.stop();
      delete window.recognition;
    }
  };

  // Process voice commands
  const processVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim();

    // Simple command mapping
    if (lowerCommand.includes("clear") || lowerCommand.includes("erase all")) {
      handleClear();
    } else if (lowerCommand.includes("undo")) {
      handleUndo();
    } else if (lowerCommand.includes("redo")) {
      handleRedo();
    } else if (
      lowerCommand.includes("pencil") ||
      lowerCommand.includes("pen")
    ) {
      setTool("pen");
    } else if (lowerCommand.includes("arrow")) {
      setTool("arrow");
    } else if (
      lowerCommand.includes("rectangle") ||
      lowerCommand.includes("rect")
    ) {
      setTool("rect");
    } else if (lowerCommand.includes("circle")) {
      setTool("circle");
    } else if (lowerCommand.includes("eraser")) {
      setTool("eraser");
    } else if (lowerCommand.match(/colou?r (to )?\w+/)) {
      // Extract color from command like "color blue" or "change color to red"
      const colorMatch = lowerCommand.match(/colou?r (to )?(\w+)/);
      if (colorMatch && colorMatch[2]) {
        const colorName = colorMatch[2];
        // Map common color names to hex values
        const colorMap: Record<string, string> = {
          red: "#FF0000",
          blue: "#0000FF",
          green: "#00FF00",
          yellow: "#FFFF00",
          black: "#000000",
          white: "#FFFFFF",
          purple: "#800080",
          orange: "#FFA500",
          pink: "#FFC0CB",
          brown: "#A52A2A",
          gray: "#808080",
          grey: "#808080",
        };

        if (colorMap[colorName]) {
          setColor(colorMap[colorName]);
        }
      }
    }
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
    // Use dynamic import to load OpenCV only when needed
    try {
      // @ts-ignore
      const cv = require("opencv.js");
      openCVRef.current = cv;
      setIsOpenCVReady(true);
      console.log("OpenCV.js loaded successfully");
    } catch (err) {
      console.warn("Failed to load OpenCV.js:", err);
    }
  };

  // Initialize OpenCV when component mounts
  useEffect(() => {
    initOpenCV();
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

    // Create the canvas - must be done before setting any dimensions
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: themeColors[theme].canvas,
    });

    fabricCanvasRef.current = fabricCanvas;

    // Now that we have the canvas, we can set up the drawing brush
    if (fabricCanvas.isDrawingMode) {
      const freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
      freeDrawingBrush.color = color;
      freeDrawingBrush.width = strokeWidth;
      fabricCanvas.freeDrawingBrush = freeDrawingBrush;
    }

    // Mark the canvas as ready so other functions can use it
    setCanvasReady(true);

    // Save the initial state
    setTimeout(() => {
      if (fabricCanvasRef.current) {
        const initialState = JSON.stringify(fabricCanvasRef.current.toJSON());
        setHistory([initialState]);
        setHistoryIndex(0);
      }
    }, 100);

    return () => {
      // Clean up
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      initializedRef.current = false;
      setCanvasReady(false);
    };
  }, [color, strokeWidth, theme]);

  // Update canvas size when container size changes
  useEffect(() => {
    if (!containerRef.current || !fabricCanvasRef.current || !canvasReady)
      return;

    const updateCanvasSize = () => {
      if (!containerRef.current || !fabricCanvasRef.current || !canvasReady)
        return;

      const { clientWidth, clientHeight } = containerRef.current;

      // Safely set dimensions
      try {
        fabricCanvasRef.current.setWidth(clientWidth);
        fabricCanvasRef.current.setHeight(clientHeight);

        // Re-add grid if enabled
        if (showGrid) {
          addGridToCanvas();
        }

        fabricCanvasRef.current.renderAll();
      } catch (error) {
        console.error("Error updating canvas size:", error);
      }
    };

    // Initial resize
    updateCanvasSize();

    // Handle window resize
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [canvasReady, showGrid]);

  // Update brush when tool or color changes
  useEffect(() => {
    if (!fabricCanvasRef.current || !canvasReady) return;

    const canvas = fabricCanvasRef.current;

    // Configure brush - only if canvas is in drawing mode
    if (canvas.isDrawingMode && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color =
        tool === "eraser" ? themeColors[theme].canvas : color;
      canvas.freeDrawingBrush.width =
        tool === "eraser" ? strokeWidth * 2 : strokeWidth;
    }

    // Configure drawing mode based on selected tool
    canvas.isDrawingMode = tool === "pen" || tool === "eraser";

    // Setup object creation mode
    canvas.off("mouse:down", handleMouseDown);
    canvas.off("mouse:move", handleMouseMove);
    canvas.off("mouse:up", handleMouseUp);

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);

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

  // Update grid when toggled
  useEffect(() => {
    if (canvasReady && fabricCanvasRef.current) {
      addGridToCanvas();
    }
  }, [showGrid, canvasReady, theme]);

  // Connect to socket.io server for real-time communication
  useEffect(() => {
    // Connect to socket server
    if (!socketRef.current) {
      socketRef.current = io(
        import.meta.env.VITE_SOCKET_URL || "http://localhost:3001"
      );

      // Listen for AI messages
      socketRef.current.on("ai-message", (message: string) => {
        setConversationMessages((prev) => [
          ...prev,
          { text: message, isAI: true, timestamp: new Date() },
        ]);

        // If we have labels enabled and the canvas is ready, add AI annotations
        if (showConversation && fabricCanvasRef.current && canvasReady) {
          addAIAnnotation(message);
        }
      });

      // Clean up on unmount
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, []);

  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMessages]);

  // Emit canvas events to the server for AI feedback
  const emitCanvasEvent = (eventType: string, metadata?: any) => {
    if (socketRef.current && showConversation) {
      socketRef.current.emit("canvas-event", {
        type: eventType,
        metadata: metadata || {},
        timestamp: new Date(),
      });
    }
  };

  // Send a message to the AI
  const sendMessage = () => {
    if (!newMessage.trim() || !socketRef.current) return;

    // Add user message to conversation
    setConversationMessages((prev) => [
      ...prev,
      { text: newMessage, isAI: false, timestamp: new Date() },
    ]);

    // Send to server
    socketRef.current.emit("user-message", {
      text: newMessage,
      canvasState: fabricCanvasRef.current
        ? fabricCanvasRef.current.toJSON()
        : null,
    });

    // Clear input
    setNewMessage("");
  };

  // Add AI annotation to canvas
  const addAIAnnotation = (message: string) => {
    if (!fabricCanvasRef.current || !canvasReady) return;

    // Create a simple speech bubble
    const activeObj = fabricCanvasRef.current.getActiveObject();
    if (activeObj) {
      const bubbleText = new fabric.Text(
        message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        {
          left: activeObj.left || 100,
          top: (activeObj.top || 100) - 50,
          fontSize: 12,
          fill: "#333",
          backgroundColor: "#fff",
          padding: 5,
          textAlign: "center",
        }
      );

      fabricCanvasRef.current.add(bubbleText);
      fabricCanvasRef.current.renderAll();

      // Auto-remove after 8 seconds
      setTimeout(() => {
        fabricCanvasRef.current?.remove(bubbleText);
        fabricCanvasRef.current?.renderAll();
      }, 8000);
    }
  };

  // Toggle conversation panel
  const toggleConversation = () => {
    setShowConversation(!showConversation);
  };

  // Restore startAreaSelection function
  const startAreaSelection = () => {
    if (!fabricCanvasRef.current || !canvasReady) return;

    const canvas = fabricCanvasRef.current;

    // Disable all objects to allow selection
    canvas.discardActiveObject();
    canvas.forEachObject((obj) => {
      obj.selectable = false;
    });

    // Create a selection rectangle
    const selectionRect = new fabric.Rect({
      left: 50,
      top: 50,
      width: 200,
      height: 200,
      fill: "rgba(0,0,255,0.1)",
      stroke: "blue",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: true,
      cornerColor: "blue",
    });

    canvas.add(selectionRect);
    canvas.setActiveObject(selectionRect);
    canvas.renderAll();

    setSelectionMode(true);
    setSelectedArea({
      x: 50,
      y: 50,
      width: 200,
      height: 200,
    });
  };

  // Fix analyzeCanvasWithOpenCV function with proper null checks
  const analyzeCanvasWithOpenCV = () => {
    if (!isOpenCVReady || !openCVRef.current || !fabricCanvasRef.current) {
      console.warn("OpenCV not ready or canvas not available");
      return null;
    }

    const canvas = fabricCanvasRef.current;

    try {
      const cv = openCVRef.current;

      // Get canvas data URL
      const dataURL = canvas.toDataURL({
        format: "png",
        multiplier: 1,
      });

      // Create an image from the data URL
      const img = new Image();
      img.src = dataURL;

      img.onload = () => {
        if (!canvas) return null;

        // Create an OpenCV matrix from the image
        const src = cv.imread(img);

        // Create a destination matrix
        const dst = new cv.Mat();

        // Convert to grayscale
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

        // Apply Canny edge detection
        const edges = new cv.Mat();
        cv.Canny(dst, edges, 50, 150);

        // Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(
          edges,
          contours,
          hierarchy,
          cv.RETR_EXTERNAL,
          cv.CHAIN_APPROX_SIMPLE
        );

        console.log(`Canvas analysis: found ${contours.size()} objects`);

        // Get the bounding boxes of detected objects
        const objects: Array<{
          x: number;
          y: number;
          width: number;
          height: number;
        }> = [];
        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i);
          const rect = cv.boundingRect(contour);
          objects.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          });
        }

        // Clean up
        src.delete();
        dst.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();

        // Highlight detected objects on canvas
        if (canvas) {
          objects.forEach((obj) => {
            const rect = new fabric.Rect({
              left: obj.x,
              top: obj.y,
              width: obj.width,
              height: obj.height,
              fill: "transparent",
              stroke: "#FF4500",
              strokeWidth: 2,
              strokeDashArray: [5, 5],
              selectable: false,
            });
            canvas.add(rect);
          });
          canvas.renderAll();

          // Also display a message about detected objects
          if (objects.length > 0) {
            const label = new fabric.Text(`Found ${objects.length} objects`, {
              left: 20,
              top: 20,
              fontSize: 18,
              fill: "#FF4500",
              backgroundColor: "rgba(255,255,255,0.7)",
              padding: 5,
            });
            canvas.add(label);

            // Remove the label after 3 seconds
            setTimeout(() => {
              canvas.remove(label);
              canvas.renderAll();
            }, 3000);
          }
        }

        // Return analysis results
        if (socketRef.current && showConversation) {
          socketRef.current.emit("canvas-analysis", {
            objectCount: objects.length,
            objects: objects,
          });
        }

        return objects;
      };
    } catch (error) {
      console.error("Error analyzing canvas with OpenCV:", error);
      return null;
    }
  };

  // Add a helper function to safely access the canvas
  const safeCanvas = () => {
    if (!fabricCanvasRef.current) {
      console.warn("Canvas not initialized");
      return null;
    }
    return fabricCanvasRef.current;
  };

  const addTextLabel = () => {
    if (!fabricCanvasRef.current) {
      console.warn("Canvas is not initialized");
      return;
    }

    const text = prompt("Enter your text:");
    if (!text) return;

    const label = new fabric.IText(text, {
      left: 100,
      top: 100,
      fontFamily: "Arial",
      fill: color,
      fontSize: 20,
    });

    fabricCanvasRef.current.add(label);
    fabricCanvasRef.current.renderAll();

    // Save to history
    saveToHistory();
  };

  // Add these new functions for sketch recognition and enhancement
  const recognizeAndEnhanceSketch = () => {
    if (
      !isOpenCVReady ||
      !openCVRef.current ||
      !fabricCanvasRef.current ||
      !canvasReady
    ) {
      console.warn("OpenCV not ready or canvas not available");
      return;
    }

    try {
      const cv = openCVRef.current;
      const canvas = fabricCanvasRef.current;

      // Get canvas data
      const dataURL = canvas.toDataURL({ format: "png", multiplier: 1 });

      // Create an image from data URL
      const img = new Image();
      img.src = dataURL;

      img.onload = () => {
        // Create canvas element for OpenCV processing
        const inputCanvas = document.createElement("canvas");
        inputCanvas.width = img.width;
        inputCanvas.height = img.height;
        const ctx = inputCanvas.getContext("2d");
        if (!ctx) return;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0);

        // Process with OpenCV
        const src = cv.imread(inputCanvas);
        const dst = new cv.Mat();

        // Convert to grayscale
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

        // Apply Gaussian blur to reduce noise
        const blurred = new cv.Mat();
        cv.GaussianBlur(
          dst,
          blurred,
          new cv.Size(5, 5),
          0,
          0,
          cv.BORDER_DEFAULT
        );

        // Apply Canny edge detection
        const edges = new cv.Mat();
        cv.Canny(blurred, edges, 50, 150);

        // Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(
          edges,
          contours,
          hierarchy,
          cv.RETR_EXTERNAL,
          cv.CHAIN_APPROX_SIMPLE
        );

        // Define shape type
        interface DetectedShape {
          type: string;
          contour: any; // OpenCV contour object
          rect: {
            x: number;
            y: number;
            width: number;
            height: number;
          };
        }

        // Recognize shapes
        const shapes: DetectedShape[] = [];
        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i);
          const perimeter = cv.arcLength(contour, true);
          const approx = new cv.Mat();
          cv.approxPolyDP(contour, approx, 0.04 * perimeter, true);

          // Get bounding rectangle
          const rect = cv.boundingRect(contour);

          // Determine shape based on number of vertices
          let shapeName = "unknown";
          if (approx.rows === 3) {
            shapeName = "triangle";
          } else if (approx.rows === 4) {
            // Check if it's a square or rectangle
            const aspectRatio = rect.width / rect.height;
            if (aspectRatio >= 0.95 && aspectRatio <= 1.05) {
              shapeName = "square";
            } else {
              shapeName = "rectangle";
            }
          } else if (approx.rows === 5) {
            shapeName = "pentagon";
          } else if (approx.rows === 6) {
            shapeName = "hexagon";
          } else if (approx.rows > 6) {
            // Check if it's a circle
            const area = cv.contourArea(contour);
            const radius = perimeter / (2 * Math.PI);
            const circleArea = Math.PI * radius * radius;
            if (Math.abs(area / circleArea - 1) < 0.2) {
              shapeName = "circle";
            } else {
              shapeName = "polygon";
            }
          }

          shapes.push({
            type: shapeName,
            contour: contour,
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
          });

          approx.delete();
        }

        // Clean up OpenCV resources
        src.delete();
        dst.delete();
        blurred.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();

        // Apply enhancements to canvas based on detected shapes
        enhanceShapes(shapes);
      };
    } catch (error) {
      console.error("Error in sketch recognition:", error);
    }
  };

  // Define shape interface
  interface DetectedShape {
    type: string;
    contour: any; // OpenCV contour object
    rect: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }

  // Enhance shapes with better lines and auto-coloring
  const enhanceShapes = (shapes: DetectedShape[]) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    // Define custom Fabric object with data property
    interface FabricObjectWithData extends fabric.Object {
      data?: {
        isEnhanced: boolean;
        enhancedId: string;
        originalShape: string;
      };
    }

    // Get current canvas objects to avoid duplicating
    const existingObjects = canvas.getObjects() as FabricObjectWithData[];
    const existingShapeIds = existingObjects
      .filter((obj) => obj.data && obj.data.isEnhanced)
      .map((obj) => obj.data?.enhancedId || "");

    // Process each detected shape
    shapes.forEach((shape, index) => {
      const shapeId = `enhanced-shape-${index}`;

      // Skip if already enhanced
      if (existingShapeIds.includes(shapeId)) return;

      // Create fabric object based on shape type
      let fabricShape: FabricObjectWithData;
      const { x, y, width, height } = shape.rect;

      // Color palette for auto-coloring
      const colorPalette: { [key: string]: string } = {
        triangle: "#FF6B6B",
        rectangle: "#4ECDC4",
        square: "#45B7D1",
        circle: "#FBB13C",
        pentagon: "#9055A2",
        hexagon: "#D499B9",
        polygon: "#86BBD8",
      };

      // Default color if shape type not in palette
      const fillColor = colorPalette[shape.type] || "#DDDDDD";

      switch (shape.type) {
        case "circle":
          const radius = Math.max(width, height) / 2;
          fabricShape = new fabric.Circle({
            left: x,
            top: y,
            radius: radius,
            fill: "transparent",
            stroke: fillColor,
            strokeWidth: 2,
            opacity: 0.7,
          }) as FabricObjectWithData;
          break;

        case "square":
        case "rectangle":
          fabricShape = new fabric.Rect({
            left: x,
            top: y,
            width: width,
            height: height,
            fill: "transparent",
            stroke: fillColor,
            strokeWidth: 2,
            opacity: 0.7,
          }) as FabricObjectWithData;
          break;

        case "triangle":
          // Create a simple equilateral triangle
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          const side = Math.max(width, height);

          fabricShape = new fabric.Triangle({
            left: centerX - side / 2,
            top: centerY - side / 2,
            width: side,
            height: side,
            fill: "transparent",
            stroke: fillColor,
            strokeWidth: 2,
            opacity: 0.7,
          }) as FabricObjectWithData;
          break;

        default:
          // For other polygons, create a rect as placeholder
          fabricShape = new fabric.Rect({
            left: x,
            top: y,
            width: width,
            height: height,
            fill: "transparent",
            stroke: fillColor,
            strokeWidth: 2,
            opacity: 0.7,
            strokeDashArray: [5, 5],
          }) as FabricObjectWithData;
      }

      // Add metadata
      fabricShape.data = {
        isEnhanced: true,
        enhancedId: shapeId,
        originalShape: shape.type,
      };

      // Add double-click handler for coloring
      fabricShape.on("mousedblclick", function (this: FabricObjectWithData) {
        this.set("fill", fillColor);
        canvas.renderAll();
        saveToHistory();
      });

      // Add the shape
      canvas.add(fabricShape);
    });

    canvas.renderAll();
    saveToHistory();
  };

  // Function to toggle auto-enhancement mode
  const toggleAutoEnhance = () => {
    setAutoEnhanceEnabled(!autoEnhanceEnabled);
  };

  // Add periodic sketch recognition when auto-enhance is enabled
  useEffect(() => {
    if (!autoEnhanceEnabled || !canvasReady) return;

    const recognitionInterval = setInterval(() => {
      recognizeAndEnhanceSketch();
    }, 3000); // Check every 3 seconds

    return () => {
      clearInterval(recognitionInterval);
    };
  }, [autoEnhanceEnabled, canvasReady, isOpenCVReady]);

  // Function to handle navigation back to chat
  const handleBackToChat = useCallback(() => {
    if (canvasModified) {
      if (
        confirm("You have unsaved changes. Are you sure you want to leave?")
      ) {
        navigate("/chat");
      }
    } else {
      navigate("/chat");
    }
  }, [canvasModified, navigate]);

  // Function to toggle music player
  const toggleMusicPlayer = () => {
    setShowMusicPlayer(!showMusicPlayer);
    if (!showMusicPlayer && musicVideos.length === 0) {
      fetchMusicVideos();
    }
  };

  // Function to fetch music videos from YouTube
  const fetchMusicVideos = async () => {
    try {
      setLoadingMusic(true);

      // Use YouTube API to fetch videos
      const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!API_KEY) {
        throw new Error("YouTube API key not configured");
      }

      // Construct search query based on category
      const searchQuery = `${musicCategory} music for creativity`;

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=6&q=${searchQuery}&type=video&videoEmbeddable=true&key=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const videos = data.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          channelTitle: item.snippet.channelTitle,
        }));

        setMusicVideos(videos);
      } else {
        setMusicVideos(getFallbackMusicVideos());
      }
    } catch (error) {
      console.error("Error fetching music videos:", error);
      setMusicVideos(getFallbackMusicVideos());
    } finally {
      setLoadingMusic(false);
    }
  };

  // Fallback music videos if API fails
  const getFallbackMusicVideos = () => {
    return [
      {
        id: "DWcJFNfaw9c",
        title: "Beautiful Relaxing Music for Stress Relief",
        thumbnail: "https://i.ytimg.com/vi/DWcJFNfaw9c/mqdefault.jpg",
        channelTitle: "Meditation Relaxation Music",
      },
      {
        id: "1ZYbU82GVz4",
        title: "Relaxing Music for Deep Sleep",
        thumbnail: "https://i.ytimg.com/vi/1ZYbU82GVz4/mqdefault.jpg",
        channelTitle: "Yellow Brick Cinema",
      },
      {
        id: "77ZozI0rw7w",
        title: "Relaxing Piano Music for Stress Relief",
        thumbnail: "https://i.ytimg.com/vi/77ZozI0rw7w/mqdefault.jpg",
        channelTitle: "Meditation Relaxation Music",
      },
      {
        id: "XjgwRzCwlzM",
        title: "Study Music - Improve Concentration and Focus",
        thumbnail: "https://i.ytimg.com/vi/XjgwRzCwlzM/mqdefault.jpg",
        channelTitle: "Study Music",
      },
    ];
  };

  // Function to play a music video
  const playMusicVideo = (video: any) => {
    setCurrentMusic(video);
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.loadVideoById(video.id);
      youtubePlayerRef.current.setVolume(musicVolume);
      setMusicPlaying(true);
    } else {
      initializeMusicPlayer(video.id);
    }
  };

  // Initialize YouTube player for music
  const initializeMusicPlayer = (videoId: string) => {
    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        createMusicPlayer(videoId);
      };
    } else {
      createMusicPlayer(videoId);
    }
  };

  // Create the YouTube player
  const createMusicPlayer = (videoId: string) => {
    if (musicPlayerRef.current) {
      youtubePlayerRef.current = new window.YT.Player(musicPlayerRef.current, {
        height: "0",
        width: "0",
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
        },
        events: {
          onReady: (event: any) => {
            setMusicPlayerReady(true);
            event.target.setVolume(musicVolume);
            setMusicPlaying(true);
          },
          onStateChange: (event: any) => {
            setMusicPlaying(event.data === window.YT.PlayerState.PLAYING);
          },
          onError: (event: any) => {
            console.error("YouTube player error:", event.data);
          },
        },
      });
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!youtubePlayerRef.current) return;

    if (musicPlaying) {
      youtubePlayerRef.current.pauseVideo();
    } else {
      youtubePlayerRef.current.playVideo();
    }
    setMusicPlaying(!musicPlaying);
  };

  // Change music volume
  const handleVolumeChange = (newVolume: number) => {
    setMusicVolume(newVolume);
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.setVolume(newVolume);
    }
  };

  // Change music category
  const changeMusicCategory = (category: string) => {
    setMusicCategory(category);
    setMusicVideos([]);
    fetchMusicVideos();
  };

  // Add the cleanup for YouTube player
  useEffect(() => {
    return () => {
      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        youtubePlayerRef.current.destroy();
      }
    };
  }, []);

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
      className="drawing-canvas-container"
      style={{ position: "relative", width: "100%", height: "100vh" }}
    >
      <div
        className="canvas-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px",
          background: "#f0f0f0",
          borderBottom: "1px solid #ddd",
        }}
      >
        <button
          onClick={handleBackToChat}
          style={{
            padding: "8px 16px",
            background: "#3182CE",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ← Back to Chat
        </button>

        <div style={{ display: "flex", gap: "10px" }}>
          {canvasModified && (
            <span style={{ color: "#E53E3E", fontWeight: "bold" }}>
              Unsaved Changes
            </span>
          )}
          <button
            onClick={handleSave}
            style={{
              padding: "8px 16px",
              background: "#38A169",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Save Drawing
          </button>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 50px)" }}>
        <div
          className="tools-panel"
          style={{
            width: "200px",
            background: "#f8f8f8",
            padding: "15px",
            borderRight: "1px solid #ddd",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
          }}
        >
          {/* Drawing tools */}
          <div>
            <h3
              style={{
                marginBottom: "10px",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              Drawing Tools
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {tools.map((toolItem) => (
                <button
                  key={toolItem.id}
                  onClick={() => setTool(toolItem.id as any)}
                  style={{
                    padding: "8px 12px",
                    background: toolItem.id === tool ? "#3182CE" : "#e2e8f0",
                    color: toolItem.id === tool ? "white" : "black",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {toolItem.name}
                </button>
              ))}
            </div>
          </div>

          {/* Color selection */}
          <div>
            <h3
              style={{
                marginBottom: "10px",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              Colors
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "8px",
              }}
            >
              {colors.map((colorItem) => (
                <div
                  key={colorItem}
                  onClick={() => setColor(colorItem)}
                  style={{
                    width: "25px",
                    height: "25px",
                    backgroundColor: colorItem,
                    border:
                      colorItem === color
                        ? "2px solid black"
                        : "1px solid #ddd",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Brush size */}
          <div>
            <h3
              style={{
                marginBottom: "10px",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              Brush Size
            </h3>
            <input
              type="range"
              min="1"
              max="50"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ textAlign: "center", marginTop: "5px" }}>
              {strokeWidth}
            </div>
          </div>

          {(tool === "rect" || tool === "circle") && (
            <div>
              <h3
                style={{
                  marginBottom: "10px",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Fill Color
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "8px",
                }}
              >
                {colors.map((colorItem) => (
                  <div
                    key={colorItem}
                    onClick={() => setFillColor(colorItem)}
                    style={{
                      width: "25px",
                      height: "25px",
                      backgroundColor: colorItem,
                      border:
                        colorItem === fillColor
                          ? "2px solid black"
                          : "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                marginRight: "8px",
              }}
            >
              Show Grid
            </span>
            <button
              onClick={toggleGrid}
              style={{
                width: "40px",
                height: "20px",
                position: "relative",
                background: showGrid ? "#3182CE" : "#CBD5E0",
                borderRadius: "10px",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "16px",
                  height: "16px",
                  background: "white",
                  borderRadius: "50%",
                  top: "2px",
                  left: showGrid ? "22px" : "2px",
                  transition: "left 0.2s",
                }}
              />
            </button>
          </div>
        </div>

        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          <canvas
            ref={canvasRef}
            style={{
              background: "white",
              touchAction: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DrawingCanvas;
