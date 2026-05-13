# recommend-admin-prototype

> 茶百道小程序点单页**推荐系统运营管理后台**的 Vibecoding 高保真原型。  
> 配套完整 PRD 文档，三层架构覆盖选品池 → 排序策略 → 策略组合，与装修系统按"组合 ID"对接。

## 在线预览

[https://chabaidao-growth.github.io/recommend-admin-prototype/](https://chabaidao-growth.github.io/recommend-admin-prototype/)

每次 push 到 `main` 自动通过 GitHub Actions 部署到 GitHub Pages。

## PRD ↔ 原型版本

完整版本映射见 [`PRD-LINKS.md`](./PRD-LINKS.md)。

- 当前 PRD：[飞书文档 v3.2](https://swn7zpxv453.feishu.cn/docx/GCBXdFXtboAMk2xoPIPcB6uRnSf) / 本地副本 [`PRD.md`](./PRD.md)
- 当前原型 tag：`v1.0`

## 核心架构

```text
策略组合 → 排序策略 → 选品池 → 商品
   │
   └─► 装修系统按"资源位 → 组合 ID"映射调用
```

| 层 | 实体 | 做什么 |
|---|---|---|
| 第一层：选品池 | Pool | "哪些商品可以被推荐"（仅饮品）|
| 第二层：排序策略 | Strategy | "候选商品如何排序"（HOT / NEW / MANUAL / ALGORITHM）|
| 第三层：策略组合 | Combination | "一个资源位上多个策略如何排到不同坑位"（绑定资源位，坑位数由装修锁定）|

详见 [`PRD.md`](./PRD.md)。

## 技术栈

- **React 19** + **TypeScript** + **Vite 8**
- **Ant Design 6.x**（默认主题，不改 token）
- React Router 7 + Recharts + @dnd-kit
- 部署：GitHub Actions → GitHub Pages

## 快速启动

```bash
npm install
npm run dev          # 开发服务器 http://localhost:5173/recommend-admin-prototype/
npm run build        # 构建到 dist/
npm run preview      # 预览构建产物
npx tsc -b           # 类型检查
```

## 目录结构

```text
.
├── PRD.md                # 完整 PRD（本地副本，飞书为真源）
├── PRD-LINKS.md          # 飞书 PRD ↔ 原型 tag 桥接表
├── CLAUDE.md             # 项目向 Claude Code 的协作约定
├── src/
│   ├── pages/            # 页面（List / Edit 按层划分）
│   ├── components/       # 通用布局（shell / sider / breadcrumb）
│   ├── lib/              # 数据模型与 mock store
│   │   ├── types.ts
│   │   ├── mockData.ts
│   │   ├── store.tsx     # localStorage 持久化 + DATA_VERSION 迁移
│   │   └── domain.ts
│   └── styles/
└── public/               # 静态资源
```

## 协作机制

本仓库归属 [chabaidao-growth](https://github.com/chabaidao-growth) org，遵循 [Skill 管理 & PRD 协作机制](https://swn7zpxv453.feishu.cn/wiki/HlpcwmiRLiR6OPkldEZcQ4fhnEd)。

- **PM 视角**：在飞书 PRD 顶部维护版本日志；在本地仓库打开 Claude Code 说"对齐 PRD vX.Y"即可
- **研发视角**：以 [`PRD-LINKS.md`](./PRD-LINKS.md) 当前生效行为准
- **AI 多代理协作**：本版本经历 codex（2 轮）+ qwen（1 轮）共 3 轮 PRD 审阅 + 前端代码 cross-validate

## UI 规则

- 所有交互组件用 antd，不自己造（按钮 / 表单 / 弹窗 / 表格 / 标签 / Tag / Empty / Modal / message…）
- 不改 antd 默认主题、不写自定义 CSS（除非 antd 实在覆盖不了）
- 间距用 antd 网格（4 / 8 / 12 / 16 / 20 / 24 / 32 / 48），不写魔法数字
- 颜色用 `theme.useToken()` 动态读取，不硬编码 hex
- 详见 [`CLAUDE.md`](./CLAUDE.md) 与 `ux-helper` skill

## 修订协作

PRD 与原型的每次版本迭代都通过 A2A（agent-to-agent）协议在同一 workspace 内分工：

- **claude（本仓库 maintainer agent）**：理解需求 / 协调任务 / 维护 PRD 一致性
- **qwen**：执行前端代码改动 + PRD-vs-code 交叉验证
- **codex**：PRD 文档审阅 + 业务逻辑闭环把关

任何 PRD 修订会触发联动检查清单（资源位语义 / 校验 / 模式约束 / 装修衔接），通过后才落到 `PRD.md` 与对应代码。

## License

私有 / 内部仓库（按 chabaidao-growth 组织策略管理）。

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
