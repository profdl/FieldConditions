import React from 'react';
import { SimulationParams, FoodParams } from '../lib/types';
import { Slider } from './Slider';
import { AccordionItem } from './Accordion';

interface Props {
  params: SimulationParams;
  foodParams: FoodParams;
  onChange: (params: SimulationParams) => void;
  onFoodParamsChange: (params: FoodParams) => void;
}

export function Controls({ params, foodParams, onChange, onFoodParamsChange }: Props) {
  const handleChange = (key: keyof SimulationParams) => (value: number | boolean | string) => {
    onChange({ ...params, [key]: value });
  };

  const handleFoodParamChange = (key: keyof FoodParams) => (value: number | boolean | string) => {
    onFoodParamsChange({ ...foodParams, [key]: value });
  };

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-600 dark:text-gray-400">{label}</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer bg-transparent"
          />
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{value}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">Simulation Controls</h3>
        <Slider
          label="Particle Count"
          value={params.particleCount}
          min={0}
          max={10000}
          step={50}
          onChange={handleChange('particleCount')}
        />
        <Slider
          label="Move Speed"
          value={params.moveSpeed}
          min={0}
          max={3.0}
          step={0.05}
          onChange={handleChange('moveSpeed')}
        />
      </div>

      <AccordionItem title="Appearance">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs text-gray-600 dark:text-gray-400">Colors</h4>
            <ColorPicker
              label="Background Color"
              value={params.backgroundColor}
              onChange={handleChange('backgroundColor')}
            />
            <ColorPicker
              label="Particle Color"
              value={params.moldColor}
              onChange={handleChange('moldColor')}
            />
            <ColorPicker
              label="Trail Color"
              value={params.fieldColor}
              onChange={handleChange('fieldColor')}
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-xs text-gray-600 dark:text-gray-400">Particles</h4>
            <Slider
              label="Particle Size"
              value={params.particleSize}
              min={0.5}
              max={5}
              step={0.1}
              onChange={handleChange('particleSize')}
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-xs text-gray-600 dark:text-gray-400">Trails</h4>
            <Slider
              label="Chemical Deposit"
              value={params.chemicalDepositRate}
              min={0}
              max={0.2}
              step={0.005}
              onChange={handleChange('chemicalDepositRate')}
            />
            <Slider
              label="Diffusion Rate"
              value={params.diffusionRate}
              min={0}
              max={0.5}
              step={0.005}
              onChange={handleChange('diffusionRate')}
            />
            <Slider
              label="Decay Rate"
              value={params.decayRate}
              min={0}
              max={0.5}
              step={0.005}
              onChange={handleChange('decayRate')}
            />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="Chemical Behavior">
        <div className="space-y-2">
          <Slider
            label="Turn Speed"
            value={params.turnSpeed}
            min={0}
            max={0.5}
            step={0.005}
            onChange={handleChange('turnSpeed')}
          />
          <Slider
            label="Sensor Angle"
            value={params.sensorAngle}
            min={0}
            max={Math.PI}
            step={0.05}
            onChange={handleChange('sensorAngle')}
          />
          <Slider
            label="Sensor Distance"
            value={params.sensorDistance}
            min={0}
            max={50}
            step={0.5}
            onChange={handleChange('sensorDistance')}
          />
        </div>
      </AccordionItem>

      <AccordionItem title="Flocking Forces">
        <div className="space-y-2">
          <Slider
            label="Alignment"
            value={params.alignmentForce}
            min={0}
            max={1}
            step={0.05}
            onChange={handleChange('alignmentForce')}
          />
          <Slider
            label="Cohesion"
            value={params.cohesionForce}
            min={0}
            max={1}
            step={0.05}
            onChange={handleChange('cohesionForce')}
          />
          <Slider
            label="Separation"
            value={params.separationForce}
            min={0}
            max={2}
            step={0.05}
            onChange={handleChange('separationForce')}
          />
          <Slider
            label="Perception Radius"
            value={params.perceptionRadius}
            min={0}
            max={100}
            step={1}
            onChange={handleChange('perceptionRadius')}
          />
        </div>
      </AccordionItem>

      <AccordionItem title="DLA Behavior">
        <div className="space-y-2">
          <Slider
            label="Sticking Probability"
            value={params.stickingProbability}
            min={0}
            max={1}
            step={0.01}
            onChange={handleChange('stickingProbability')}
          />
          <Slider
            label="Release Probability"
            value={params.releaseProbability}
            min={0}
            max={1}
            step={0.01}
            onChange={handleChange('releaseProbability')}
          />
        </div>
      </AccordionItem>

      <AccordionItem title="Food Settings">
        <div className="space-y-2">
          <Slider
            label="Size"
            value={foodParams.size}
            min={0}
            max={50}
            step={0.5}
            onChange={handleFoodParamChange('size')}
          />
          <Slider
            label="Strength"
            value={foodParams.strength}
            min={-5}
            max={5}
            step={0.05}
            onChange={handleFoodParamChange('strength')}
          />
          <Slider
            label="Opacity"
            value={foodParams.opacity}
            min={0}
            max={1}
            step={0.01}
            onChange={handleFoodParamChange('opacity')}
          />
          <ColorPicker
            label="Color"
            value={foodParams.color}
            onChange={handleFoodParamChange('color')}
          />
        </div>
      </AccordionItem>
    </div>
  );
}