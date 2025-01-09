import React, { useRef, useEffect, useState, forwardRef, useCallback } from 'react';
import { SimulationEngine } from '../lib/SimulationEngine';
import { SimulationParams, FoodParams } from '../lib/types';

interface Props {
  width: number;
  height: number;
  params: SimulationParams;
  foodParams: FoodParams;
  selectedTool: 'attract' | 'erase';
  onRestart?: (restartFn: () => void) => void;
  onClearFood?: (clearFoodFn: () => void) => void;
}

export const SimulationCanvas = forwardRef<HTMLCanvasElement, Props>(
  ({ width, height, params, foodParams, selectedTool, onRestart, onClearFood }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<SimulationEngine>();
    const frameIdRef = useRef<number>();
    const [isDragging, setIsDragging] = useState(false);
    const [lastX, setLastX] = useState(0);
    const [lastY, setLastY] = useState(0);
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

    // Initialize canvas dimensions
    useEffect(() => {
      const updateDimensions = () => {
        if (canvasRef.current) {
          const newWidth = window.innerWidth;
          const newHeight = window.innerHeight - 56; // Subtract header height
          setCanvasDimensions({ width: newWidth, height: newHeight });
          canvasRef.current.width = newWidth;
          canvasRef.current.height = newHeight;
          if (engineRef.current) {
            engineRef.current = new SimulationEngine(newWidth, newHeight, params);
          }
        }
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }, [params]);

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

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || canvasDimensions.width === 0 || canvasDimensions.height === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      engineRef.current = new SimulationEngine(canvasDimensions.width, canvasDimensions.height, params);

      if (onRestart) {
        onRestart(handleRestart);
      }
      if (onClearFood) {
        onClearFood(handleClearFood);
      }

      return () => {
        if (frameIdRef.current) {
          cancelAnimationFrame(frameIdRef.current);
        }
      };
    }, [canvasDimensions.width, canvasDimensions.height, onRestart, onClearFood, handleRestart, handleClearFood]);

    useEffect(() => {
      if (engineRef.current) {
        engineRef.current.updateParams(params);
      }
    }, [params]);

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
        ctx.fillStyle = `rgba(${moldColor.r}, ${moldColor.g}, ${moldColor.b}, 0.8)`;
        particles.forEach(particle => {
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

    const addFoodAtPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!engineRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      setLastX(e.clientX - rect.left);
      setLastY(e.clientY - rect.top);
      
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (selectedTool === 'erase') {
        engineRef.current.removeFoodSourcesNear(x, y, foodParams.size);
      } else {
        const strength = foodParams.strength;
        engineRef.current.addFoodSource(x, y, foodParams.size, strength);
      }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      addFoodAtPosition(e);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging) {
        addFoodAtPosition(e);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleMouseLeave = () => {
      setIsDragging(false);
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