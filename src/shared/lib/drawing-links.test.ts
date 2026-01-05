import { describe, it, expect } from 'vitest';
import {
  createDrawingLink,
  createElementLink,
  createFrameLink,
  isDrawingLink,
  parseDrawingLink,
  extractDrawingIdFromLink,
  drawingLinkToUrl,
  findDrawingLinks,
  getLinkDescription,
  DRAWING_LINK_PREFIX,
  type ExcalidrawElementWithLink
} from './drawing-links';

describe('drawing-links', () => {
  const TEST_DRAWING_ID = 'drawing-123';
  const TEST_ELEMENT_ID = 'element-456';
  const TEST_FRAME_ID = 'frame-789';

  describe('creation functions', () => {
    it('should create drawing link', () => {
      expect(createDrawingLink(TEST_DRAWING_ID)).toBe(`${DRAWING_LINK_PREFIX}${TEST_DRAWING_ID}`);
    });

    it('should create element link', () => {
      expect(createElementLink(TEST_DRAWING_ID, TEST_ELEMENT_ID))
        .toBe(`${DRAWING_LINK_PREFIX}${TEST_DRAWING_ID}#element:${TEST_ELEMENT_ID}`);
    });

    it('should create frame link', () => {
      expect(createFrameLink(TEST_DRAWING_ID, TEST_FRAME_ID))
        .toBe(`${DRAWING_LINK_PREFIX}${TEST_DRAWING_ID}#frame:${TEST_FRAME_ID}`);
    });
  });

  describe('isDrawingLink', () => {
    it('should return true for valid drawing link', () => {
      expect(isDrawingLink(`${DRAWING_LINK_PREFIX}abc`)).toBe(true);
    });

    it('should return false for null/undefined', () => {
      expect(isDrawingLink(null)).toBe(false);
      expect(isDrawingLink(undefined)).toBe(false);
    });

    it('should return false for other links', () => {
      expect(isDrawingLink('https://google.com')).toBe(false);
      expect(isDrawingLink('mailto:test@example.com')).toBe(false);
    });
  });

  describe('parseDrawingLink', () => {
    it('should parse simple drawing link', () => {
      const result = parseDrawingLink(createDrawingLink(TEST_DRAWING_ID));
      expect(result).toEqual({ type: 'drawing', drawingId: TEST_DRAWING_ID });
    });

    it('should parse element link', () => {
      const result = parseDrawingLink(createElementLink(TEST_DRAWING_ID, TEST_ELEMENT_ID));
      expect(result).toEqual({ type: 'element', drawingId: TEST_DRAWING_ID, elementId: TEST_ELEMENT_ID });
    });

    it('should parse frame link', () => {
      const result = parseDrawingLink(createFrameLink(TEST_DRAWING_ID, TEST_FRAME_ID));
      expect(result).toEqual({ type: 'frame', drawingId: TEST_DRAWING_ID, frameId: TEST_FRAME_ID });
    });

    it('should return null for invalid link prefix', () => {
      expect(parseDrawingLink('http://example.com')).toBeNull();
    });

    it('should return null if drawing ID is missing', () => {
      expect(parseDrawingLink(DRAWING_LINK_PREFIX)).toBeNull();
    });

    it('should fallback to drawing type if fragment is invalid', () => {
      expect(parseDrawingLink(`${DRAWING_LINK_PREFIX}${TEST_DRAWING_ID}#invalid`))
        .toEqual({ type: 'drawing', drawingId: TEST_DRAWING_ID });
    });

    it('should fallback to drawing type if fragment value is missing', () => {
        expect(parseDrawingLink(`${DRAWING_LINK_PREFIX}${TEST_DRAWING_ID}#element:`))
          .toEqual({ type: 'drawing', drawingId: TEST_DRAWING_ID });
    });
  });

  describe('extractDrawingIdFromLink', () => {
    it('should extract ID from valid link', () => {
      expect(extractDrawingIdFromLink(createDrawingLink(TEST_DRAWING_ID))).toBe(TEST_DRAWING_ID);
    });

    it('should return null for invalid link', () => {
      expect(extractDrawingIdFromLink('http://example.com')).toBeNull();
    });
  });

  describe('drawingLinkToUrl', () => {
    it('should convert to editor URL', () => {
      expect(drawingLinkToUrl(createDrawingLink(TEST_DRAWING_ID))).toBe(`/editor?id=${TEST_DRAWING_ID}`);
    });

    it('should return # for invalid link', () => {
      expect(drawingLinkToUrl('invalid')).toBe('#');
    });
  });

  describe('findDrawingLinks', () => {
    it('should find all drawing links', () => {
      const elements: ExcalidrawElementWithLink[] = [
        { id: '1', link: createDrawingLink('d1') },
        { id: '2', link: 'http://example.com' }, // Ignored
        { id: '3' }, // Ignored (undefined link)
        { id: '4', link: createElementLink('d2', 'e1') }
      ];

      const result = findDrawingLinks(elements);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        elementId: '1',
        drawingId: 'd1',
        targetType: 'drawing',
        link: createDrawingLink('d1')
      });
      expect(result[1]).toEqual({
        elementId: '4',
        drawingId: 'd2',
        targetType: 'element',
        link: createElementLink('d2', 'e1')
      });
    });
  });

  describe('getLinkDescription', () => {
    it('should describe drawing link', () => {
      expect(getLinkDescription(createDrawingLink(TEST_DRAWING_ID))).toBe('Navigate to drawing');
    });

    it('should describe element link with truncated ID', () => {
        const longId = '1234567890';
        expect(getLinkDescription(createElementLink(TEST_DRAWING_ID, longId)))
            .toContain('12345678...');
    });

    it('should describe frame link', () => {
      expect(getLinkDescription(createFrameLink(TEST_DRAWING_ID, 'f1'))).toContain('Navigate to frame');
    });

    it('should return "Invalid link" for non-drawing links', () => {
      expect(getLinkDescription('http://google.com')).toBe('Invalid link');
    });
  });
});
