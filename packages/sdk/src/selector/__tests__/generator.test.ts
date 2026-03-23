/**
 * =============================================================================
 * Selector Generator Tests
 * =============================================================================
 *
 * Tests for the selector generation functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSelectorDraft, determineStrategy } from '../generator';
import type { ElementAnalysis } from '@homura/sdk/selector';

// Mock analyzeElement function
function mockAnalysis(overrides?: Partial<ElementAnalysis>): ElementAnalysis {
  return {
    targetSelector: '.target',
    minimalSelector: '.minimal',
    containerType: 'single',
    anchorCandidates: [],
    ancestorPath: [],
    ...overrides,
  };
}

describe('createSelectorDraft', () => {
  it('should create draft for single element', () => {
    const analysis = mockAnalysis({
      targetSelector: '.button',
      minimalSelector: 'button[type="submit"]',
      containerType: 'single',
    });

    const draft = createSelectorDraft(analysis, 'CLICK');

    expect(draft).toBeDefined();
    expect(draft.target.selector).toBe('button[type="submit"]');
    expect(draft.target.action).toBe('CLICK');
    expect(draft.scope).toBeUndefined();
  });

  it('should create draft for repeating container', () => {
    const analysis = mockAnalysis({
      targetSelector: '.target',
      containerSelector: 'tr',
      containerType: 'table',
      relativeSelector: '.button',
    });

    const draft = createSelectorDraft(analysis, 'CLICK');

    expect(draft.scope).toBeDefined();
    expect(draft.scope?.selector).toBe('tr');
    expect(draft.scope?.type).toBe('container_list');
  });

  it('should create draft with anchor when candidates exist', () => {
    const analysis = mockAnalysis({
      containerSelector: 'tr',
      containerType: 'table',
      relativeSelector: '.button',
      anchorCandidates: [
        {
          selector: '.name',
          type: 'text_match',
          text: 'Alice',
        },
      ],
    });

    const draft = createSelectorDraft(analysis, 'CLICK');

    expect(draft.anchor).toBeDefined();
    expect(draft.anchor?.selector).toBe('.name');
    expect(draft.anchor?.type).toBe('text_match');
  });

  it('should handle self-targeting (target is the container)', () => {
    const analysis = mockAnalysis({
      containerSelector: 'tr',
      containerType: 'table',
      relativeSelector: '', // Empty indicates self-targeting
    });

    const draft = createSelectorDraft(analysis, 'CLICK');

    expect(draft.target.selector).toBe('');
  });
});

describe('determineStrategy', () => {
  it('should return direct for single elements', () => {
    const analysis = mockAnalysis({
      containerType: 'single',
      ancestorPath: [],
    });

    const strategy = determineStrategy(analysis);

    expect(strategy).toBe('direct');
  });

  it('should return path for single elements with ancestor path', () => {
    const analysis = mockAnalysis({
      containerType: 'single',
      ancestorPath: [
        { element: null as any, tagName: 'div', className: 'container', depth: 1, isSemanticRoot: false },
      ],
    });

    const strategy = determineStrategy(analysis);

    expect(strategy).toBe('path');
  });

  it('should return scope_anchor_target for table with anchors', () => {
    const analysis = mockAnalysis({
      containerType: 'table',
      anchorCandidates: [
        { selector: '.name', type: 'text_match', text: 'Test' },
      ],
    });

    const strategy = determineStrategy(analysis);

    expect(strategy).toBe('scope_anchor_target');
  });

  it('should return scope_anchor_target for list with anchors', () => {
    const analysis = mockAnalysis({
      containerType: 'list',
      anchorCandidates: [
        { selector: '.name', type: 'text_match', text: 'Test' },
      ],
    });

    const strategy = determineStrategy(analysis);

    expect(strategy).toBe('scope_anchor_target');
  });

  it('should return scope_anchor_target for grid with anchors', () => {
    const analysis = mockAnalysis({
      containerType: 'grid',
      anchorCandidates: [
        { selector: '.name', type: 'text_match', text: 'Test' },
      ],
    });

    const strategy = determineStrategy(analysis);

    expect(strategy).toBe('scope_anchor_target');
  });

  it('should return scope_anchor_target for card with anchors', () => {
    const analysis = mockAnalysis({
      containerType: 'card',
      anchorCandidates: [
        { selector: '.name', type: 'text_match', text: 'Test' },
      ],
    });

    const strategy = determineStrategy(analysis);

    expect(strategy).toBe('scope_anchor_target');
  });

  it('should return path for single element with ancestor path', () => {
    const analysis = mockAnalysis({
      containerType: 'single',
      ancestorPath: [
        { element: null as any, tagName: 'div', className: 'main', depth: 0, isSemanticRoot: true },
      ],
    });

    const strategy = determineStrategy(analysis);

    expect(strategy).toBe('path');
  });
});
