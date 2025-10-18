"use client";

import { useEffect, useRef, useState } from "react";
import TinderCard from "react-tinder-card";
import {
  getRandomTopic,
  getNews,
  getNextTopicWithFeedback,
  type Topic,
} from "../api/manageQLogic";

interface Dot {
  id: number;
  x: number;
  y: number;
  color: string;
  pairId: number;
}

interface Line {
  pairId: number;
  cells: [number, number][];
  color: string;
}

const GRID_SIZE = 6;
const CELL_SIZE = 50;
const PADDING = 40;
const DOT_RADIUS = 8;

const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

// PREDEFINED DOTS AND SOLUTIONS
export const PREDEFINED_DOTS: Dot[][] = [
  // Map 0
  [
    { id: 0, x: 0, y: 0, color: COLORS[0], pairId: 0 },
    { id: 1, x: 0, y: 5, color: COLORS[0], pairId: 0 },
    { id: 2, x: 1, y: 0, color: COLORS[1], pairId: 1 },
    { id: 3, x: 1, y: 5, color: COLORS[1], pairId: 1 },
    { id: 4, x: 2, y: 0, color: COLORS[2], pairId: 2 },
    { id: 5, x: 2, y: 5, color: COLORS[2], pairId: 2 },
    { id: 6, x: 3, y: 0, color: COLORS[3], pairId: 3 },
    { id: 7, x: 3, y: 5, color: COLORS[3], pairId: 3 },
    { id: 8, x: 4, y: 0, color: COLORS[4], pairId: 4 },
    { id: 9, x: 4, y: 5, color: COLORS[4], pairId: 4 },
  ],
  // Map 1
  [
    { id: 0, x: 0, y: 0, color: COLORS[0], pairId: 0 },
    { id: 1, x: 5, y: 0, color: COLORS[0], pairId: 0 },
    { id: 2, x: 0, y: 1, color: COLORS[1], pairId: 1 },
    { id: 3, x: 5, y: 1, color: COLORS[1], pairId: 1 },
    { id: 4, x: 0, y: 2, color: COLORS[2], pairId: 2 },
    { id: 5, x: 5, y: 2, color: COLORS[2], pairId: 2 },
    { id: 6, x: 0, y: 3, color: COLORS[3], pairId: 3 },
    { id: 7, x: 5, y: 3, color: COLORS[3], pairId: 3 },
    { id: 8, x: 0, y: 4, color: COLORS[4], pairId: 4 },
    { id: 9, x: 5, y: 4, color: COLORS[4], pairId: 4 },
  ],
];

export const MAP_SOLUTIONS = [
  "Map 0: Red↓, Blue↓, Green↓, Yellow↓, Purple wraps column 4→5",
  "Map 1: Red→, Blue→, Green→, Yellow→, Purple wraps row 4→5",
];

