import React, { useState, useRef } from 'react';
import { Brush, Eraser, Play, Pause, RotateCcw, Save, FolderOpen } from 'lucide-react';
import { LoadSettingsPopover } from './LoadSettingsPopover';
import { SimulationParams, FoodParams } from '../lib/types';

interface Props {
  selectedTool: 'attract' | 'erase';
  onSelectTool: (tool: 'attract' | 'erase') => void;
  onClearFood: () => void;
  isPaused: boolean;
  onPauseToggle: () => void;
  onReset: () => void;
  onSave: () => void;
  onLoad: (params: SimulationParams, foodParams: FoodParams) => void;
  isAuthenticated: boolean;
}

export function Toolbar({ 
  selectedTool, 
  onSelectTool, 
  onClearFood, 
  isPaused, 
  onPauseToggle, 
  onReset,
  onSave,
  onLoad,
  isAuthenticated 
}: Props) {
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const loadButtonRef = useRef<HTMLDivElement>(null);

  const ToolButton = ({ 
    tool, 
    icon: Icon, 
    label 
  }: { 
    tool: 'attract' | 'erase'; 
    icon: React.ElementType; 
    label: string;
  }) => (
    <button
      onClick={() => onSelectTool(tool)}
      className={`p-2 rounded-lg transition-colors ${
        selectedTool === tool 
          ? 'bg-indigo-600 dark:bg-indigo-500 text-white' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      title={label}
    >
      <Icon className="w-5 h-5" />
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPauseToggle}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={isPaused ? 'Resume' : 'Pause'}
      >
        {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
      </button>
      <button
        onClick={onReset}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Restart"
      >
        <RotateCcw className="w-5 h-5" />
      </button>
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
      <ToolButton
        tool="attract"
        icon={Brush}
        label="Draw Food"
      />
      <ToolButton
        tool="erase"
        icon={Eraser}
        label="Erase Food"
      />
      {isAuthenticated && (
        <>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
          <button
            onClick={onSave}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Save Settings"
          >
            <Save className="w-5 h-5" />
          </button>
          <div ref={loadButtonRef} className="relative">
            <button
              onClick={() => setShowLoadMenu(!showLoadMenu)}
              className={`p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                showLoadMenu ? 'bg-gray-100 dark:bg-gray-800' : ''
              }`}
              title="Load Settings"
            >
              <FolderOpen className="w-5 h-5" />
            </button>
            <LoadSettingsPopover 
              isOpen={showLoadMenu} 
              onLoad={onLoad} 
              onOpenChange={setShowLoadMenu}
            />
          </div>
        </>
      )}
    </div>
  );
}