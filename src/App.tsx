import React, { useState, useCallback, useEffect } from 'react';
import { SimulationCanvas } from './components/SimulationCanvas';
import { Controls } from './components/Controls';
import { Toolbar } from './components/Toolbar';
import { Navbar } from './components/Navbar';
import { SimulationParams, FoodParams } from './lib/types';
import { Dialog } from './components/Dialog';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

const defaultParams: SimulationParams = {
  particleCount: 5000,
  moveSpeed: 1.0,
  turnSpeed: 0.1,
  sensorAngle: Math.PI / 4,
  sensorDistance: 10,
  diffusionRate: 0.1,
  decayRate: 0.1,
  chemicalDepositRate: 0.05,
  alignmentForce: 0.3,
  cohesionForce: 0.0,
  separationForce: 0.5,
  perceptionRadius: 30,
  fieldColor: '#808080',
  moldColor: '#000000',
  particleSize: 1,
  backgroundColor: '#ffffff',
  isPaused: false,
  stickingProbability: 1.0,
  releaseProbability: 0
};

const defaultFoodParams: FoodParams = {
  size: 15,
  strength: 1.0,
  opacity: 1.0,
  color: '#00ff00'
};

function App() {
  const [params, setParams] = useState<SimulationParams>(defaultParams);
  const [foodParams, setFoodParams] = useState<FoodParams>(defaultFoodParams);
  const [selectedTool, setSelectedTool] = useState<'attract' | 'erase' | 'pin'>('attract');
  const [restartFn, setRestartFn] = useState<(() => void) | null>(null);
  const [clearFoodFn, setClearFoodFn] = useState<(() => void) | null>(null);
  const [spawnFn, setSpawnFn] = useState<((x: number, y: number) => void) | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [isControlDrawerOpen, setIsControlDrawerOpen] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settingName, setSettingName] = useState('');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = useCallback(() => {
    if (restartFn) {
      restartFn();
    }
  }, [restartFn]);

  const handleClearFood = useCallback(() => {
    if (clearFoodFn) {
      clearFoodFn();
    }
  }, [clearFoodFn]);

  const handleSpawnStickyParticle = useCallback(() => {
    if (spawnFn && selectedTool === 'pin') {
      // Spawn in the center of the screen
      const x = window.innerWidth / 2;
      const y = (window.innerHeight - 56) / 2; // Subtract header height
      spawnFn(x, y);
    }
  }, [spawnFn, selectedTool]);

  const handleLoadSettings = useCallback(async (newParams: SimulationParams, newFoodParams: FoodParams) => {
    setParams(newParams);
    setFoodParams(newFoodParams);
    if (restartFn) {
      restartFn();
    }
  }, [restartFn]);

  const handleSave = useCallback(async (name: string) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('simulation_settings')
        .insert({
          name,
          params,
          food_params: foodParams,
          user_id: currentUser.id
        });

      if (error) throw error;
      setShowSaveDialog(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, [params, foodParams, currentUser]);

  useEffect(() => {
    // Update theme
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <Navbar
        currentParams={params}
        currentFoodParams={foodParams}
        onLoad={handleLoadSettings}
        isDark={isDark}
        onThemeToggle={() => setIsDark(!isDark)}
        isControlDrawerOpen={isControlDrawerOpen}
        onControlDrawerToggle={() => setIsControlDrawerOpen(!isControlDrawerOpen)}
      />

      <div className="absolute inset-0 pt-14">
        <SimulationCanvas
          width={window.innerWidth}
          height={window.innerHeight - 56}
          params={params}
          foodParams={foodParams}
          selectedTool={selectedTool}
          onRestart={setRestartFn}
          onClearFood={setClearFoodFn}
          onSpawn={setSpawnFn}
        />
      </div>

      {isControlDrawerOpen && (
        <div className="fixed top-14 right-0 w-80 h-[calc(100vh-3.5rem)] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg border-l border-gray-200 dark:border-gray-800 overflow-y-auto">
          <div className="p-4">
            <Controls
              params={params}
              foodParams={foodParams}
              onChange={setParams}
              onFoodParamsChange={setFoodParams}
            />
          </div>
        </div>
      )}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg p-2 border border-gray-200 dark:border-gray-800">
          <Toolbar
            selectedTool={selectedTool}
            onSelectTool={setSelectedTool}
            onClearFood={handleClearFood}
            isPaused={params.isPaused}
            onPauseToggle={() => setParams(prev => ({ ...prev, isPaused: !prev.isPaused }))}
            onReset={handleReset}
            onSave={() => setShowSaveDialog(true)}
            onLoad={handleLoadSettings}
            isAuthenticated={!!currentUser}
            onSpawnStickyParticle={handleSpawnStickyParticle}
          />
        </div>
      </div>

      <Dialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onConfirm={handleSave}
        title="Save Settings"
        description="Enter a name for your settings"
        confirmLabel="Save"
      />
    </div>
  );
}

export default App;