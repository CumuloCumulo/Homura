/**
 * =============================================================================
 * Selector Validator Tests
 * =============================================================================
 *
 * Tests for the selector validation functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateSelectorDraft } from '../validator';
import type { SelectorDraft } from '@homura/sdk/selector';

describe('validateSelectorDraft', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('should validate a simple target selector', () => {
    // Setup
    const button = document.createElement('button');
    button.className = 'submit-btn';
    container.appendChild(button);

    const draft: SelectorDraft = {
      target: {
        selector: '.submit-btn',
        action: 'CLICK',
      },
      confidence: 0.8,
      validated: false,
    };

    // Act
    const result = validateSelectorDraft(draft);

    // Assert
    expect(result.valid).toBe(true);
    expect(result.targetFound).toBe(true);
  });

  it('should return invalid for non-existent selector', () => {
    const draft: SelectorDraft = {
      target: {
        selector: '.non-existent',
        action: 'CLICK',
      },
      confidence: 0.5,
      validated: false,
    };

    const result = validateSelectorDraft(draft);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.targetFound).toBe(false);
  });

  it('should validate scope selector', () => {
    // Setup
    const ul = document.createElement('ul');
    for (let i = 0; i < 3; i++) {
      const li = document.createElement('li');
      li.textContent = `Item ${i}`;
      ul.appendChild(li);
    }
    container.appendChild(ul);

    const draft: SelectorDraft = {
      scope: {
        selector: 'li',
        type: 'container_list',
        matchCount: 3,
      },
      target: {
        selector: '.submit-btn',
        action: 'CLICK',
      },
      confidence: 0.7,
      validated: false,
    };

    const result = validateSelectorDraft(draft);

    expect(result.valid).toBe(true);
    expect(result.scopeMatches).toBe(3);
  });

  it('should validate scope with anchor', () => {
    // Setup
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    for (let i = 0; i < 3; i++) {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.textContent = i === 1 ? 'Target' : `Other ${i}`;
      const btnTd = document.createElement('td');
      const button = document.createElement('button');
      button.className = 'action-btn';
      btnTd.appendChild(button);
      tr.appendChild(nameTd);
      tr.appendChild(btnTd);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    container.appendChild(table);

    const draft: SelectorDraft = {
      scope: {
        selector: 'tr',
        type: 'container_list',
        matchCount: 3,
      },
      anchor: {
        selector: 'td',
        type: 'text_match',
        value: 'Target',
        matchMode: 'contains',
      },
      target: {
        selector: '.action-btn',
        action: 'CLICK',
      },
      confidence: 0.9,
      validated: false,
    };

    const result = validateSelectorDraft(draft);

    expect(result.valid).toBe(true);
    expect(result.scopeMatches).toBe(3);
    expect(result.anchorMatchIndex).toBe(1); // Second row
    expect(result.targetFound).toBe(true);
  });

  it('should return invalid when anchor is not found', () => {
    const draft: SelectorDraft = {
      scope: {
        selector: 'tr',
        type: 'container_list',
        matchCount: 0,
      },
      anchor: {
        selector: 'td',
        type: 'text_match',
        value: 'NonExistent',
        matchMode: 'contains',
      },
      target: {
        selector: '.action-btn',
        action: 'CLICK',
      },
      confidence: 0.5,
      validated: false,
    };

    const result = validateSelectorDraft(draft);

    expect(result.valid).toBe(false);
    expect(result.scopeMatches).toBe(0);
    expect(result.anchorMatchIndex).toBe(-1);
  });
});
