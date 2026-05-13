# PRD ↔ 原型 版本映射

> 本文件是飞书 PRD 与 GitHub 原型代码的桥接表。研发 / 测试 / 评审找 PRD 入口从这里。  
> 详细机制见 [Skill 管理 & PRD 协作机制](https://swn7zpxv453.feishu.cn/wiki/HlpcwmiRLiR6OPkldEZcQ4fhnEd)。

---

## 当前生效

| 项 | 值 |
|---|---|
| 仓库 | [chabaidao-growth/recommend-admin-prototype](https://github.com/chabaidao-growth/recommend-admin-prototype) |
| 原型 tag | `v1.0` |
| 预览 URL（GitHub Pages）| https://chabaidao-growth.github.io/recommend-admin-prototype/ |
| PRD 飞书链接 | [推荐系统运营管理后台 PRD（v3.2）](https://swn7zpxv453.feishu.cn/docx/GCBXdFXtboAMk2xoPIPcB6uRnSf) |
| 本地 PRD 副本 | [`PRD.md`](./PRD.md) |
| PRD 版本 | v3.2（2026-05-13）|
| 上线日期 | 2026-05-13 |

---

## 历史版本对应

| 原型 tag | PRD 版本 | 上线日期 | 变更说明 |
|---|---|---|---|
| `v1.0` | v3.2 | 2026-05-13 | 首个正式 tag。三层架构（删除投放计划层迁至装修）；策略组合层完整重构（资源位决定坑位数、组合 ID 自增、新建取消回滚、三层校验、查看-编辑切换）；商品候选池仅饮品 / MANUAL 跨品类；加权 α-β 公式；与装修系统衔接接口约定。 |

---

## 维护说明

- **PM 视角**：在飞书 PRD 顶部维护"版本日志"。修订 PRD 后告诉 Claude Code「对齐 PRD vX.Y」，Claude Code 会同步原型 + 升 tag + 更新本表。
- **研发视角**：以本表「当前生效」行为准；其他 PRD 版本对应的预览见历史版本的对应 tag。
- **本表唯一编辑责任人**：仓库 Maintainer / Org Admin / Claude Code 自动化。
