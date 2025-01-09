import React from 'react';
import { SettingsManager } from './SettingsManager';
import { ThemeToggle } from './ThemeToggle';
import { SimulationParams, FoodParams } from '../lib/types';
import { PanelRight } from 'lucide-react';

interface Props {
  currentParams: SimulationParams;
  currentFoodParams: FoodParams;
  onLoad: (params: SimulationParams, foodParams: FoodParams) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  isControlDrawerOpen: boolean;
  onControlDrawerToggle: () => void;
}

export function Navbar({ 
  currentParams, 
  currentFoodParams, 
  onLoad, 
  isDark, 
  onThemeToggle,
  isControlDrawerOpen,
  onControlDrawerToggle
}: Props) {
  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50">
      <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Field Conditions</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
          <SettingsManager
            currentParams={currentParams}
            currentFoodParams={currentFoodParams}
            onLoad={onLoad}
          />
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
          <button
            onClick={onControlDrawerToggle}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
            title={isControlDrawerOpen ? "Hide Controls" : "Show Controls"}
          >
            <PanelRight className={`w-5 h-5 transition-transform duration-300 ${isControlDrawerOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}