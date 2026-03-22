# Blueprint Schema 定义文档

> 🎯 Blueprint 是 Homura 的核心数据格式，包含 Skills（原子工具）和 Rules（执行规则）

---

## 📐 完整 Schema

```typescript
interface Blueprint {
  // ========== 元信息 ==========
  meta: BlueprintMeta;
  
  // ========== Skill 库 ==========
  skills: AtomicTool[];
  
  // ========== Rule Book ==========
  rules: string;
  
  // ========== 可选配置 ==========
  agentConfig?: AgentConfig;
  
  // ========== 维护信息 ==========
  maintenance?: MaintenanceInfo;
}

interface BlueprintMeta {
  name: string;              // 蓝图名称，如 "student-audit-blueprint"
  version: string;           // 语义化版本，如 "1.0.0"
  description?: string;      // 人类可读的描述
  author?: string;           // 作者
  targetUrl: string;         // 目标网址模式，如 "https://school.example.com/*"
  blueprintVersion: string;  // Blueprint 格式版本，如 "1.0.0"
  skillsHash: string;        // Skills 的哈希，用于检测变化
  createdAt?: string;        // 创建时间（ISO 8601）
  updatedAt?: string;        // 更新时间（ISO 8601）
}

interface AgentConfig {
  maxIterations: number;     // 最大迭代次数，默认 50
  timeout: number;           // 超时时间（毫秒），默认 300000（5分钟）
  llmProvider: 'tongyi' | 'openai' | 'claude' | 'anthropic';
  apiKey?: string;           // 可选的 API Key（优先于环境变量）
  model?: string;            // 可选的模型名称
  temperature?: number;      // LLM 温度参数，默认 0.7
}

interface MaintenanceInfo {
  lastUpdated: string;       // 最后更新时间
  changelog: string[];       // 变更日志
  knownIssues: string[];     // 已知问题
  healthCheck?: {
    lastCheck: string;       // 最后健康检查时间
    healthySkills: string[]; // 健康的 Skill ID
    brokenSkills: string[];  // 失效的 Skill ID
  };
}
```

---

## 🧩 AtomicTool Schema

```typescript
interface AtomicTool {
  tool_id: string;           // 唯一标识符，如 "click_approve"
  name: string;              // 人类可读的名称，如 "点击审批按钮"
  description?: string;      // 详细描述
  
  // 参数定义
  parameters: Record<string, ToolParameter>;
  
  // 选择器逻辑
  selector_logic: SelectorLogic;
  
  // 元数据
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    source?: 'recorded' | 'ai_generated' | 'manual';
    confidence?: number;     // 置信度 0-1
    testResults?: TestResult[];
  };
}

interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  default?: string | number | boolean;
  enum?: string[];           // 枚举值（可选）
}

interface SelectorLogic {
  // 可选：作用域
  scope?: SelectorScope;
  
  // 可选：锚点
  anchor?: SelectorAnchor;
  
  // 必需：目标
  target: SelectorTarget;
}

interface SelectorScope {
  type: 'container_list' | 'single_container';
  selector: string;
}

interface SelectorAnchor {
  type: 'text_match' | 'attribute_match' | 'index';
  selector: string;
  value: string;             // 支持 {{variable}} 语法
  attribute?: string;        // 用于 attribute_match
  matchMode?: 'exact' | 'contains' | 'startsWith' | 'endsWith';
}

interface SelectorTarget {
  selector: string;
  action: PrimitiveAction;
  actionParams?: ClickParams | InputParams | ExtractTextParams | WaitForParams | NavigateParams;
}

type PrimitiveAction = 'CLICK' | 'INPUT' | 'EXTRACT_TEXT' | 'WAIT_FOR' | 'NAVIGATE';

// ========== Action Parameters ==========
interface ClickParams {
  debugMode?: boolean;
}

interface InputParams {
  value: string;
  clearFirst?: boolean;
  typeDelay?: number;
}

interface ExtractTextParams {
  multiple?: boolean;
  attribute?: string;
}

interface WaitForParams {
  timeout?: number;
  visible?: boolean;
}

interface NavigateParams {
  url: string;
  waitForLoad?: boolean;
}

// ========== Test Result ==========
interface TestResult {
  timestamp: string;
  url: string;
  success: boolean;
  matchCount?: number;
  error?: string;
}
```

