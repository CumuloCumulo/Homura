# 插件维护机制设计文档

> 🎯 **核心理念**：双层维护策略 - 运行时自愈 + 开发时借助 Homura 快速修复
>
> ⚠️ **当前状态**：设计完成，**待实现**（计划 v2.0）
>
> SDK v1.0 已完成核心引擎抽离，自愈机制计划在 v2.0 版本实现。

---

## 🔄 维护生命周期

```
开发阶段 (Homura)
    ↓
发布插件
    ↓
运行阶段 (用户使用)
    ↓ 选择器失效
运行时自愈 (自动)
    ↓ 成功
继续执行
    ↓ 失败
报告错误
    ↓
开发时维护 (借助 Homura)
    ↓
发布更新
```

---

## 🛡️ 运行时自愈

### 触发条件

当选择器执行失败时：
```typescript
{
  success: false,
  error: {
    code: 'TARGET_NOT_FOUND',
    message: '选择器匹配到 0 个元素',
    failedSelector: 'td.actions button.btn-approve',
    domSnapshot: '...'
  }
}
```

### 自愈流程

```typescript
export class SelfHealingAgent extends AIAgent {
  async executeSkill(skill: AtomicTool, params: Record<string, any>) {
    try {
      return await super.executeSkill(skill, params);
    } catch (error) {
      // 选择器失效
      if (error.code === 'TARGET_NOT_FOUND' || 
          error.code === 'SCOPE_NOT_FOUND' ||
          error.code === 'ANCHOR_NOT_FOUND') {
        
        console.log('[SelfHealing] 选择器失效，尝试自愈...');
        
        // 1. 获取失败的 DOM 快照
        const domSnapshot = error.domSnapshot || getDOMSnapshot();
        
        // 2. 调用 AI 修复选择器
        const newSelector = await this.llm.chat([
          {
            role: 'system',
            content: `你是 DOM 修复专家。

原选择器：${error.failedSelector}
目标动作：${skill.selector_logic.target.action}

当前 DOM 快照：
${domSnapshot}

请分析 DOM 变化，生成新的选择器。

要求：
1. 选择器必须稳定（避免使用动态 ID、位置索引）
2. 优先使用语义化选择器（class、data 属性）
3. 保持原有的 Scope+Anchor+Target 结构

返回 JSON：
{
  "newSelector": "新的选择器",
  "reasoning": "修复理由",
  "confidence": 0.9
}`
          }
        ]);
        
        // 3. 验证新选择器
        const validation = validateSelector(newSelector.newSelector);
        
        if (validation.valid && validation.confidence > 0.7) {
          console.log('[SelfHealing] 自愈成功', newSelector.reasoning);
          
          // 4. 更新 Skill（仅在内存中，不持久化）
          const fixedSkill = {
            ...skill,
            selector_logic: {
              ...skill.selector_logic,
              target: {
                ...skill.selector_logic.target,
                selector: newSelector.newSelector
              }
            },
            metadata: {
              ...skill.metadata,
              autoFixed: true,
              fixedAt: new Date().toISOString(),
              fixReasoning: newSelector.reasoning
            }
          };
          
          // 5. 重新执行
          return await super.executeSkill(fixedSkill, params);
        } else {
          console.log('[SelfHealing] 自愈失败，置信度不足');
          throw error;
        }
      }
      
      // 其他错误，无法自愈
      throw error;
    }
  }
}
```

### 自愈限制

为了防止自愈造成更多问题，有以下限制：

| 限制条件 | 说明 |
|----------|------|
| 置信度阈值 | 新选择器置信度必须 > 0.7 |
| 重试次数 | 每个选择器最多自愈 3 次 |
| 超时时间 | 自愈决策超时 10 秒 |
| 作用域范围 | 只修复失效的部分（Scope/Anchor/Target） |

### 自愈日志

```typescript
interface SelfHealingLog {
  timestamp: string;
  skillId: string;
  originalSelector: string;
  newSelector: string;
  reasoning: string;
  confidence: number;
  success: boolean;
}
```

---

## 🔧 开发时维护

当运行时自愈失败时，需要人工介入。工作流程：

### 步骤 1：收集错误信息

用户报告插件不工作，收集以下信息：
- 错误代码
- 失效的选择器
- 目标网址
- 浏览器版本

### 步骤 2：打开 Homura + 目标网页

```
1. 打开 Homura 扩展
2. 导航到目标网址
3. 打开 Dashboard → 维护模式
```

### 步骤 3：加载旧 Blueprint

