import { describe, it, expect } from 'vitest';
import {
  findInTree,
  mapTree,
  filterTree,
  hasChildren,
  getPathToNode,
  nodeExists,
  getLeafNodes,
  getTreeDepth,
  countNodes,
  type TreeNode,
} from './tree-utils';

interface TestNode extends TreeNode {
  name: string;
  children?: TestNode[];
}

const mockTree: TestNode[] = [
  {
    id: '1',
    name: 'Root 1',
    children: [
      { id: '1.1', name: 'Child 1.1' },
      {
        id: '1.2',
        name: 'Child 1.2',
        children: [{ id: '1.2.1', name: 'Grandchild 1.2.1' }],
      },
    ],
  },
  {
    id: '2',
    name: 'Root 2',
    children: [{ id: '2.1', name: 'Child 2.1' }],
  },
  {
    id: '3',
    name: 'Root 3',
  },
];

describe('tree-utils', () => {
  describe('findInTree', () => {
    it('should find a root node', () => {
      const result = findInTree(mockTree, (node) => node.id === '2');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Root 2');
    });

    it('should find a nested node', () => {
      const result = findInTree(mockTree, (node) => node.id === '1.2.1');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Grandchild 1.2.1');
    });

    it('should return null if node not found', () => {
      const result = findInTree(mockTree, (node) => node.id === '999');
      expect(result).toBeNull();
    });
  });

  describe('mapTree', () => {
    it('should transform all nodes', () => {
      const result = mapTree(mockTree, (node) => ({
        ...node,
        name: node.name.toUpperCase(),
      }));

      expect(result[0].name).toBe('ROOT 1');
      expect(result[0].children?.[0].name).toBe('CHILD 1.1');
      expect(result[0].children?.[1].children?.[0].name).toBe('GRANDCHILD 1.2.1');
    });

    it('should preserve structure', () => {
      const result = mapTree(mockTree, (node) => ({ ...node }));
      expect(result).toEqual(mockTree);
    });
  });

  describe('filterTree', () => {
    it('should filter nodes based on predicate', () => {
      const result = filterTree(mockTree, (node) => node.id.startsWith('1'));
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
      expect(result[0].children?.length).toBe(2);
      expect(result[0].children?.[1].children?.length).toBe(1);
    });

    it('should return empty array if no nodes match', () => {
      const result = filterTree(mockTree, (node) => node.id === '999');
      expect(result).toEqual([]);
    });
  });

  describe('hasChildren', () => {
    it('should return true for nodes with children', () => {
      expect(hasChildren(mockTree[0])).toBe(true);
    });

    it('should return false for leaf nodes', () => {
      expect(hasChildren(mockTree[2])).toBe(false);
    });

    it('should return false for node with empty children array', () => {
      const node = { id: 'test', children: [] };
      expect(hasChildren(node)).toBe(false);
    });
  });

  describe('getPathToNode', () => {
    it('should return path to nested node', () => {
      const path = getPathToNode(mockTree, '1.2.1');
      expect(path).toEqual(['1', '1.2', '1.2.1']);
    });

    it('should return path to root node', () => {
      const path = getPathToNode(mockTree, '3');
      expect(path).toEqual(['3']);
    });

    it('should return empty array if node not found', () => {
      const path = getPathToNode(mockTree, '999');
      expect(path).toEqual([]);
    });
  });

  describe('nodeExists', () => {
    it('should return true if node exists', () => {
      expect(nodeExists(mockTree, '1.2.1')).toBe(true);
    });

    it('should return false if node does not exist', () => {
      expect(nodeExists(mockTree, '999')).toBe(false);
    });
  });

  describe('getLeafNodes', () => {
    it('should return all leaf nodes', () => {
      const leaves = getLeafNodes(mockTree);
      const leafIds = leaves.map(node => node.id);
      expect(leafIds).toEqual(['1.1', '1.2.1', '2.1', '3']);
    });
  });

  describe('getTreeDepth', () => {
    it('should calculate correct depth', () => {
      expect(getTreeDepth(mockTree)).toBe(3);
    });

    it('should return 0 for empty tree', () => {
      expect(getTreeDepth([])).toBe(0);
    });

    it('should return 1 for single node tree', () => {
        expect(getTreeDepth([{ id: '1' }])).toBe(1);
    });
  });

  describe('countNodes', () => {
    it('should count all nodes recursively', () => {
      // 1, 1.1, 1.2, 1.2.1 (4) + 2, 2.1 (2) + 3 (1) = 7
      expect(countNodes(mockTree)).toBe(7);
    });

    it('should return 0 for empty tree', () => {
        expect(countNodes([])).toBe(0);
    });
  });
});
