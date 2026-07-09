# 线索驱动工作法

本技能借鉴 `web-shader-extractor` 的关键思想：不要从“全量资源”或“框架名字”开始，而是从用户要复刻的目标体验开始，逐步锁定产生它的 surface、route、bundle、API 和资源。每一步都要减少一个明确未知数。

## 状态机

```text
INTAKE
-> CAPABILITY_SNAPSHOT
-> QUICK_SCOUT
-> CLASSIFY
-> TARGET_ATTRIBUTION
-> LOCK
-> TRACE_ROUTE_SELECT
-> CAPTURE_MINIMUM_TRUTH
-> MIRROR_OR_REPLAY_READY
-> RAW_L2_BASELINE
-> BASELINE_VERIFY
-> OFFLINE_OR_REWRITE
```

## 工作规则

每个动作写成：

```text
state: CLASSIFY
unknown: page is static export, platform export, creative WebGL, or SSR app
action: inspect HTML signatures + runtime resource entries + console/network
expected evidence: classification table and next branch
```

无效动作：

```text
try again
download every asset and see
make it look closer
```

有效动作必须改变至少一个条件：工具、viewport、route、证据源、目标 surface、交互状态、bundle slice、API 响应、或根因假设。

## 证据标签

关键实现事实要标注：

- `SOURCE`：目标绑定的直接证据。例：运行时 network body、captured shader、source-mapped module、runtime object、截图对比。
- `PARTIAL`：目标绑定线索，但值或 wiring 未证明。例：bundle 里的类名、可疑 API URL、资源 URL、framework signature。
- `GUESS`：视觉拟合、命名推断、手调参数、无运行时证据的默认值。

不要因为截图相似就把 `GUESS` 升成 `SOURCE`。

## Leaf Facts 与 Wiring Facts

分开验证：

- Leaf facts：HTML、CSS、shader、asset URL、API JSON、字体、wasm、图片尺寸。
- Wiring facts：route base、hydration 数据、pass order、dynamic import、API 消费路径、scroll/input/time coupling、DOM/canvas composite。

一个 CDN URL 是 `SOURCE`，不代表它在目标屏幕中被消费；一个 shader 字符串是 `SOURCE`，不代表 pass order 已知。

## Gate

### CLASSIFIED

必须有：
- canonical URL、route、viewport、DPR。
- 站点类型：creative-engine / platform-export / application-ssr / static-spa / mixed。
- 关键证据路径：HTML、首屏截图、runtime resource/network 摘要。
- 下一步分支。

### LOCKED

必须有：
- 目标屏幕/章节与对应 DOM/canvas/API/asset 的归因。
- 入口 bundle 或 SSR HTML 外壳。
- 必要 route 语义和同源 API/loader 列表。
- 剩余未知数和下一步 probe。

### BASELINE_VERIFIED

必须有：
- 本地 URL 可访问。
- `scrollHeight` / route / title / key text 对齐。
- 逐屏截图对比。
- network/console 中无渲染阻塞错误。
- 已记录 known gaps，不能用调参掩盖。

## 从三个案例得到的分类线索

| 案例 | 类型 | 关键线索 | 主要风险 |
|---|---|---|---|
| Oryzo | creative-engine static | Astro + hoisted bundle + WebGL/Rive/WASM/splats | shader/runtime/wasm/video 离线化 |
| Reset Wellness | platform-export | Framer runtime + ESM chunks + images/fonts/CMS | hydration、dynamic import、appear 动效 |
| Shopify Editions | application-ssr mixed | Oxygen/React Router streaming SSR + WebGL/Rive + 同源 API | route base、loader/API JSON、CDN bundle、hydration |

