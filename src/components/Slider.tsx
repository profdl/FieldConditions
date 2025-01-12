import React from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export function Slider({ label, value, min, max, step, onChange }: Props) {
  // Ensure value is a number and has a default
  const displayValue = typeof value === 'number' ? value : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <label className="text-gray-600 dark:text-gray-400">{label}</label>
        <span className="text-gray-500 dark:text-gray-400">{displayValue.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
      />
    </div>
  );
}