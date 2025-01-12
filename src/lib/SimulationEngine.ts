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

  private initializeParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.params.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        angle: Math.random() * Math.PI * 2,
        speed: this.params.moveSpeed,
        vx: Math.cos(Math.random() * Math.PI * 2) * this.params.moveSpeed,
        vy: Math.sin(Math.random() * Math.PI * 2) * this.params.moveSpeed,
        isStuck: false
      });
    }
  }

  public updateParams(newParams: SimulationParams): void {
    const oldParticleCount = this.params.particleCount;
    const newParticleCount = newParams.particleCount;
    
    // Update parameters
    this.params = { ...newParams };

    // Handle particle count changes without resetting existing particles
    if (newParticleCount > oldParticleCount) {
      // Add new particles
      for (let i = oldParticleCount; i < newParticleCount; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          angle: Math.random() * Math.PI * 2,
          speed: this.params.moveSpeed,
          vx: Math.cos(Math.random() * Math.PI * 2) * this.params.moveSpeed,
          vy: Math.sin(Math.random() * Math.PI * 2) * this.params.moveSpeed,
          isStuck: false
        });
      }
    } else if (newParticleCount < oldParticleCount) {
      // Remove excess particles, prioritizing non-stuck particles
      const particlesToRemove = oldParticleCount - newParticleCount;
      
      // First try to remove non-stuck particles
      const nonStuckIndices = this.particles
        .map((p, i) => ({ index: i, isStuck: p.isStuck }))
        .filter(p => !p.isStuck)
        .map(p => p.index)
        .reverse(); // Remove from end to avoid index shifting

      let removed = 0;
      for (const index of nonStuckIndices) {
        if (removed >= particlesToRemove) break;
        this.particles.splice(index, 1);
        removed++;
      }

      // If we still need to remove more, remove stuck particles
      if (removed < particlesToRemove) {
        this.particles.splice(-(particlesToRemove - removed));
      }
    }

    // Update speeds of existing particles
    this.particles.forEach(particle => {
      if (!particle.isStuck) {
        const currentSpeed = Math.sqrt(particle.vx! * particle.vx! + particle.vy! * particle.vy!);
        if (currentSpeed > 0) {
          const scale = this.params.moveSpeed / currentSpeed;
          particle.vx! *= scale;
          particle.vy! *= scale;
        }
        particle.speed = this.params.moveSpeed;
      }
    });
  }

  public restartParticles(): void {
    this.initializeParticles();
  }

  public spawnStickyParticle(x: number, y: number): void {
    const particle: Particle = {
      x,
      y,
      angle: 0,
      speed: 0,
      vx: 0,
      vy: 0,
      isStuck: true
    };
    this.particles.push(particle);
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
    if (particle.isStuck) return { vx: 0, vy: 0 };

    // Calculate flocking forces
    let alignmentX = 0, alignmentY = 0;
    let cohesionX = 0, cohesionY = 0;
    let separationX = 0, separationY = 0;
    let flockCount = 0;

    const gridX = Math.floor(particle.x / this.gridSize);
    const gridY = Math.floor(particle.y / this.gridSize);
    const radius = Math.ceil(this.params.perceptionRadius / this.gridSize);

    // Check for nearby stuck particles
    let hasNearbyStuck = false;

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

          // Check for sticking
          if (other.isStuck && distance < this.params.particleSize * 3) {
            hasNearbyStuck = true;
          }

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

    // Handle sticking probability
    if (hasNearbyStuck && Math.random() < this.params.stickingProbability) {
      particle.isStuck = true;
      return { vx: 0, vy: 0 };
    }

    // Handle release probability for stuck particles
    if (particle.isStuck && Math.random() < this.params.releaseProbability) {
      particle.isStuck = false;
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
      vx = (vx / speed) * this.params.moveSpeed;
      vy = (vy / speed) * this.params.moveSpeed;
    }

    return { vx, vy };
  }

  private updateParticle(particle: Particle) {
    // Skip update for stuck particles
    if (particle.isStuck) return;

    // Calculate combined forces
    const { vx, vy } = this.calculateForces(particle);
    particle.vx = vx;
    particle.vy = vy;
    particle.angle = Math.atan2(vy, vx);
    particle.speed = this.params.moveSpeed;

    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;

    // Wrap around boundaries
    particle.x = (particle.x + this.width) % this.width;
    particle.y = (particle.y + this.height) % this.height;

    // Deposit chemical with radius based on particle size
    const radius = Math.max(1, Math.floor(this.params.particleSize));
    const depositValue = this.params.chemicalDepositRate / (radius * radius);
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const px = Math.floor(particle.x + dx);
          const py = Math.floor(particle.y + dy);
          if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
            const idx = py * this.width + px;
            if (idx >= 0 && idx < this.chemicalField.length) {
              this.chemicalField[idx] = Math.min(1.0, this.chemicalField[idx] + depositValue);
            }
          }
        }
      }
    }
  }

  private sense(particle: Particle): number[] {
    const sensorAngle = this.params.sensorAngle;
    const sensorDistance = this.params.sensorDistance * this.params.particleSize;
    const sensors: number[] = [];

    for (let i = -1; i <= 1; i++) {
      const angle = particle.angle + i * sensorAngle;
      const sensorX = particle.x + Math.cos(angle) * sensorDistance;
      const sensorY = particle.y + Math.sin(angle) * sensorDistance;
      
      if (sensorX >= 0 && sensorX < this.width && sensorY >= 0 && sensorY < this.height) {
        const idx = Math.floor(sensorY) * this.width + Math.floor(sensorX);
        if (idx >= 0 && idx < this.chemicalField.length) {
          sensors.push(this.chemicalField[idx]);
        } else {
          sensors.push(0);
        }
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
      const effectiveRadius = Math.max(1, Math.floor(food.radius * this.params.particleSize));
      for (let dy = -effectiveRadius; dy <= effectiveRadius; dy++) {
        for (let dx = -effectiveRadius; dx <= effectiveRadius; dx++) {
          const distanceSquared = (dx * dx + dy * dy) / (this.params.particleSize * this.params.particleSize);
          if (distanceSquared <= radiusSquared) {
            const px = Math.floor(food.x + dx);
            const py = Math.floor(food.y + dy);
            if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
              const idx = py * this.width + px;
              if (idx >= 0 && idx < this.chemicalField.length) {
                this.chemicalField[idx] = food.strength;
              }
            }
          }
        }
      }
    });

    // Diffuse and decay with radius based on particle size
    const radius = Math.max(1, Math.floor(this.params.particleSize));
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        let sum = 0;
        let count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= radius * radius) {
              const nx = (x + dx + this.width) % this.width;
              const ny = (y + dy + this.height) % this.height;
              const nidx = ny * this.width + nx;
              if (nidx >= 0 && nidx < this.chemicalField.length) {
                sum += this.chemicalField[nidx];
                count++;
              }
            }
          }
        }

        if (count > 0) {
          newField[idx] = (sum / count) * this.params.diffusionRate + 
                         this.chemicalField[idx] * (1 - this.params.diffusionRate);
          newField[idx] *= (1 - this.params.decayRate);
        }
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