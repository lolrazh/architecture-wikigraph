import { QuadTree, Point, Boundary } from './quadtree';

describe('QuadTree', () => {
    let boundary: Boundary;
    let quadTree: QuadTree;

    beforeEach(() => {
        // Create a 100x100 boundary centered at (0,0)
        boundary = { x: 0, y: 0, width: 100 };
        quadTree = new QuadTree(boundary);
    });

    describe('Basic Operations', () => {
        test('should create an empty quadtree', () => {
            expect(quadTree.root.node).toBeNull();
            expect(quadTree.root.isLeaf()).toBeTruthy();
        });

        test('should insert a single point', () => {
            const point: Point = { x: 0, y: 0, mass: 1 };
            quadTree.insert(point);
            expect(quadTree.root.node).toEqual(point);
            expect(quadTree.root.mass).toBe(1);
        });

        test('should handle points exactly on boundaries', () => {
            const point: Point = { x: 50, y: 50, mass: 1 };  // Right on the edge
            quadTree.insert(point);
            expect(quadTree.root.node).toEqual(point);
        });
    });

    describe('Subdivision', () => {
        test('should subdivide when second point is inserted', () => {
            const point1: Point = { x: -25, y: -25, mass: 1 };
            const point2: Point = { x: 25, y: 25, mass: 1 };
            
            quadTree.insert(point1);
            quadTree.insert(point2);

            expect(quadTree.root.isLeaf()).toBeFalsy();
            expect(quadTree.root.children.length).toBe(4);
        });

        test('should correctly distribute points to quadrants', () => {
            const points: Point[] = [
                { x: -25, y: -25, mass: 1 },  // NW
                { x: 25, y: -25, mass: 1 },   // NE
                { x: -25, y: 25, mass: 1 },   // SW
                { x: 25, y: 25, mass: 1 }     // SE
            ];

            points.forEach(point => quadTree.insert(point));

            // Each quadrant should have one point
            quadTree.root.children.forEach(child => {
                expect(child.node).not.toBeNull();
                expect(child.mass).toBe(1);
            });
        });
    });

    describe('Mass Calculations', () => {
        test('should correctly calculate center of mass', () => {
            const points: Point[] = [
                { x: -10, y: 0, mass: 1 },
                { x: 10, y: 0, mass: 1 }
            ];

            points.forEach(point => quadTree.insert(point));

            // Center of mass should be at (0,0)
            expect(quadTree.root.centerOfMass.x).toBe(0);
            expect(quadTree.root.centerOfMass.y).toBe(0);
            expect(quadTree.root.mass).toBe(2);
        });

        test('should handle uneven mass distribution', () => {
            const points: Point[] = [
                { x: -10, y: 0, mass: 1 },
                { x: 10, y: 0, mass: 3 }
            ];

            points.forEach(point => quadTree.insert(point));

            // Center of mass should be weighted toward the heavier point
            expect(quadTree.root.centerOfMass.x).toBe(5);
            expect(quadTree.root.centerOfMass.y).toBe(0);
            expect(quadTree.root.mass).toBe(4);
        });
    });

    describe('Edge Cases', () => {
        test('should handle points at exact same location', () => {
            const point1: Point = { x: 0, y: 0, mass: 1 };
            const point2: Point = { x: 0, y: 0, mass: 1 };
            
            quadTree.insert(point1);
            quadTree.insert(point2);

            // Should still subdivide but both points end up in same quadrant
            expect(quadTree.root.mass).toBe(2);
        });

        test('should respect maxDepth limit', () => {
            // Create many points at nearly the same location to force deep subdivision
            const points: Point[] = Array.from({ length: 20 }, (_, i) => ({
                x: 0.001 * i,
                y: 0.001 * i,
                mass: 1
            }));

            points.forEach(point => quadTree.insert(point));

            // Helper function to get tree depth
            const getDepth = (node: any): number => {
                if (node.isLeaf()) return 0;
                return 1 + Math.max(...node.children.map(getDepth));
            };

            expect(getDepth(quadTree.root)).toBeLessThanOrEqual(quadTree.maxDepth);
        });

        test('should handle points outside boundary', () => {
            const point: Point = { x: 1000, y: 1000, mass: 1 };
            
            // Should not throw when point is outside
            expect(() => quadTree.insert(point)).not.toThrow();
            
            // Point should not be in the tree
            expect(quadTree.root.mass).toBe(0);
        });
    });
}); 