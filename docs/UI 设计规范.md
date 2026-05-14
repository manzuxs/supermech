# Supermech UI 设计规范 (v1.0)

## 1. 设计哲学 (Design Philosophy)

* **工具导向 (Tool-first):** 界面应服务于功能，减少干扰，突出“画布”内容。
* **原子化 (Atomic):** 所有的 UI 元素通过 Tailwind CSS 驱动，便于 Agent 进行样式细调。
* **状态透明 (State Visible):** 所有的交互结果（JSON 状态）应有明确的视觉反馈。

---

## 2. 布局系统 (Layout Architecture)

采用“全屏工作台”布局，通过 CSS Grid 实现。要求 Agent 必须严格遵守以下区域定义：

| 区域 | 名称 | 功能描述 | 宽度/高度 |
| --- | --- | --- | --- |
| **Header** | 头部栏 | 项目名称、全局设置、Agent 状态指示器、Undo/Redo。 | 固定 64px 高度 |
| **Left Sidebar** | 导航/技能区 | 子技能切换（Brainstorm, Planner, Execute）、资源库。 | 240px - 300px |
| **Center Canvas** | 主画布区 | **核心区域**。参考 `open-slide`，渲染 HTML Artifacts (JSON 可视化)。 | 弹性（自适应） |
| **Right Sidebar** | 检查器/反馈区 | 选中节点的详细 JSON 属性、用户修改意见输入框、Agent 建议。 | 300px - 400px |
| **Footer** | 状态栏 | 实时日志（Terminal）、当前 Token 消耗、进度条。 | 固定 32px 高度 |

### 布局代码范式 (Tailwind CSS):

```tsx
<div className="grid h-screen w-screen grid-cols-[auto_1fr_auto] grid-rows-[64px_1fr_32px] overflow-hidden bg-var(--bg-main)">
  <header className="col-span-3 border-b border-var(--border)">Header</header>
  <aside className="border-r border-var(--border)">Left Sidebar</aside>
  <main className="relative overflow-auto bg-var(--bg-canvas)">Center Canvas</main>
  <aside className="border-l border-var(--border)">Right Sidebar</aside>
  <footer className="col-span-3 border-t border-var(--border)">Footer Status</footer>
</div>

```

---

## 3. 主题系统 (Theming)

使用 CSS 变量（CSS Variables）实现主题切换，Agent 修改 `data-theme` 属性即可。

### 核心变量定义:

| 变量名 | 浅色模式 (Light) | 深色模式 (Dark) | 用途 |
| --- | --- | --- | --- |
| `--primary` | `#2563eb` (Blue-600) | `#3b82f6` (Blue-500) | 品牌色、主要按钮 |
| `--bg-main` | `#ffffff` | `#0f172a` (Slate-900) | 背景色 |
| `--bg-canvas` | `#f8fafc` (Slate-50) | `#020617` (Slate-950) | 画布底色 |
| `--text-main` | `#1e293b` | `#f1f5f9` | 主要文字 |
| `--border` | `#e2e8f0` | `#1e293b` | 分割线、边框 |
| `--accent` | `#f59e0b` | `#fbbf24` | 告警、高亮状态 |

---

## 4. 国际化规范 (Internationalization / i18n)

Agent 不得在 UI 组件中硬编码中文或英文。必须通过 `i18next` 风格的 JSON 文件管理。

### 目录结构:

`src/locales/{en|zh}.json`

### JSON 范例:

```json
{
  "common": {
    "save": "保存 / Save",
    "cancel": "取消 / Cancel"
  },
  "skills": {
    "brainstorm": {
      "title": "头脑风暴 / Brainstorming",
      "add_node": "添加节点 / Add Node"
    }
  }
}

```

**Agent 指令：** “当生成 React 组件时，使用 `t('skills.brainstorm.title')` 获取文本。”

---

## 5. 核心组件交互规范

### A. 可视化节点 (Nodes)

* **选中态：** 增加 `ring-2 ring-primary` 边框。
* **状态颜色：** * `Accepted`: 绿色边框。
* `Rejected`: 灰色背景 + 中划线。
* `Processing`: 呼吸灯动画效果。



### B. 反馈输入框 (Feedback Input)

* 位于右侧边栏底部。
* 支持 **快捷短语**（如：“细化这个步骤”、“重新生成”）。
* 按下 `Cmd+Enter` 后，将当前选中的 `node_id` 和文本发送给 Agent。

---

## 6. 给 Agent 的排版家规 (Agent Constraints)

1. **禁忌：** 严禁使用固定 `px` 值定义画布内元素的绝对位置（除非是特定 PPT 场景）。应优先使用 Flexbox 和 Grid 以保持 JSON 的逻辑性。
2. **字体：** 默认使用系统无衬线字体族：`font-sans (Inter, system-ui)`。
3. **间距：** 严格遵循 4 像素倍数系统（`p-1`=4px, `p-4`=16px）。
4. **图标：** 统一使用 `Lucide-React` 库。
