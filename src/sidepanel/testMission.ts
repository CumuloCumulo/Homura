/**
 * =============================================================================
 * Test Mission - Mock Data for MVP Testing
 * =============================================================================
 * 
 * This file contains test tools and missions to verify the execution engine.
 * 
 * Test Scenario:
 * 1. We have a table with student approval requests
 * 2. Each row has: student name, department, and an "Approve" button
 * 3. We want to click the "Approve" button for a specific student
 */

import type { AtomicTool } from '@shared/types';

/**
 * Test Tool: Click Approve Button for a specific student
 * 
 * This tool demonstrates the Scope + Anchor + Target pattern:
 * 1. Scope: Find all table rows (tr)
 * 2. Anchor: Find the row where .student-name contains the target name
 * 3. Target: Click the .btn-approve button in that row
 */
export const TOOL_CLICK_APPROVE: AtomicTool = {
  tool_id: 'click_approve_button',
  name: '点击审批通过按钮',
  description: 'Click the approve button for a specific student in the audit table',
  parameters: {
    student_name: {
      type: 'string',
      description: 'The name of the student to approve',
      required: true,
    },
  },
  selector_logic: {
    // Step 1: Scope - Find all table rows
    scope: {
      type: 'container_list',
      selector: 'table tbody tr, .audit-table tr, [data-testid="audit-row"]',
    },
    // Step 2: Anchor - Match the row with the target student name
    anchor: {
      type: 'text_match',
      selector: 'td:first-child, .student-name, [data-testid="student-name"]',
      value: '{{student_name}}',
      matchMode: 'contains',
    },
    // Step 3: Target - Click the approve button
    target: {
      selector: '.btn-approve, button.approve, [data-testid="approve-btn"], button:last-child',
      action: 'CLICK',
    },
  },
};

/**
 * Test Tool: Extract all student names from a table
 */
export const TOOL_EXTRACT_NAMES: AtomicTool = {
  tool_id: 'extract_student_names',
  name: '提取学生姓名列表',
  description: 'Extract all student names from the audit table',
  parameters: {},
  selector_logic: {
    target: {
      selector: 'table tbody td:first-child, .student-name',
      action: 'EXTRACT_TEXT',
      actionParams: {
        multiple: true,
      },
    },
  },
};

/**
 * Test Tool: Input into search field
 */
export const TOOL_SEARCH_INPUT: AtomicTool = {
  tool_id: 'search_input',
  name: '搜索框输入',
  description: 'Input text into search field',
  parameters: {
    search_text: {
      type: 'string',
      description: 'Text to search for',
      required: true,
    },
  },
  selector_logic: {
    target: {
      selector: 'input[type="search"], input[placeholder*="搜索"], #search, .search-input',
      action: 'INPUT',
      actionParams: {
        value: '{{search_text}}',
        clearFirst: true,
      },
    },
  },
};

/**
 * Test Tool: Wait for table to load
 */
export const TOOL_WAIT_TABLE: AtomicTool = {
  tool_id: 'wait_table_load',
  name: '等待表格加载',
  description: 'Wait for the audit table to appear',
  parameters: {},
  selector_logic: {
    target: {
      selector: 'table tbody tr, .audit-table tr',
      action: 'WAIT_FOR',
      actionParams: {
        timeout: 5000,
        visible: true,
      },
    },
  },
};

/**
 * Simple test tool for basic click (no scope/anchor)
 */
export const TOOL_SIMPLE_CLICK: AtomicTool = {
  tool_id: 'simple_click',
  name: '简单点击测试',
  description: 'Simple click on a button for basic testing',
  parameters: {},
  selector_logic: {
    target: {
      selector: 'button, [role="button"], input[type="button"]',
      action: 'CLICK',
    },
  },
};

/**
 * All test tools
 */
export const TEST_TOOLS: AtomicTool[] = [
  TOOL_CLICK_APPROVE,
  TOOL_EXTRACT_NAMES,
  TOOL_SEARCH_INPUT,
  TOOL_WAIT_TABLE,
  TOOL_SIMPLE_CLICK,
];

/**
 * Get a test tool by ID
 */
export function getTestTool(toolId: string): AtomicTool | undefined {
  return TEST_TOOLS.find(t => t.tool_id === toolId);
}
