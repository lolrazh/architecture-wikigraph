/**
 * QuadTree implementation for Barnes-Hut algorithm
 * Used for optimizing force-directed graph layout
 */

export interface Point {
    x: number;
    y: number;
    mass: number;
}

export interface Boundary {
    x: number;      // center x
    y: number;      // center y
    width: number;  // width of region
}

export class QuadTreeNode {
    boundary: Boundary;
    node: Point | null = null;
    mass: number = 0;
    centerOfMass: Point = { x: 0, y: 0, mass: 0 };
    children: QuadTreeNode[] = [];
    
    constructor(boundary: Boundary) {
        this.boundary = boundary;
    }

    /**
     * Check if point is within this quad's boundary
     * Now includes points exactly on the boundary
     */
    contains(point: Point): boolean {
        return point.x >= this.boundary.x - this.boundary.width / 2 &&
               point.x <= this.boundary.x + this.boundary.width / 2 &&  // Changed < to <=
               point.y >= this.boundary.y - this.boundary.width / 2 &&
               point.y <= this.boundary.y + this.boundary.width / 2;    // Changed < to <=
    }

    /**
     * Check if this node is a leaf (has no children)
     */
    isLeaf(): boolean {
        return this.children.length === 0;
    }
}

export class QuadTree {
    root: QuadTreeNode;
    maxDepth: number = 10;
    minSize: number = 1;
    totalPoints: number = 0;
    private needsMassUpdate: boolean = false;

    constructor(boundary: Boundary) {
        this.root = new QuadTreeNode(boundary);
    }

    /**
     * Clear all points and reset the tree
     */
    dispose(): void {
        this.root = new QuadTreeNode(this.root.boundary);
        this.totalPoints = 0;
        this.needsMassUpdate = false;
    }

    /**
     * Insert multiple points at once
     */
    insertBatch(points: Point[]): void {
        points.forEach(point => {
            if (this.root.contains(point)) {
                this._insert(this.root, point, 0);
                this.totalPoints++;
            }
        });
        
        // Update mass only once after all insertions
        this._updateMassAndCenter(this.root);
    }

    /**
     * Insert a single point into the QuadTree
     */
    insert(point: Point): boolean {
        if (!this.root.contains(point)) {
            return false;
        }
        
        this._insert(this.root, point, 0);
        this.needsMassUpdate = true;
        this.totalPoints++;
        return true;
    }

    /**
     * Update mass calculations if needed
     */
    updateMassIfNeeded(): void {
        if (this.needsMassUpdate) {
            this._updateMassAndCenter(this.root);
            this.needsMassUpdate = false;
        }
    }

    private _insert(node: QuadTreeNode, point: Point, depth: number): void {
        // Don't subdivide beyond maxDepth or minSize
        if (depth >= this.maxDepth || node.boundary.width <= this.minSize) {
            // If we hit the limit, just update the node's mass and center
            if (node.node === null) {
                node.node = point;
            } else {
                // Merge points if we can't subdivide further
                node.mass = node.node.mass + point.mass;
                node.centerOfMass = {
                    x: (node.node.x * node.node.mass + point.x * point.mass) / node.mass,
                    y: (node.node.y * node.node.mass + point.y * point.mass) / node.mass,
                    mass: node.mass
                };
            }
            return;
        }

        // If node is empty, just insert the point
        if (!node.node && node.isLeaf()) {
            node.node = point;
            return;
        }

        // If this is a leaf node with a point, subdivide it
        if (node.isLeaf() && node.node) {
            this._subdivide(node);
            // Move the existing point to appropriate child
            const existingPoint = node.node;
            node.node = null;
            this._insertIntoChildren(node, existingPoint);
        }

        // Insert the new point into appropriate child
        this._insertIntoChildren(node, point);
    }

    /**
     * Subdivide a node into four quadrants
     */
    private _subdivide(node: QuadTreeNode): void {
        const halfWidth = node.boundary.width / 2;
        const quarterWidth = halfWidth / 2;
        const x = node.boundary.x;
        const y = node.boundary.y;

        // Create four children with slightly overlapping boundaries
        // This helps with edge cases where points are exactly on boundaries
        const overlap = 0.0001; // Small overlap to handle floating point precision
        node.children = [
            // Northwest
            new QuadTreeNode({
                x: x - quarterWidth,
                y: y - quarterWidth,
                width: halfWidth + overlap
            }),
            // Northeast
            new QuadTreeNode({
                x: x + quarterWidth,
                y: y - quarterWidth,
                width: halfWidth + overlap
            }),
            // Southwest
            new QuadTreeNode({
                x: x - quarterWidth,
                y: y + quarterWidth,
                width: halfWidth + overlap
            }),
            // Southeast
            new QuadTreeNode({
                x: x + quarterWidth,
                y: y + quarterWidth,
                width: halfWidth + overlap
            })
        ];
    }

    /**
     * Insert a point into the appropriate child node
     * Now handles the case where a point might not fit in any child
     */
    private _insertIntoChildren(node: QuadTreeNode, point: Point): void {
        let inserted = false;
        for (const child of node.children) {
            if (child.contains(point)) {
                this._insert(child, point, 0);
                inserted = true;
                break;
            }
        }

        // If point couldn't be inserted in any child (edge case),
        // force it into the nearest quadrant
        if (!inserted) {
            const nearestChild = this._findNearestChild(node, point);
            this._insert(nearestChild, point, 0);
        }
    }

    /**
     * Find the nearest child node to a point
     */
    private _findNearestChild(node: QuadTreeNode, point: Point): QuadTreeNode {
        let minDist = Infinity;
        let nearest = node.children[0];

        for (const child of node.children) {
            const dx = child.boundary.x - point.x;
            const dy = child.boundary.y - point.y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                nearest = child;
            }
        }

        return nearest;
    }

    /**
     * Update mass and center of mass for a node and its children
     */
    private _updateMassAndCenter(node: QuadTreeNode): void {
        if (node.isLeaf()) {
            if (node.node) {
                node.mass = node.node.mass;
                node.centerOfMass = { ...node.node };
            } else {
                node.mass = 0;
                node.centerOfMass = { x: 0, y: 0, mass: 0 };
            }
            return;
        }

        node.mass = 0;
        let weightedX = 0;
        let weightedY = 0;

        for (const child of node.children) {
            this._updateMassAndCenter(child);
            node.mass += child.mass;
            weightedX += child.centerOfMass.x * child.mass;
            weightedY += child.centerOfMass.y * child.mass;
        }

        if (node.mass > 0) {
            node.centerOfMass = {
                x: weightedX / node.mass,
                y: weightedY / node.mass,
                mass: node.mass
            };
        }
    }
} 