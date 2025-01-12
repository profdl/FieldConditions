import React, { useRef, useEffect, useState, forwardRef, useCallback } from 'react';
import { SimulationEngine } from '../lib/SimulationEngine';
import { SimulationParams, FoodParams } from '../lib/types';

interface Props {
  width: number;
  height: number;
  params: SimulationParams;
  foodParams: FoodParams;
  selectedTool: 'attract' | 'erase' | 'pin';
  onRestart?: (restartFn: () => void) => void;
  onClearFood?: (clearFoodFn: () => void) => void;
  onSpawn?: (spawnFn: (x: number, y: number) => void) => void;
}

export const SimulationCanvas = forwardRef<HTMLCanvasElement, Props>(
  ({ width, height, params, foodParams, selectedTool, onRestart, onClearFood, onSpawn }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<SimulationEngine | null>(null);
    const frameIdRef = useRef<number>();
    const [isDragging, setIsDragging] = useState(false);
    const [canvasDimensions, setCanvasDimensions] = useState({ width, height });
    const lastPinPositionRef = useRef<{ x: number; y: number } | null>(null);
    const paramsRef = useRef(params);

    // Initialize canvas dimensions
    useEffect(() => {
      const updateDimensions = () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight - 56; // Subtract header height
        setCanvasDimensions({ width: newWidth, height: newHeight });
        
        if (canvasRef.current) {
          canvasRef.current.width = newWidth;
          canvasRef.current.height = newHeight;
        }
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const handleRestart = useCallback(() => {
      if (engineRef.current) {
        engineRef.current.restartParticles();
      }
    }, []);

    const handleClearFood = useCallback(() => {
      if (engineRef.current) {
        engineRef.current.clearFoodSources();
      }
    }, []);

    const handleSpawnStickyParticle = useCallback((x: number, y: number) => {
      if (engineRef.current) {
        engineRef.current.spawnStickyParticle(x, y);
      }
    }, []);

    // Initialize engine only once
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || canvasDimensions.width === 0 || canvasDimensions.height === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create engine if it doesn't exist
      if (!engineRef.current) {
        engineRef.current = new SimulationEngine(canvasDimensions.width, canvasDimensions.height, params);
        paramsRef.current = params;
      }

      // Register callbacks
      if (onRestart) onRestart(handleRestart);
      if (onClearFood) onClearFood(handleClearFood);
      if (onSpawn) onSpawn(handleSpawnStickyParticle);

      return () => {
        if (frameIdRef.current) {
          cancelAnimationFrame(frameIdRef.current);
        }
      };
    }, [canvasDimensions.width, canvasDimensions.height, onRestart, onClearFood, onSpawn, handleRestart, handleClearFood, handleSpawnStickyParticle]);

    // Update engine parameters when they change
    useEffect(() => {
      if (engineRef.current && params !== paramsRef.current) {
        engineRef.current.updateParams(params);
        paramsRef.current = params;
      }
    }, [params]);

    // Main render loop
    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !engineRef.current || canvasDimensions.width === 0 || canvasDimensions.height === 0) return;

      const render = () => {
        if (!ctx || !engineRef.current) return;

        if (!params.isPaused) {
          engineRef.current.update();
        }

        const { particles, chemicalField } = engineRef.current.getState();

        // Clear canvas with background color
        ctx.fillStyle = params.backgroundColor;
        ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);

        // Draw chemical field with proper blending
        const imageData = ctx.createImageData(canvasDimensions.width, canvasDimensions.height);
        const fieldColor = hexToRgb(params.fieldColor);
        const bgColor = hexToRgb(params.backgroundColor);
        
        for (let i = 0; i < chemicalField.length; i++) {
          const value = chemicalField[i];
          const idx = i * 4;
          
          // Blend the field color with the background based on the chemical value
          imageData.data[idx] = Math.round(fieldColor.r * value + bgColor.r * (1 - value));
          imageData.data[idx + 1] = Math.round(fieldColor.g * value + bgColor.g * (1 - value));
          imageData.data[idx + 2] = Math.round(fieldColor.b * value + bgColor.b * (1 - value));
          imageData.data[idx + 3] = 255; // Full opacity
        }
        ctx.putImageData(imageData, 0, 0);

        // Draw particles
        const moldColor = hexToRgb(params.moldColor);
        particles.forEach(particle => {
          ctx.fillStyle = particle.isStuck 
            ? `rgba(${moldColor.r}, ${moldColor.g}, ${moldColor.b}, 1)` 
            : `rgba(${moldColor.r}, ${moldColor.g}, ${moldColor.b}, 0.8)`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, params.particleSize, 0, Math.PI * 2);
          ctx.fill();
        });

        frameIdRef.current = requestAnimationFrame(render);
      };

      render();

      return () => {
        if (frameIdRef.current) {
          cancelAnimationFrame(frameIdRef.current);
        }
      };
    }, [canvasDimensions.width, canvasDimensions.height, params]);

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const handleInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!engineRef.current) return;

      const coords = getCanvasCoordinates(e);
      if (!coords) return;

      const { x, y } = coords;

      if (selectedTool === 'pin') {
        // Only add a new pinned particle if we've moved far enough from the last one
        if (!lastPinPositionRef.current || 
            Math.hypot(x - lastPinPositionRef.current.x, y - lastPinPositionRef.current.y) > params.particleSize * 2) {
          engineRef.current.spawnStickyParticle(x, y);
          lastPinPositionRef.current = { x, y };
        }
      } else if (selectedTool === 'erase') {
        engineRef.current.removeFoodSourcesNear(x, y, foodParams.size);
      } else if (selectedTool === 'attract') {
        engineRef.current.addFoodSource(x, y, foodParams.size, foodParams.strength);
      }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      lastPinPositionRef.current = null;
      handleInteraction(e);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging) {
        handleInteraction(e);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      lastPinPositionRef.current = null;
    };

    const handleMouseLeave = () => {
      setIsDragging(false);
      lastPinPositionRef.current = null;
    };

    return (
      <canvas
        ref={canvasRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full"
        style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
      />
    );
  }
);