```typescript
// dashboard/components/MaintenancePanel.tsx

interface MaintenanceModeProps {
  onLoadBlueprint: (file: File) => void;
  blueprint: PluginBlueprint;
}

function MaintenancePanel({ onLoadBlueprint, blueprint }) {
  return (
    <div>
      <h2>维护模式</h2>
      
      {/* 加载 Blueprint */}
      <FileUpload
        accept=".json"
        label="加载现有 Blueprint"
        onLoad={onLoadBlueprint}
      />
      
      {/* 显示 Blueprint 信息 */}
      <BlueprintInfo blueprint={blueprint} />
    </div>
  );
}
```

### 步骤 4：健康检查

```typescript
// 对每个 Skill 进行健康检查

interface SkillHealthResult {
  skillId: string;
  skillName: string;
  healthy: boolean;
  issues: string[];
  suggestions: string[];
}

async function healthCheck(
  blueprint: PluginBlueprint,
  targetUrl: string
): Promise<SkillHealthResult[]> {
  const results: SkillHealthResult[] = [];
  
  for (const skill of blueprint.skills) {
    const result: SkillHealthResult = {
      skillId: skill.tool_id,
      skillName: skill.name,
      healthy: true,
      issues: [],
      suggestions: []
    };
    
    // 1. 验证选择器语法
    try {
      const validation = validateSelector(skill.selector_logic);
      if (!validation.valid) {
        result.healthy = false;
        result.issues.push(`选择器语法错误: ${validation.error}`);
      }
    } catch (error) {
      result.healthy = false;
      result.issues.push(`选择器验证失败: ${error.message}`);
    }
    
    // 2. 在目标页面测试选择器
    try {
      const matchCount = await testSelectorInPage(
        skill.selector_logic,
        targetUrl
      );
      
      if (matchCount === 0) {
        result.healthy = false;
        result.issues.push('选择器匹配到 0 个元素');
        result.suggestions.push('使用 Inspect Mode 重新检查元素');
      } else if (matchCount > 10) {
        result.issues.push(`选择器匹配到 ${matchCount} 个元素，可能不够精确`);
      }
    } catch (error) {
      result.healthy = false;
      result.issues.push(`页面测试失败: ${error.message}`);
    }
    
    results.push(result);
  }
  
  return results;
}
```

### 步骤 5：修复失效 Skills

#### 方法 A：重新录制

```typescript
// 1. 在 SidePanel 开启录制模式
// 2. 重新执行操作
// 3. 生成新的 UnifiedSelector
// 4. 替换 Blueprint 中的 Skill
```

#### 方法 B：AI 批量修复

```typescript
async function aiBatchFix(
  blueprint: PluginBlueprint,
  targetUrl: string
): Promise<PluginBlueprint> {
  // 1. 获取目标页面 DOM 快照
  const domSnapshot = await getDOMSnapshot(targetUrl);
  
  // 2. 对每个失效 Skill 调用 AI 修复
  const fixedSkills = await Promise.all(
    blueprint.skills.map(async (skill) => {
      const health = await checkSkillHealth(skill, targetUrl);
      
      if (!health.healthy) {
        console.log(`正在修复 Skill: ${skill.tool_id}`);
        
        const fixed = await llm.chat([
          {
            role: 'system',
            content: `你是选择器修复专家。

原 Skill：
${JSON.stringify(skill, null, 2)}

当前 DOM：
${domSnapshot}

错误信息：
${health.issues.join('\n')}

请生成修复后的 Skill。返回 JSON 格式。`
          }
        ]);
        
        return fixed;
      }
      
      return skill;
    })
  );
  
  // 3. 更新 Blueprint
  return {
    ...blueprint,
    skills: fixedSkills,
    maintenance: {
      ...blueprint.maintenance,
      lastUpdated: new Date().toISOString(),
      changelog: [
        `批量修复 ${fixedSkills.length} 个 Skills`,
        ...(blueprint.maintenance?.changelog || [])
      ]
    }
  };
}
```

### 步骤 6：导出新 Blueprint

```typescript
function exportBlueprint(blueprint: PluginBlueprint) {
  // 1. 更新版本号
  const newVersion = incrementVersion(blueprint.meta.version);
  
  // 2. 更新维护信息
  const updatedBlueprint = {
    ...blueprint,
    meta: {
      ...blueprint.meta,
      version: newVersion,
      updatedAt: new Date().toISOString()
    },
    maintenance: {
      ...blueprint.maintenance,
      lastUpdated: new Date().toISOString()
    }
  };
  
  // 3. 下载 JSON 文件
  const blob = new Blob(
    [JSON.stringify(updatedBlueprint, null, 2)],
    { type: 'application/json' }
  );
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${blueprint.meta.name}-v${newVersion}.json`;
  a.click();
}
```

---

## 🔄 热更新机制（可选）

为了快速部署修复，可以实现远程 Blueprint 加载：

```typescript
class UpdatableAgent extends SelfHealingAgent {
  async loadBlueprint() {
    const stored = await chrome.storage.local.get('blueprint');
    
    // 优先检查远程更新
    try {
      const remoteBlueprint = await fetch(
        `https://your-cdn.com/blueprints/${this.meta.name}.json`
      ).then(r => r.json());
      
      // 检查版本
      if (compareVersions(remoteBlueprint.meta.version, stored.blueprint.meta.version) > 0) {
        console.log('[Update] 发现新版本，自动更新...');
        
        // 保存到本地
        await chrome.storage.local.set({ blueprint: remoteBlueprint });
        
        // 通知用户
        this.notifyUser('Blueprint 已更新到 v' + remoteBlueprint.meta.version);
        
        return remoteBlueprint;
      }
    } catch (error) {
      console.log('[Update] 使用本地 Blueprint');
    }
    
    return stored.blueprint;
  }
}

