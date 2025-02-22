import { QuadTreeNode, Point } from './quadtree';

export interface Force {
    fx: number;
    fy: number;
}

export interface Edge {
    source: Point;
    target: Point;
}

export class ForceCalculator {
    private theta: number = 0.5;  // Barnes-Hut threshold
    private repulsionStrength: number = 1;
    private attractionStrength: number = 0.1;

    constructor(config?: { theta?: number; repulsionStrength?: number; attractionStrength?: number; }) {
        if (config) {
            this.theta = config.theta ?? this.theta;
            this.repulsionStrength = config.repulsionStrength ?? this.repulsionStrength;
            this.attractionStrength = config.attractionStrength ?? this.attractionStrength;
        }
    }

    calculateForces(node: Point, quadNode: QuadTreeNode): Force {
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