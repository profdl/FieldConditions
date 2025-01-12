export interface SimulationParams {
  particleCount: number;
  moveSpeed: number;
  turnSpeed: number;
  sensorAngle: number;
  sensorDistance: number;
  diffusionRate: number;
  decayRate: number;
  chemicalDepositRate: number;
  alignmentForce: number;
  cohesionForce: number;
  separationForce: number;
  perceptionRadius: number;
  fieldColor: string;
  moldColor: string;
  particleSize: number;
  backgroundColor: string;
  isPaused: boolean;
  stickingProbability: number;
  releaseProbability: number;
}

export interface FoodParams {
  size: number;
  strength: number;
  opacity: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  angle: number;
  speed: number;
  vx?: number;
  vy?: number;
  isStuck?: boolean;
}

export type ChemicalField = Float32Array;