function compareVersions(v1: string, v2: string): number {
  const [major1, minor1, patch1] = v1.split('.').map(Number);
  const [major2, minor2, patch2] = v2.split('.').map(Number);
  
  if (major1 !== major2) return major1 - major2;
  if (minor1 !== minor2) return minor1 - minor2;
  return patch1 - patch2;
}
```

---

## 📊 维护工具链

### Dashboard 维护面板

```typescript
// dashboard/components/MaintenancePanel.tsx

function MaintenancePanel() {
  const [blueprint, setBlueprint] = useState<PluginBlueprint | null>(null);
  const [healthResults, setHealthResults] = useState<SkillHealthResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  
  const handleLoadBlueprint = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target?.result as string);
      setBlueprint(data);
    };
    reader.readAsText(file);
  };
  
  const handleHealthCheck = async () => {
    if (!blueprint) return;
    
    setIsChecking(true);
    const results = await healthCheck(blueprint, window.location.href);
    setHealthResults(results);
    setIsChecking(false);
  };
  
  const handleBatchFix = async () => {
    if (!blueprint) return;
    
    const fixed = await aiBatchFix(blueprint, window.location.href);
    setBlueprint(fixed);
    setHealthResults([]); // 清除旧结果
  };
  
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">插件维护</h2>
      
      {/* 加载 Blueprint */}
      <div className="mb-6">
        <label className="block mb-2">加载 Blueprint</label>
        <input
          type="file"
          accept=".json"
          onChange={(e) => handleLoadBlueprint(e.target.files![0])}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100"
        />
      </div>
      
      {blueprint && (
        <>
          {/* Blueprint 信息 */}
          <div className="mb-6 p-4 bg-zinc-900 rounded-lg">
            <h3 className="font-bold mb-2">{blueprint.meta.name}</h3>
            <p className="text-sm text-gray-400">
              版本: {blueprint.meta.version}
            </p>
            <p className="text-sm text-gray-400">
              Skills: {blueprint.skills.length}
            </p>
          </div>
          
          {/* 健康检查 */}
          <div className="mb-6">
            <button
              onClick={handleHealthCheck}
              disabled={isChecking}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? '检查中...' : '健康检查'}
            </button>
          </div>
          
          {/* 健康检查结果 */}
          {healthResults.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold mb-3">检查结果</h3>
              {healthResults.map(result => (
                <div
                  key={result.skillId}
                  className={`p-3 mb-2 rounded-lg ${
                    result.healthy
                      ? 'bg-green-900/30 border border-green-700'
                      : 'bg-red-900/30 border border-red-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{result.skillName}</span>
                    <span className={result.healthy ? 'text-green-400' : 'text-red-400'}>
                      {result.healthy ? '✓ 健康' : '✗ 失效'}
                    </span>
                  </div>
                  
                  {!result.healthy && (
                    <>
                      {result.issues.length > 0 && (
                        <ul className="mt-2 text-sm text-red-300">
                          {result.issues.map((issue, i) => (
                            <li key={i}>• {issue}</li>
                          ))}
                        </ul>
                      )}
                      
                      {result.suggestions.length > 0 && (
                        <ul className="mt-2 text-sm text-yellow-300">
                          {result.suggestions.map((suggestion, i) => (
                            <li key={i}>💡 {suggestion}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* AI 批量修复 */}
          <div className="mb-6">
            <button
              onClick={handleBatchFix}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              AI 批量修复
            </button>
          </div>
          
          {/* 导出 Blueprint */}
          <div>
            <button
              onClick={() => exportBlueprint(blueprint)}
              className="px-4 py-2 bg-zinc-700 text-white rounded-lg"
            >
              导出 Blueprint
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 📚 相关文档

- [Blueprint Schema](./blueprint-schema.md) - Blueprint 数据结构定义
- [AI Agent 模式](./ai-agent-mode.md) - AI Agent 执行模式说明
- [SDK 架构](./sdk-architecture.md) - SDK 模块划分

---

*本文档记录插件的维护机制，确保长期可用性*