---

## 📄 完整示例

```json
{
  "meta": {
    "name": "student-audit-blueprint",
    "version": "1.0.0",
    "description": "学生审批流程自动化蓝图",
    "author": "Your Name",
    "targetUrl": "https://school.example.com/audit*",
    "blueprintVersion": "1.0.0",
    "skillsHash": "abc123def456",
    "createdAt": "2026-03-22T10:00:00Z",
    "updatedAt": "2026-03-22T10:00:00Z"
  },
  
  "skills": [
    {
      "tool_id": "search_student",
      "name": "搜索学生",
      "description": "在审批系统中搜索指定学生",
      "parameters": {
        "student_name": {
          "type": "string",
          "description": "学生姓名",
          "required": true
        }
      },
      "selector_logic": {
        "scope": {
          "type": "single_container",
          "selector": ".search-box"
        },
        "target": {
          "selector": "input[type='search']",
          "action": "INPUT",
          "actionParams": {
            "value": "{{student_name}}",
            "clearFirst": true
          }
        }
      },
      "metadata": {
        "source": "recorded",
        "confidence": 0.95
      }
    },
    
    {
      "tool_id": "click_approve",
      "name": "点击审批通过",
      "description": "点击指定学生的审批通过按钮",
      "parameters": {
        "student_name": {
          "type": "string",
          "description": "学生姓名",
          "required": true
        }
      },
      "selector_logic": {
        "scope": {
          "type": "container_list",
          "selector": "table.audit-table tbody tr"
        },
        "anchor": {
          "type": "text_match",
          "selector": "td.student-name",
          "value": "{{student_name}}",
          "matchMode": "contains"
        },
        "target": {
          "selector": "td.actions button.btn-approve",
          "action": "CLICK"
        }
      },
      "metadata": {
        "source": "recorded",
        "confidence": 0.92
      }
    },
    
    {
      "tool_id": "extract_student_info",
      "name": "提取学生信息",
      "description": "从表格行中提取学生详细信息",
      "parameters": {
        "student_name": {
          "type": "string",
          "description": "学生姓名",
          "required": true
        }
      },
      "selector_logic": {
        "scope": {
          "type": "container_list",
          "selector": "table.audit-table tbody tr"
        },
        "anchor": {
          "type": "text_match",
          "selector": "td.student-name",
          "value": "{{student_name}}",
          "matchMode": "contains"
        },
        "target": {
          "selector": "td",
          "action": "EXTRACT_TEXT",
          "actionParams": {
            "multiple": true
          }
        }
      }
    }
  ],
  
  "rules": "# 学生审批自动化规则\n\n## 目标\n批量审批待审核的学生申请\n\n## 执行流程\n\n1. **初始化**：打开审批列表页面\n\n2. **遍历申请**：对于列表中的每个申请：\n   - 使用 `extract_student_info` 提取学生姓名和学院信息\n   - 根据学院判断审批结果：\n     * 艺术学院 → 自动通过\n     * 其他学院 → 标记为待处理\n\n3. **执行审批**：\n   - 如果是\"通过\"：调用 `click_approve`\n   - 如果是\"拒绝\"：调用 `click_reject`\n   - 等待操作完成\n\n4. **错误处理**：\n   - 如果页面加载超时，重试 3 次\n   - 如果找不到学生，记录日志并跳过\n   - 如果按钮不可点击，通知人工介入\n\n## 可用技能\n- `search_student`: 搜索学生\n- `click_approve`: 点击通过按钮\n- `click_reject`: 点击拒绝按钮\n- `extract_student_info`: 提取学生信息",
  
  "agentConfig": {
    "maxIterations": 100,
    "timeout": 300000,
    "llmProvider": "tongyi",
    "temperature": 0.7
  },
  
  "maintenance": {
    "lastUpdated": "2026-03-22T10:00:00Z",
    "changelog": [
      "1.0.0 - 初始版本，支持基础审批流程"
    ],
    "knownIssues": [],
    "healthCheck": {
      "lastCheck": "2026-03-22T10:00:00Z",
      "healthySkills": ["search_student", "click_approve", "extract_student_info"],
      "brokenSkills": []
    }
  }
}
```

