import { QuadTreeNode, Point } from './quadtree';

export interface Force {
    fx: number;
    fy: number;
}

export interface Edge {
    source: Point;
    target: Point;
}

export interface BatchProcessingConfig {
    batchSize: number;
    concurrency: number;
}

export class ForceCalculator {
    private theta: number = 0.5;  // Barnes-Hut threshold
    private repulsionStrength: number = 1;
    private attractionStrength: number = 0.1;
    private disposed: boolean = false;
    private batchConfig: BatchProcessingConfig = {
        batchSize: 50,  // Process 50 nodes at a time
        concurrency: navigator.hardwareConcurrency || 4  // Use available CPU cores
    };

    constructor(config?: { 
        theta?: number; 
        repulsionStrength?: number; 
        attractionStrength?: number;
        batchSize?: number;
        concurrency?: number;
    }) {
        if (config) {
            this.theta = config.theta ?? this.theta;
            this.repulsionStrength = config.repulsionStrength ?? this.repulsionStrength;
            this.attractionStrength = config.attractionStrength ?? this.attractionStrength;
            if (config.batchSize) this.batchConfig.batchSize = config.batchSize;
            if (config.concurrency) this.batchConfig.concurrency = config.concurrency;
        }
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.theta = 0;
        this.repulsionStrength = 0;
        this.attractionStrength = 0;
    }

    isDisposed(): boolean {
        return this.disposed;
    }

    // Process nodes in parallel batches
    async calculateForcesParallel(nodes: Point[], quadNode: QuadTreeNode): Promise<Force[]> {
        if (this.disposed) return nodes.map(() => ({ fx: 0, fy: 0 }));

        const batches = this.createBatches(nodes);
        const results: Force[][] = await Promise.all(
            batches.map(batch => this.processBatch(batch, quadNode))
        );

        return results.flat();
    }

    private createBatches(nodes: Point[]): Point[][] {
        const batches: Point[][] = [];
        for (let i = 0; i < nodes.length; i += this.batchConfig.batchSize) {
            batches.push(nodes.slice(i, i + this.batchConfig.batchSize));
        }
        return batches;
    }

    private async processBatch(nodes: Point[], quadNode: QuadTreeNode): Promise<Force[]> {
        return nodes.map(node => this.calculateForces(node, quadNode));
    }

    calculateForces(node: Point, quadNode: QuadTreeNode): Force {
        if (this.disposed) return { fx: 0, fy: 0 };
        
        // If node has no mass, skip calculation
        if (quadNode.mass === 0) return { fx: 0, fy: 0 };

        const dx = quadNode.centerOfMass.x - node.x;
        const dy = quadNode.centerOfMass.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Handle zero distance
        if (distance === 0) return { fx: 0, fy: 0 };

        // If node is far enough or is leaf, calculate directly
        if (quadNode.isLeaf() || (quadNode.boundary.width / distance < this.theta)) {
            const force = this.repulsionStrength / (distance * distance);
            return {
                fx: -force * dx / distance,
                fy: -force * dy / distance
            };
        }

        // Otherwise, sum forces from children
        return quadNode.children.reduce((acc, child) => {
            const childForce = this.calculateForces(node, child);
            return {
                fx: acc.fx + childForce.fx,
                fy: acc.fy + childForce.fy
            };
        }, { fx: 0, fy: 0 });
    }

    calculateAttraction(edge: Edge): Force {
        if (this.disposed) return { fx: 0, fy: 0 };
        
        const dx = edge.target.x - edge.source.x;
        const dy = edge.target.y - edge.source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return { fx: 0, fy: 0 };

        // Simple linear attraction
        const force = this.attractionStrength * distance;
        return {
            fx: force * dx / distance,
            fy: force * dy / distance
        };
    }
} 