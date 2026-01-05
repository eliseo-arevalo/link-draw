import { describe, it, expect } from 'vitest';
import { buildLinkGraph, detectCycle } from './graph-algorithms';
import type { DrawingLink } from "@/shared/types/drawing";

// Mock DrawingLink since it's just an interface
const createMockLink = (targetDrawingId: string): DrawingLink => ({
  elementId: 'mock-element',
  targetDrawingId,
  targetType: 'drawing'
});

describe('graph-algorithms', () => {
  describe('buildLinkGraph', () => {
    it('should build a graph from links map', () => {
      const linksMap = new Map<string, DrawingLink[]>();
      linksMap.set('A', [createMockLink('B'), createMockLink('C')]);
      linksMap.set('B', [createMockLink('C')]);
      linksMap.set('C', []);

      const graph = buildLinkGraph(linksMap);

      expect(graph.get('A')).toEqual(new Set(['B', 'C']));
      expect(graph.get('B')).toEqual(new Set(['C']));
      // Note: 'C' might not be in the map as a key if it has no outgoing links,
      // depending on implementation, but in this implementation it iterates entries of linksMap.
      // If we want C to be in the graph as a key, it must be in linksMap.
      expect(graph.get('C')).toEqual(new Set());
    });

    it('should handle multiple links to same target (deduplication)', () => {
        const linksMap = new Map<string, DrawingLink[]>();
        linksMap.set('A', [createMockLink('B'), createMockLink('B')]);

        const graph = buildLinkGraph(linksMap);

        expect(graph.get('A')).toEqual(new Set(['B']));
        expect(graph.get('A')?.size).toBe(1);
    });
  });

  describe('detectCycle', () => {
    it('should return null if no cycle exists', () => {
      // A -> B -> C
      const graph = new Map<string, Set<string>>();
      graph.set('A', new Set(['B']));
      graph.set('B', new Set(['C']));
      graph.set('C', new Set());

      expect(detectCycle(graph, 'A')).toBeNull();
    });

    it('should detect a simple cycle', () => {
      // A -> B -> A
      const graph = new Map<string, Set<string>>();
      graph.set('A', new Set(['B']));
      graph.set('B', new Set(['A']));

      const cycle = detectCycle(graph, 'A');
      expect(cycle).not.toBeNull();
      // The path returned is the recursion stack path leading to the cycle detection
      // A -> B -> (detects A)
      // Implementation returns path stack: ['A', 'B']
      expect(cycle).toEqual(['A', 'B']);
    });

    it('should detect a self-loop', () => {
      // A -> A
      const graph = new Map<string, Set<string>>();
      graph.set('A', new Set(['A']));

      const cycle = detectCycle(graph, 'A');
      expect(cycle).not.toBeNull();
      expect(cycle).toEqual(['A']);
    });

    it('should detect a longer cycle', () => {
        // A -> B -> C -> A
        const graph = new Map<string, Set<string>>();
        graph.set('A', new Set(['B']));
        graph.set('B', new Set(['C']));
        graph.set('C', new Set(['A']));

        const cycle = detectCycle(graph, 'A');
        expect(cycle).toEqual(['A', 'B', 'C']);
    });

    it('should not detect cycle if visited but not in recursion stack (diamond pattern)', () => {
        // A -> B -> D
        // A -> C -> D
        // This is not a cycle
        const graph = new Map<string, Set<string>>();
        graph.set('A', new Set(['B', 'C']));
        graph.set('B', new Set(['D']));
        graph.set('C', new Set(['D']));
        graph.set('D', new Set());

        expect(detectCycle(graph, 'A')).toBeNull();
    });

    it('should detect cycle even if start node is not part of it but leads to it', () => {
        // Start -> A -> B -> A
        const graph = new Map<string, Set<string>>();
        graph.set('Start', new Set(['A']));
        graph.set('A', new Set(['B']));
        graph.set('B', new Set(['A']));

        const cycle = detectCycle(graph, 'Start');
        expect(cycle).toEqual(['Start', 'A', 'B']);
    });
  });
});
