import * as THREE from 'three';
import { QuadTree, QuadTreeNode } from './quadtree';

export class QuadTreeVisualizer {
    private scene: THREE.Scene;
    private quadTreeMesh: THREE.Group;
    private lineColor = 0x00ff00;  // Green for quadtree boundaries
    private centerColor = 0xff0000; // Red for centers of mass
    private lineWidth = 2;
    private lastQuadTree: QuadTree | null = null;
    
    // Reusable objects
    private lineMaterial: THREE.LineBasicMaterial;
    private centerMaterial: THREE.MeshBasicMaterial;
    private centerGeometry: THREE.SphereGeometry;
    private objectPool: THREE.Object3D[] = [];

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.quadTreeMesh = new THREE.Group();
        this.scene.add(this.quadTreeMesh);

        // Create reusable materials and geometries
        this.lineMaterial = new THREE.LineBasicMaterial({ 
            color: this.lineColor,
            linewidth: this.lineWidth,
            transparent: true,
            opacity: 0.5
        });

        this.centerMaterial = new THREE.MeshBasicMaterial({ 
            color: this.centerColor,
            transparent: true,
            opacity: 0.8
        });

        this.centerGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    }

    /**
     * Get or create an object from the pool
     */
    private getFromPool(type: 'line' | 'center'): THREE.Object3D {
        const obj = this.objectPool.pop();
        if (obj) {
            obj.visible = true;
            return obj;
        }

        if (type === 'line') {
            const geometry = new THREE.BufferGeometry();
            return new THREE.LineSegments(geometry, this.lineMaterial);
        } else {
            return new THREE.Mesh(this.centerGeometry, this.centerMaterial);
        }
    }

    /**
     * Return an object to the pool
     */
    private returnToPool(obj: THREE.Object3D) {
        obj.visible = false;
        this.objectPool.push(obj);
    }

    /**
     * Visualize the QuadTree structure
     */
    visualize(quadTree: QuadTree, showCentersOfMass: boolean = true): void {
        // Hide all current objects instead of removing them
        this.quadTreeMesh.children.forEach(child => {
            this.returnToPool(child);
        });
        
        this.lastQuadTree = quadTree;
        this.visualizeNode(quadTree.root, showCentersOfMass);
    }

    /**
     * Clear the visualization
     */
    clear(): void {
        this.quadTreeMesh.children.forEach(child => {
            this.returnToPool(child);
        });
    }

    /**
     * Recursively visualize a node and its children
     */
    private visualizeNode(node: QuadTreeNode, showCentersOfMass: boolean): void {
        const boundary = node.boundary;
        const halfWidth = boundary.width / 2;

        // Get line object from pool
        const lines = this.getFromPool('line') as THREE.LineSegments;
        const geometry = lines.geometry as THREE.BufferGeometry;

        // Update vertices
        const vertices = new Float32Array([
            boundary.x - halfWidth, 0, boundary.y - halfWidth,
            boundary.x + halfWidth, 0, boundary.y - halfWidth,
            boundary.x + halfWidth, 0, boundary.y - halfWidth,
            boundary.x + halfWidth, 0, boundary.y + halfWidth,
            boundary.x + halfWidth, 0, boundary.y + halfWidth,
            boundary.x - halfWidth, 0, boundary.y + halfWidth,
            boundary.x - halfWidth, 0, boundary.y + halfWidth,
            boundary.x - halfWidth, 0, boundary.y - halfWidth,
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        this.quadTreeMesh.add(lines);

        if (showCentersOfMass && node.mass > 0) {
            const centerSphere = this.getFromPool('center') as THREE.Mesh;
            centerSphere.position.set(
                node.centerOfMass.x,
                0,
                node.centerOfMass.y
            );
            this.quadTreeMesh.add(centerSphere);
        }

        for (const child of node.children) {
            this.visualizeNode(child, showCentersOfMass);
        }
    }

    /**
     * Set the visibility of the visualization
     */
    setVisible(visible: boolean): void {
        this.quadTreeMesh.visible = visible;
    }

    /**
     * Update the visualization colors
     */
    setColors(lineColor: number, centerColor: number): void {
        this.lineColor = lineColor;
        this.centerColor = centerColor;
        // Recreate visualization with new colors
        if (this.lastQuadTree) {
            this.visualize(this.lastQuadTree);
        }
    }

    /**
     * Set line width for boundaries
     */
    setLineWidth(width: number): void {
        this.lineWidth = width;
        // Update all line materials
        this.quadTreeMesh.traverse((object) => {
            if (object instanceof THREE.LineSegments) {
                (object.material as THREE.LineBasicMaterial).linewidth = width;
            }
        });
    }

    dispose(): void {
        this.lineMaterial.dispose();
        this.centerMaterial.dispose();
        this.centerGeometry.dispose();
        this.objectPool.forEach(obj => {
            if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
            } else if (obj instanceof THREE.LineSegments) {
                obj.geometry.dispose();
            }
        });
        this.objectPool = [];
    }
} 