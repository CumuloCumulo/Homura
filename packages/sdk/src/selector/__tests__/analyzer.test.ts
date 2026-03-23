/**
 * =============================================================================
 * Element Analyzer Tests
 * =============================================================================
 *
 * Tests for the DOM element analysis functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeElement } from '../analyzer';

describe('analyzeElement', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create a fresh DOM for each test
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up after each test
    document.body.removeChild(container);
  });

  it('should analyze a simple button element', () => {
    const button = document.createElement('button');
    button.className = 'submit-btn';
    button.textContent = 'Submit';
    container.appendChild(button);

    const result = analyzeElement(button);

    expect(result).toBeDefined();
    expect(result.containerType).toBe('single');
    expect(result.targetSelector).toContain('.submit-btn');
  });

  it('should detect table container type', () => {
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.textContent = 'Test';
    tr.appendChild(td);
    tbody.appendChild(tr);
    table.appendChild(tbody);
    container.appendChild(table);

    const result = analyzeElement(td);

    expect(result.containerType).toBe('table');
  });

  it('should detect list container type', () => {
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.textContent = 'Item 1';
    ul.appendChild(li);
    container.appendChild(ul);

    const result = analyzeElement(li);

    expect(result.containerType).toBe('list');
  });

  it('should find anchor candidates in table rows', () => {
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    // Create two rows
    ['Alice', 'Bob'].forEach((name) => {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.textContent = name;
      const actionTd = document.createElement('td');
      const button = document.createElement('button');
      button.className = 'action-btn';
      actionTd.appendChild(button);
      tr.appendChild(nameTd);
      tr.appendChild(actionTd);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    // Analyze the button in the second row
    const button = tbody.querySelectorAll('.action-btn')[1];
    const result = analyzeElement(button);

    expect(result.anchorCandidates).toBeDefined();
    expect(result.anchorCandidates.length).toBeGreaterThan(0);
  });

  it('should throw on null element', () => {
    expect(() => analyzeElement(null)).toThrow();
  });

  it('should handle nested structure', () => {
    const outer = document.createElement('div');
    outer.className = 'container';
    const middle = document.createElement('div');
    middle.className = 'wrapper';
    const inner = document.createElement('button');
    inner.className = 'btn';
    inner.textContent = 'Click me';

    middle.appendChild(inner);
    outer.appendChild(middle);
    container.appendChild(outer);

    const result = analyzeElement(inner);

    expect(result).toBeDefined();
    expect(result.ancestorPath).toBeDefined();
    expect(result.ancestorPath?.length).toBeGreaterThan(0);
  });
});
