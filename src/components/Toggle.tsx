import React from 'react';

interface Props {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ label, checked, onChange }: Props) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-gray-300">{label}</label>
      <button
        type="button"
        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-gray-700'
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}