---

## 🔍 Schema 验证

### 使用 Zod 验证

```typescript
import { z } from 'zod';

const BlueprintSchema = z.object({
  meta: z.object({
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    targetUrl: z.string().url(),
    // ...
  }),
  skills: z.array(z.object({
    tool_id: z.string().min(1),
    name: z.string().min(1),
    parameters: z.record(z.object({
      type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
      description: z.string(),
      required: z.boolean().optional(),
      default: z.any().optional(),
    })),
    selector_logic: z.object({
      scope: z.object({
        type: z.enum(['container_list', 'single_container']),
        selector: z.string(),
      }).optional(),
      anchor: z.object({
        type: z.enum(['text_match', 'attribute_match', 'index']),
        selector: z.string(),
        value: z.string(),
        matchMode: z.enum(['exact', 'contains', 'startsWith', 'endsWith']).optional(),
      }).optional(),
      target: z.object({
        selector: z.string(),
        action: z.enum(['CLICK', 'INPUT', 'EXTRACT_TEXT', 'WAIT_FOR', 'NAVIGATE']),
      }),
    }),
  })),
  rules: z.string().min(1),
  agentConfig: z.object({
    maxIterations: z.number().int().positive(),
    timeout: z.number().int().positive(),
    llmProvider: z.enum(['tongyi', 'openai', 'claude', 'anthropic']),
  }).optional(),
});

// 使用
function validateBlueprint(data: unknown) {
  try {
    return BlueprintSchema.parse(data);
  } catch (error) {
    throw new Error(`Blueprint 验证失败: ${error.message}`);
  }
}
```

---

## 📝 版本管理

### 语义化版本规则

- **主版本**（Major）：不兼容的 API 变更
- **次版本**（Minor）：向后兼容的功能新增
- **修订版本**（Patch）：向后兼容的问题修复

### 更新 changelog

```typescript
{
  "maintenance": {
    "lastUpdated": "2026-03-23T10:00:00Z",
    "changelog": [
      "1.1.0 - 添加批量审批功能",
      "1.0.1 - 修复选择器匹配问题",
      "1.0.0 - 初始版本"
    ]
  }
}
```

---

## 🔧 工具函数

### 计算 Skills Hash

```typescript
import crypto from 'crypto';

function calculateSkillsHash(skills: AtomicTool[]): string {
  const normalized = JSON.stringify(
    skills.map(s => ({
      tool_id: s.tool_id,
      selector_logic: s.selector_logic
    }))
  );
  return crypto.createHash('sha256').update(normalized).digest('hex');
}
```

### 验证变量引用

```typescript
function validateVariableReferences(blueprint: Blueprint) {
  const definedVars = new Set<string>();
  
  // 收集所有定义的变量
  for (const tool of blueprint.skills) {
    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      definedVars.add(paramName);
    }
  }
  
  // 检查 selector_logic 中的变量引用
  for (const tool of blueprint.skills) {
    const vars = extractVariables(tool.selector_logic);
    for (const v of vars) {
      if (!definedVars.has(v)) {
        throw new Error(`未定义的变量: ${v} 在 ${tool.tool_id} 中引用`);
      }
    }
  }
}

function extractVariables(selectorLogic: SelectorLogic): string[] {
  const pattern = /\{\{(\w+)\}\}/g;
  const vars = new Set<string>();
  
  const search = (obj: any) => {
    if (typeof obj === 'string') {
      let match;
      while ((match = pattern.exec(obj)) !== null) {
        vars.add(match[1]);
      }
    } else if (obj && typeof obj === 'object') {
      for (const v of Object.values(obj)) {
        search(v);
      }
    }
  };
  
  search(selectorLogic);
  return Array.from(vars);
}
```

---

## 📚 相关文档

- [AI Agent 模式](./ai-agent-mode.md) - AI Agent 执行模式说明
- [SDK 架构](./sdk-architecture.md) - SDK 模块划分
- [插件维护机制](./plugin-maintenance.md) - 维护和自愈策略

---

*本文档定义 Blueprint 的 Schema，是插件开发的核心规范*
