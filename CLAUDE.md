# CLAUDE.md - 推荐系统运营管理后台

## 项目概述
茶百道小程序点单页推荐系统的运营管理后台，覆盖四层架构：选品池 → 排序策略 → 策略组合 → 投放计划。

## Tech Stack
- React 19 + TypeScript + Vite 8
- **Ant Design 6.x**（所有 UI 组件优先用 antd，不自己写样式）
- React Router 7
- Recharts（图表）
- @dnd-kit（拖拽排序）

## UI 规则（最重要）
- **使用 Ant Design 默认主题**，不改主色，不改 token
- 不要用 design-system/ 目录下的旧深色 tokens
- 布局用 antd `Layout`（Sider + Content），不要手写 CSS 布局
- 表格用 antd `Table`，表单用 antd `Form`，弹窗用 antd `Modal`/`Drawer`
- 按钮、标签、状态色全部用 antd 内置组件和语义色
- 间距用 antd `Space`/`Flex`，不要手写 margin/padding
- 图标用 `@ant-design/icons`
- **不要写自定义 CSS**，除非 antd 组件确实覆盖不了

## 全局导航结构
左侧 Sider 导航，分两组：

**核心分层 (LAYERS)**
- 候选层 (Candidates)
  - 商品候选池
  - 优惠券候选池
- 算法策略层 (Strategies)
  - 资源位策略编排
  - 策略实例
- 投放计划 (Delivery Plans)
- 数据报告层 (Reports)

**工具 (TOOLS)**
- 全链路预览

## 设计参考
- `figma 原型/` 目录下的 PNG 截图：只参考**内容结构和布局**，不参考颜色/主题/视觉样式
- 视觉样式、主题色、组件样式全部以 Ant Design 默认为准
- 所有 UI 必须用 antd 现有组件实现，如果遇到 antd 没有对应组件的情况，**停下来问用户确认**，不要自己造组件
- 可用 Pencil MCP 读取 `.pen` 文件作为补充参考

## 产品需求
- 详见 `PRD.md`（四层架构的完整 CRUD + 效果监控 + 全链路预览）
- 页面原型规格见 `PROTOTYPE-SPEC.md`（结构参考，忽略其中的深色主题配色）

## 目录结构
```
src/
├── pages/          # 页面组件
├── components/     # 通用组件
├── lib/            # 工具函数
└── styles/         # 全局样式（尽量少用）
```

## 开发原则
- Vibecoding 路线，功能优先，不纠结审美
- 能用 antd 组件解决的就不要自己造
- 页面结构跟着 PRD 走，不要自由发挥
- Mock 数据直接写在组件里，后续再接 API