export default function FlowFreeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dots, setDots] = useState<Dot[]>([]);
  const [lines, setLines] = useState<Map<number, Line>>(new Map());
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPairId, setCurrentPairId] = useState<number | null>(null);
  const [currentPath, setCurrentPath] = useState<[number, number][]>([]);
  const [gameWon, setGameWon] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentMapIndex, setCurrentMapIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showSwipeCard, setShowSwipeCard] = useState(false);
  const [currTopic, setCurrTopic] = useState("");
  const [news, setNews] = useState("");

  const initializeGame = (mapIndex?: number) => {
    const idx =
      mapIndex !== undefined
        ? mapIndex
        : Math.floor(Math.random() * PREDEFINED_DOTS.length);
    setCurrentMapIndex(idx);
    setDots(PREDEFINED_DOTS[idx]);
    setLines(new Map());
    setCurrentPath([]);
    setGameWon(false);
    setGameStarted(true);
    setShowHint(false);
    setShowSwipeCard(false);
  };

  const fetchNews = async () => {
    const title = await getNews(currTopic);
    setNews(title);
  };

  useEffect(() => {
    const topic = getRandomTopic();
    setCurrTopic(topic);
    fetchNews();
  }, []);

  const getCellFromMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - PADDING;
    const y = e.clientY - rect.top - PADDING;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    if (col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE)
      return [col, row] as [number, number];
    return null;
  };

  const getDotAtCell = (col: number, row: number) =>
    dots.find((d) => d.x === col && d.y === row);

  const isCellOccupiedByOtherLine = (
    col: number,
    row: number,
    excludePairId: number
  ) => {
    for (const line of lines.values()) {
      if (line.pairId === excludePairId) continue;
      if (line.cells.some(([c, r]) => c === col && r === row)) {
        return true;
      }
    }
    return false;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameStarted || gameWon) return;
    const cell = getCellFromMouse(e);
    if (!cell) return;
    const dot = getDotAtCell(cell[0], cell[1]);
    if (!dot) return;

    const existingLine = lines.get(dot.pairId);
    if (existingLine) {
      lines.delete(dot.pairId);
      setLines(new Map(lines));
    }

    setIsDrawing(true);
    setCurrentPairId(dot.pairId);
    setCurrentPath([cell]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentPairId === null) return;
    const cell = getCellFromMouse(e);
    if (!cell) return;

    const lastCell = currentPath[currentPath.length - 1];
    const isAdjacent =
      (Math.abs(cell[0] - lastCell[0]) === 1 && cell[1] === lastCell[1]) ||
      (Math.abs(cell[1] - lastCell[1]) === 1 && cell[0] === lastCell[0]);

    if (!isAdjacent) return;

    const indexInPath = currentPath.findIndex(
      ([c, r]) => c === cell[0] && r === cell[1]
    );
    if (indexInPath >= 0) {
      setCurrentPath(currentPath.slice(0, indexInPath + 1));
      return;
    }

    if (isCellOccupiedByOtherLine(cell[0], cell[1], currentPairId)) {
      return;
    }

    const dot = getDotAtCell(cell[0], cell[1]);
    if (dot && dot.pairId !== currentPairId) {
      return;
    }

    setCurrentPath([...currentPath, cell]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentPairId === null) return;
    setIsDrawing(false);

    if (currentPath.length < 2) {
      setCurrentPath([]);
      setCurrentPairId(null);
      return;
    }

    const endCell = currentPath[currentPath.length - 1];
    const endDot = getDotAtCell(endCell[0], endCell[1]);
    const startCell = currentPath[0];
    const startDot = getDotAtCell(startCell[0], startCell[1]);

    if (
      endDot &&
      startDot &&
      endDot.pairId === currentPairId &&
      startDot.pairId === currentPairId &&
      endDot.id !== startDot.id
    ) {
      const newLines = new Map(lines);
      newLines.set(currentPairId, {
        pairId: currentPairId,
        cells: currentPath,
        color: dots.find((d) => d.pairId === currentPairId)?.color || "#000",
      });
      setLines(newLines);

      const totalCells = GRID_SIZE * GRID_SIZE;
      const filledCells = Array.from(newLines.values()).reduce(
        (sum, l) => sum + l.cells.length,
        0
      );

      if (filledCells === totalCells && newLines.size === dots.length / 2) {
        setGameWon(true);
        setShowSwipeCard(true); // Show swipe card when game is won
      }
    }

    setCurrentPath([]);
    setCurrentPairId(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = GRID_SIZE * CELL_SIZE + PADDING * 2;
    canvas.height = GRID_SIZE * CELL_SIZE + PADDING * 2;

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        ctx.strokeRect(
          PADDING + c * CELL_SIZE,
          PADDING + r * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }

    for (const line of lines.values()) {
      ctx.fillStyle = line.color;
      ctx.globalAlpha = 0.4;
      line.cells.forEach(([c, r]) =>
        ctx.fillRect(
          PADDING + c * CELL_SIZE + 2,
          PADDING + r * CELL_SIZE + 2,
          CELL_SIZE - 4,
          CELL_SIZE - 4
        )
      );
      ctx.globalAlpha = 1;
    }

    if (currentPath.length > 0) {
      const color =
        dots.find((d) => d.pairId === currentPairId)?.color || "#000";
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4;
      currentPath.forEach(([c, r]) =>
        ctx.fillRect(
          PADDING + c * CELL_SIZE + 2,
          PADDING + r * CELL_SIZE + 2,
          CELL_SIZE - 4,
          CELL_SIZE - 4
        )
      );
      ctx.globalAlpha = 1;
    }

    dots.forEach((dot) => {
      const x = PADDING + dot.x * CELL_SIZE + CELL_SIZE / 2;
      const y = PADDING + dot.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.fillStyle = dot.color;
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [dots, lines, currentPath, currentPairId]);

  const handleSwipe = async (direction: string) => {
    console.log("Swiped", direction);
    setShowSwipeCard(false);
    const topic = await getNextTopicWithFeedback(
      currTopic as Topic,
      direction === "left"
    );
    initializeGame(); // Load next map
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="flex flex-col items-center gap-6 p-8 relative w-full max-w-md">
        {!showSwipeCard ? (
          <>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2">Flow Free</h1>
              <p className="text-gray-400">
                {gameWon
                  ? "🎉 Perfect! All 36 cells filled!"
                  : gameStarted
                  ? "Connect matching dots - lines cannot overlap!"
                  : "Click Start to begin"}
              </p>
            </div>

            <canvas
              ref={canvasRef}
              className="border-2 border-gray-700 rounded-lg shadow-2xl cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />

            <div className="flex gap-3 flex-wrap justify-center">
              <button
                onClick={() => initializeGame()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {gameStarted ? "Random Map" : "Start Game"}
              </button>
              <button
                onClick={() => setLines(new Map())}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Clear Lines
              </button>
              <button
                onClick={() => setShowHint(!showHint)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                {showHint ? "Hide Hint" : "Show Hint"}
              </button>
            </div>

            {gameStarted && (
              <div className="text-center space-y-2">
                <div className="text-gray-300">
                  Map {currentMapIndex + 1} of {PREDEFINED_DOTS.length}
                </div>
                <div className="flex gap-6 text-sm text-gray-400">
                  <span>
                    Pairs: {lines.size}/{dots.length / 2}
                  </span>
                  <span>
                    Cells:{" "}
                    {Array.from(lines.values()).reduce(
                      (sum, l) => sum + l.cells.length,
                      0
                    )}
                    /{GRID_SIZE * GRID_SIZE}
                  </span>
                </div>
                {showHint && (
                  <div className="mt-3 p-3 bg-purple-900/30 rounded-lg text-purple-300 text-sm max-w-md">
                    💡 {MAP_SOLUTIONS[currentMapIndex]}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-[400px] flex items-center justify-center">
            <TinderCard
              onSwipe={handleSwipe}
              preventSwipe={["up", "down"]}
              className="w-full h-full"
            >
              <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center justify-center h-full text-center">
                <h2 className="text-2xl font-bold mb-2">Swipe Me! 🎉</h2>
                <p className="text-gray-700 mb-4">
                  You solved the map! Swipe left or right to continue.
                </p>
              </div>
            </TinderCard>
          </div>
        )}
      </div>
    </div>
  );
}
