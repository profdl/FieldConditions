import { SimulationParams, Particle, ChemicalField } from './types';

export class SimulationEngine {
  private particles: Particle[] = [];
  private chemicalField: ChemicalField;
  private width: number;
  private height: number;
  private params: SimulationParams;
  private foodSources: Array<{ x: number; y: number; radius: number; strength: number }> = [];
  private grid: Map<string, Particle[]> = new Map();
  private gridSize = 10;

  constructor(width: number, height: number, params: SimulationParams) {
    this.width = width;
    this.height = height;
    this.params = params;
    this.chemicalField = new Float32Array(width * height);
    this.initializeParticles();
  }

  public updateParams(newParams: SimulationParams): void {
    const oldCount = this.params.particleCount;
    this.params = newParams;

    // Reinitialize particles if count changed
    if (oldCount !== newParams.particleCount) {
      this.initializeParticles();
    }

    // Update particle speeds
    this.particles.forEach(particle => {
      particle.speed = newParams.moveSpeed;
    });
  }

  private initializeParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.params.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        angle: Math.random() * Math.PI * 2,
        speed: this.params.moveSpeed,
        vx: Math.cos(Math.random() * Math.PI * 2) * this.params.moveSpeed,
        vy: Math.sin(Math.random() * Math.PI * 2) * this.params.moveSpeed
      });
    }
  }

  public restartParticles(): void {
    this.initializeParticles();
  }

  private updateGrid() {
    this.grid.clear();
    this.particles.forEach(particle => {
      const gridX = Math.floor(particle.x / this.gridSize);
      const gridY = Math.floor(particle.y / this.gridSize);
      const key = `${gridX},${gridY}`;
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key)!.push(particle);
    });
  }

  private calculateForces(particle: Particle) {
    // Calculate flocking forces
    let alignmentX = 0, alignmentY = 0;
    let cohesionX = 0, cohesionY = 0;
    let separationX = 0, separationY = 0;
    let flockCount = 0;

    const gridX = Math.floor(particle.x / this.gridSize);
    const gridY = Math.floor(particle.y / this.gridSize);
    const radius = Math.ceil(this.params.perceptionRadius / this.gridSize);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const cellParticles = this.grid.get(key);
        if (!cellParticles) continue;

        cellParticles.forEach(other => {
          if (other === particle) return;

          const dx = other.x - particle.x;
          const dy = other.y - particle.y;
          const distanceSquared = dx * dx + dy * dy;
          const distance = Math.sqrt(distanceSquared);

          if (distance < this.params.perceptionRadius) {
            // Alignment and Cohesion
            alignmentX += other.vx!;
            alignmentY += other.vy!;
            cohesionX += other.x;
            cohesionY += other.y;
            
            // Separation with smooth falloff
            if (distance > 0) {
              const force = Math.exp(-distance / (this.params.perceptionRadius * 0.25));
              separationX -= (dx / distance) * force;
              separationY -= (dy / distance) * force;
            }
            
            flockCount++;
          }
        });
      }
    }

    // Calculate chemical sensing forces
    const sensors = this.sense(particle);
    const [leftSensor, centerSensor, rightSensor] = sensors;
    const maxSignal = Math.max(leftSensor, centerSensor, rightSensor);
    
    let chemicalVx = particle.vx!;
    let chemicalVy = particle.vy!;

    if (maxSignal > 0) {
      if (centerSensor > leftSensor && centerSensor > rightSensor) {
        // Continue current direction with boost
        const boost = 1 + centerSensor * 0.5;
        chemicalVx *= boost;
        chemicalVy *= boost;
      } else if (leftSensor > rightSensor) {
        // Turn left
        const angle = particle.angle - this.params.turnSpeed;
        chemicalVx = Math.cos(angle) * particle.speed;
        chemicalVy = Math.sin(angle) * particle.speed;
      } else {
        // Turn right
        const angle = particle.angle + this.params.turnSpeed;
        chemicalVx = Math.cos(angle) * particle.speed;
        chemicalVy = Math.sin(angle) * particle.speed;
      }
    } else {
      // Random walk
      const randomAngle = (Math.random() - 0.5) * this.params.turnSpeed;
      const angle = particle.angle + randomAngle;
      chemicalVx = Math.cos(angle) * particle.speed;
      chemicalVy = Math.sin(angle) * particle.speed;
    }

    // Combine forces
    let vx = chemicalVx;
    let vy = chemicalVy;

    if (flockCount > 0) {
      // Normalize and apply flocking forces
      alignmentX = (alignmentX / flockCount) * this.params.alignmentForce;
      alignmentY = (alignmentY / flockCount) * this.params.alignmentForce;

      cohesionX = ((cohesionX / flockCount - particle.x) / this.params.perceptionRadius) * this.params.cohesionForce;
      cohesionY = ((cohesionY / flockCount - particle.y) / this.params.perceptionRadius) * this.params.cohesionForce;

      separationX *= this.params.separationForce / flockCount;
      separationY *= this.params.separationForce / flockCount;

      // Blend flocking with chemical behavior
      vx = chemicalVx * 0.6 + (alignmentX + cohesionX + separationX) * 0.4;
      vy = chemicalVy * 0.6 + (alignmentY + cohesionY + separationY) * 0.4;
    }

    // Normalize final velocity
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > 0) {
      vx = (vx / speed) * particle.speed;
      vy = (vy / speed) * particle.speed;
    }

    return { vx, vy };
  }

  private updateParticle(particle: Particle) {
    // Calculate combined forces
    const { vx, vy } = this.calculateForces(particle);
    particle.vx = vx;
    particle.vy = vy;
    particle.angle = Math.atan2(vy, vx);

    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Wrap around boundaries
    particle.x = (particle.x + this.width) % this.width;
    particle.y = (particle.y + this.height) % this.height;

    // Deposit chemical
    const idx = Math.floor(particle.y) * this.width + Math.floor(particle.x);
    this.chemicalField[idx] = Math.min(1.0, this.chemicalField[idx] + this.params.chemicalDepositRate);
  }

  private sense(particle: Particle): number[] {
    const sensorAngle = this.params.sensorAngle;
    const sensorDistance = this.params.sensorDistance;
    const sensors: number[] = [];

    for (let i = -1; i <= 1; i++) {
      const angle = particle.angle + i * sensorAngle;
      const sensorX = particle.x + Math.cos(angle) * sensorDistance;
      const sensorY = particle.y + Math.sin(angle) * sensorDistance;
      
      if (sensorX >= 0 && sensorX < this.width && sensorY >= 0 && sensorY < this.height) {
        sensors.push(this.chemicalField[Math.floor(sensorY) * this.width + Math.floor(sensorX)]);
      } else {
        sensors.push(0);
      }
    }

    return sensors;
  }

  public update() {
    this.updateGrid();
    this.particles.forEach(particle => this.updateParticle(particle));
    this.diffuseChemicals();
  }

  private diffuseChemicals() {
    const newField = new Float32Array(this.width * this.height);

    // Apply food sources
    this.foodSources.forEach(food => {
      const radiusSquared = food.radius * food.radius;
      for (let dy = -food.radius; dy <= food.radius; dy++) {
        for (let dx = -food.radius; dx <= food.radius; dx++) {
          if (dx * dx + dy * dy <= radiusSquared) {
            const px = Math.floor(food.x + dx);
            const py = Math.floor(food.y + dy);
            if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
              const idx = py * this.width + px;
              this.chemicalField[idx] = food.strength;
            }
          }
        }
      }
    });

    // Diffuse and decay
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        let sum = 0;
        let count = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = (x + dx + this.width) % this.width;
            const ny = (y + dy + this.height) % this.height;
            sum += this.chemicalField[ny * this.width + nx];
            count++;
          }
        }

        newField[idx] = (sum / count) * this.params.diffusionRate + 
                       this.chemicalField[idx] * (1 - this.params.diffusionRate);
        newField[idx] *= (1 - this.params.decayRate);
      }
    }

    this.chemicalField = newField;
  }

  public getState() {
    return {
      particles: this.particles,
      chemicalField: this.chemicalField
    };
  }

  public addFoodSource(x: number, y: number, radius: number, strength: number = 1.0) {
    this.foodSources.push({ x, y, radius, strength });
  }

  public removeFoodSourcesNear(x: number, y: number, radius: number): void {
    const radiusSquared = radius * radius;
    this.foodSources = this.foodSources.filter(food => {
      const dx = food.x - x;
      const dy = food.y - y;
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared > radiusSquared;
    });
  }

  public clearFoodSources(): void {
    this.foodSources = [];
    this.chemicalField = new Float32Array(this.width * this.height);
  }

  public getFoodSources() {
    return this.foodSources;
  }
}