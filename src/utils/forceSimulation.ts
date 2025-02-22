import { Node, Link } from '../types/graph';

interface Vector {
  x: number;
  y: number;
}

interface ForceSimulationOptions {
  nodes: Node[];
  links: Link[];
  width: number;
  height: number;
  onTick: () => void;
}

export class ForceSimulation {
  private nodes: Node[];
  private links: Link[];
  private width: number;
  private height: number;
  private onTick: () => void;
  private velocities: Map<string, Vector>;
  private isRunning: boolean;
  private animationFrameId: number | null;

  // Force constants
  private readonly REPULSION = -3000;
  private readonly LINK_DISTANCE = 250;
  private readonly COLLISION_RADIUS = 60;
  private readonly CENTER_STRENGTH = 1;
  private readonly VELOCITY_DECAY = 0.7;

  constructor(options: ForceSimulationOptions) {
    this.nodes = options.nodes;
    this.links = options.links;
    this.width = options.width;
    this.height = options.height;
    this.onTick = options.onTick;
    this.velocities = new Map();
    this.isRunning = false;
    this.animationFrameId = null;

    // Initialize velocities
    this.nodes.forEach(node => {
      this.velocities.set(node.id, { x: 0, y: 0 });
      // Set initial positions if not set
      if (typeof node.x !== 'number') node.x = Math.random() * this.width;
      if (typeof node.y !== 'number') node.y = Math.random() * this.height;
    });
  }

  private applyRepulsiveForce(node1: Node, node2: Node): Vector {
    const dx = (node2.x || 0) - (node1.x || 0);
    const dy = (node2.y || 0) - (node1.y || 0);
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = this.REPULSION / (distance * distance);
    return {
      x: (dx / distance) * force,
      y: (dy / distance) * force
    };
  }

  private applyCenteringForce(node: Node): Vector {
    const dx = (this.width / 2) - (node.x || 0);
    const dy = (this.height / 2) - (node.y || 0);
    return {
      x: dx * this.CENTER_STRENGTH * 0.1,
      y: dy * this.CENTER_STRENGTH * 0.1
    };
  }

  private applyLinkForce(link: Link): void {
    const source = typeof link.source === 'string' ? this.nodes.find(n => n.id === link.source) : link.source;
    const target = typeof link.target === 'string' ? this.nodes.find(n => n.id === link.target) : link.target;

    if (!source || !target) return;

    const dx = (target.x || 0) - (source.x || 0);
    const dy = (target.y || 0) - (source.y || 0);
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (distance - this.LINK_DISTANCE) * 0.1;

    const sourceVel = this.velocities.get(source.id);
    const targetVel = this.velocities.get(target.id);

    if (sourceVel && targetVel) {
      sourceVel.x += (dx / distance) * force;
      sourceVel.y += (dy / distance) * force;
      targetVel.x -= (dx / distance) * force;
      targetVel.y -= (dy / distance) * force;
    }
  }

  private tick(): void {
    // Apply forces
    this.nodes.forEach(node1 => {
      const vel = this.velocities.get(node1.id);
      if (!vel) return;

      // Reset velocity
      vel.x = 0;
      vel.y = 0;

      // Apply repulsive forces
      this.nodes.forEach(node2 => {
        if (node1 !== node2) {
          const force = this.applyRepulsiveForce(node1, node2);
          vel.x += force.x;
          vel.y += force.y;
        }
      });

      // Apply centering force
      const centerForce = this.applyCenteringForce(node1);
      vel.x += centerForce.x;
      vel.y += centerForce.y;
    });

    // Apply link forces
    this.links.forEach(link => this.applyLinkForce(link));

    // Update positions
    this.nodes.forEach(node => {
      const vel = this.velocities.get(node.id);
      if (!vel) return;

      // Apply velocity decay
      vel.x *= this.VELOCITY_DECAY;
      vel.y *= this.VELOCITY_DECAY;

      // Update position
      if (typeof node.x === 'number' && typeof node.y === 'number') {
        node.x += vel.x;
        node.y += vel.y;
      }
    });

    this.onTick();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const animate = () => {
      this.tick();
      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };

    animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
} 