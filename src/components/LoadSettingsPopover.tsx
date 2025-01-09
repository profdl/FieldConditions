import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { SimulationParams, FoodParams } from '../lib/types';
import { Trash2 } from 'lucide-react';

interface SavedSetting {
  id: string;
  name: string;
  params: SimulationParams;
  food_params: FoodParams;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onLoad: (params: SimulationParams, foodParams: FoodParams) => void;
  onOpenChange: (isOpen: boolean) => void;
}

export function LoadSettingsPopover({ isOpen, onLoad, onOpenChange }: Props) {
  const [savedSettings, setSavedSettings] = useState<SavedSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    if (isOpen) {
      // Small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onOpenChange]);

  async function loadSavedSettings() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('simulation_settings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSettings(data || []);
    } catch (err) {
      console.error('Failed to load saved settings:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('simulation_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadSavedSettings();
    } catch (err) {
      console.error('Failed to delete settings:', err);
    }
  }

  if (!isOpen) return null;

  return (
    <div 
      ref={popoverRef}
      className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
    >
      <div className="max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-gray-600 dark:text-gray-400">Loading...</div>
        ) : savedSettings.length === 0 ? (
          <div className="p-4 text-sm text-gray-600 dark:text-gray-400">No saved settings</div>
        ) : (
          <div className="p-1">
            {savedSettings.map((setting) => (
              <div
                key={setting.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md group cursor-pointer"
                onClick={() => {
                  onLoad(setting.params, setting.food_params);
                  onOpenChange(false);
                }}
              >
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                  {setting.name}
                </span>
                <button
                  onClick={(e) => handleDelete(e, setting.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Delete settings"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}