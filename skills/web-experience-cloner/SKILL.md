---
name: web-experience-cloner
description: >
  逆向、复刻、离线化高保真 Web 体验的全流程技能。覆盖自研创意引擎站
  （WebGL/Three.js/GSAP/Rive/高斯泼溅/光场等）和平台导出站（Framer/Webflow/Readymag
  等）、应用型 SSR/SPA 体验页（React Router/Remix/Oxygen/Next/Nuxt 等）：站点分类
  → 线索取证 → 静态反混淆/运行时捕获 → 组件化原理文档 → 整站 1:1 本地副本 →
  资源闭环审计 → 完全离线化 → 从零重写单个特效。当用户想逆向/复刻/拆解某个网站的动画、
  做可离线运行的本地副本、排查本地复刻白屏/hydration/API/资源问题、补齐懒加载资源、
  或把某个特效移植成独立 demo 时使用。
---

# Web Experience Cloner

逆向并**完整落地**复杂 Web 体验的技能。脱胎于 `web-shader-extractor`（只抽单个特效），
扩展为覆盖**分类 → 线索取证 → 理解 → 复现 → 离线 → 重写**的端到端闭环。已在三类站点上跑通：
oryzo.ai（自研 Three.js + GSAP + Rive + 3D 高斯泼溅 + 切片光场）、Reset Wellness
（Framer 导出站）和 Shopify Editions Spring 2026（Oxygen/React Router SSR 应用体验页）。

## 核心原则
1. **先分类，再 1:1，再简化**。先判断站点类型，再选工作流；确认无误后才提"简化/优化"，且简化须用户拍板。
2. **线索驱动，拒绝扫库式蛮干**。每一步都要说明正在消灭哪个未知数，优先最低成本的目标绑定证据。
   先 `CLASSIFY -> ATTRIBUTE -> LOCK -> TRACE -> MIRROR/REPLAY -> VERIFY`，再做清理和离线化。
3. **证据驱动，拒绝臆测**。着色器、uniform、资产清单、API 响应、运行时报错一律用**运行时实捕**或
   **实测网络请求**得到，不靠"大概是 GSAP/Three.js"这类猜测。关键事实标 `SOURCE/PARTIAL/GUESS`。
4. **本地化不破坏运行时语义**。URL 重写、动态 import、`new URL(spec, base)`、`modulepreload`、
   字体、wasm、CMS 数据和缓存版本都要验证，不能只靠字符串替换。
5. **资源闭环才算完成**。首屏能看不等于 L2 完成；必须滚完整页、触发懒加载、静态扫描远程 URL、
   重启无缓存本地服务并复测，直到关键资源缺失数为 0。
6. **baseline 不可覆盖**。L2 原 bundle baseline、L3 离线版、L4 重写版分目录保存；不要用重写版冒充 1:1。

## 工具前置：按站点类型选择
自研 WebGL/Canvas/Rive 站强依赖运行时拦截。若要做 shader/uniform 捕获，开工前先确认工具集里有
`mcp__chrome-devtools__navigate_page` / `mcp__chrome-devtools__evaluate_script`。若没有：
- 让用户安装：`claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest`
- **常见坑**：该包要求 Node ≥20，而用户默认常是 v18 → server 连得上但工具加载失败。
  解决：写一个固定 PATH 到 Node20 的包装脚本再注册（见 `references/environment-setup.md`）。
- 装好后**必须重启会话**让工具 schema 重新加载——CLI 显示 Connected 不等于工具已进当前会话。
- **不要**用 Playwright headless 代替 WebGL 捕获：它抓不到着色器源码与复杂 WebGL 渲染管线。

平台导出站（Framer/Webflow 等）不一定需要 shader 捕获。优先用浏览器实测网络请求、console、
DOM/hydration 状态和截图验证。细节见 `references/platform-export.md`。

应用型 SSR/SPA 体验页（React Router/Remix/Oxygen/Next SSR 等）必须保持原 route 语义，捕获同源
loader/API 响应。细节见 `references/application-ssr.md`。

若 Chrome DevTools MCP 因 profile lock 或工具缺失不可用，可用自建 Chrome remote debugging protocol
脚本作为 fallback 完成截图、Network、Runtime、Performance 实捕；记录这个能力降级。不要把 CDP
fallback 当作 shader frame capture 的完整替代。

## 决定要做到哪一步（先问用户）
这套流程是分级的，成本差异极大。开工前用一到两个问题明确**交付目标**：

| 级别 | 交付物 | 典型成本 |
|------|--------|----------|
| L0 分类 | 站点类型判断 + 复刻路线图 | 低 |
| L1 文档 | 每个动画组件的原理文档（中/英） | 低 |
| L2 整站 1:1 副本 | 镜像资产 + 复用原 bundle，本地跑通 | 中 |
| L3 完全离线 | 字体/wasm/视频/打点全本地化 | 中 |
| L4 从零重写 | 不依赖原代码，独立实现某特效 | 高（按特效计） |

L2/L3 跑的是**站点自己的（压缩）代码**——这是复杂站"整站 1:1"的唯一现实路径，必须向用户讲明
（功能级 1:1 ≠ 从零重写）。L4 才是算法级重写。也要提醒**版权**：仅供本地研究，勿对外部署。

---

## 工作流（按阶段）

### Phase 0 · 分类与路线选择
目标：不要把 ORYZO 型 WebGL 流程硬套到 Framer/Webflow/SSR 应用页，也不要漏掉混合站里的
canvas/WebGL 子系统。先读 `references/clue-driven.md` 的状态机和证据标签。

1. 抓首页 HTML、主脚本/CSS、首屏截图和滚动后的 `performance.getEntriesByType('resource')`。
2. 按信号分类：
   - **自研创意引擎站**：`THREE`、`shaderSource`、`webgl`、`rive`、`wasm`、`splat`、模型/纹理、一个大型主 bundle。
   - **平台导出站**：`framerusercontent.com`、`data-framer-*`、`__framer__handoverData`、Webflow IX、CMS JSON/二进制数据、`modulepreload`、大量 ESM chunk。
   - **应用型 SSR/SPA 体验页**：React Router/Remix/Oxygen/Next SSR、streaming HTML、`__reactRouterContext`、
     `__NEXT_DATA__`、同源 `/api`/loader route、route 相对资源、hydrate 数据。
   - **普通静态/SPA 站**：框架导出 + 常规图片/字体/API，少量动画库。
3. 选择分支：
   - 自研创意引擎站：走 Phase 1–4 的反混淆和运行时拦截，再做 L2/L3。
   - 平台导出站：优先读 `references/platform-export.md`，再走 Phase 5/6；只有发现 canvas/WebGL 子系统时才读运行时拦截文档。
   - 应用型 SSR/SPA 体验页：优先读 `references/application-ssr.md`，保留原 route，捕获同源 API/loader，再走 L2。
   - 混合站：平台/应用壳按对应分支处理，独立 WebGL/Rive/canvas 组件按创意引擎流程处理。
4. 生成或更新最小证据卡：目标 URL、route、viewport、站点类型、关键未知数、下一步 probe、证据路径。

### Phase 1 · 侦察（Recon）
目标：一次加载最大化采集。
1. `curl` 抓 HTML + 主 bundle + CSS（静态底料）。
2. 扫框架签名/库（`THREE`/`gsap`/`rive`/`splat`/`wgsl`…）与技术关键词
   （`RenderTarget`/`FBO`/`noise`/`curl`/`Bloom`/`instanc`…）。
3. 用 `scripts/recon.sh <url>` 一把梭：抓取 + 计数 + 列资产引用。
详见 `references/recon.md`。

### Phase 2 · 静态反混淆
1. `js-beautify` 把 min bundle 还原成可读多行（1MB→约3万行）。
2. **类名语义还原**是金矿：现代打包常保留 class 名（`HeroScene`/`ThermodynamicOverlay`/
   `LetterFlippers`…），几乎与页面区块 1:1 对应，直接给出组件清单。
3. 定位关键类与共享 uniform / shader chunk 注册表。
详见 `references/deobfuscation.md`。

### Phase 3 · 运行时拦截（核心）
仅在分类结果显示存在 WebGL/Canvas/Rive/复杂 GPU 管线时执行；平台导出站没有这些信号时跳过。

1. `navigate_page` 时用 `initScript` 在**页面脚本之前**注入 WebGL 拦截器
   （hook `shaderSource`/`linkProgram`/`uniform*`/`bindFramebuffer`/`getUniformLocation`）。
   拦截器全文见 `scripts/gl-interceptor.js`。
2. **逐章节滚动**触发各 Section 的着色器**按需编译**，记录每段新增的 program + 截图。
3. 把完整捕获（所有 program 的 GLSL + 所有 uniform 实参）用 `evaluate_script` 的
   `filePath` 直接落盘，**不要塞进上下文**（可能是几十段 GLSL）。
4. 用 `scripts/split-shaders.mjs` 把捕获拆成单文件并按关键词分类。
详见 `references/runtime-capture.md`。

### Phase 4 · 组件化文档（L1）
对每个组件成文：视觉描述（配截图）+ 类/着色器/uniform 证据（标行号）+ 原理 + 复刻要点。
另写一篇**架构总览**（引擎、后处理链、滚动系统、公共 GLSL chunk）+ 一篇**通用动画引擎**
（二阶动力学、Wiggle、布朗、缓动等横切原语）。模板见 `references/doc-templates.md`。

### Phase 5 · 整站 1:1 副本（L2）
1. **资产清单要从浏览器实测网络请求拿**（`list_network_requests` +
   `performance.getEntriesByType('resource')`），不要手猜路径。必须先自动滚完整页，等待懒加载稳定。
2. 用 `scripts/mirror-assets.sh` 镜像全部资产，**保持目录结构**。
   坑：并发下载会触发沙箱限流（HTTP 000）→ 改**顺序 + 重试**，失败项二次重试。
3. 对镜像目录运行 `scripts/asset-closure-scan.mjs public`，静态扫描 HTML/CSS/JS/JSON 中的远程资产引用；
   优先补齐 `.glb/.ktx2/.riv/.wasm/.worker.js/.mp4/.webm/.m3u8/.woff2` 等运行时资产。
4. 纯静态站（Astro/Next 导出）直接根路径服务 `public/` 即可，绝对路径自动解析。
5. 起无缓存静态服务器，浏览器打开，**逐章节截图与线上比对**，修路径/CORS/字体。
6. 若是 Framer/Webflow 等平台导出站，额外检查 hydration、动态 import、`modulepreload`、CMS 数据、
   appear 动效和模块缓存；具体清单见 `references/platform-export.md`。
7. 若是 React Router/Remix/Oxygen/Next SSR 等应用页，必须保持原始 route，并镜像同源 API/loader
   JSON 响应；具体清单见 `references/application-ssr.md`。
8. 收尾前重启本地服务、cache-bust 路由、从首屏滚到底；浏览器资源错误、server 404 和静态缺失清单必须全清。
详见 `references/site-mirror.md`。

### Phase 6 · 完全离线化（L3）
把外部依赖逐个本地化：字体（Typekit/Google）、运行时 wasm（Rive 等）、视频（Vimeo/YouTube）、
分析打点（删除）。bundle 内常是 `.concat()` 拼 URL → 做字面量替换。
重载后用 `performance` 核对"外部请求归零"。详见 `references/offline.md`。

### Phase 7 · 从零重写特效（L4）
挑**自包含的 2D 全屏 shader 特效**最易（curl 流体、LUT、噪声场）。
用实捕的 GLSL 作"真值"，原生 WebGL2 + ping-pong FBO 重建，不依赖原框架。
**关键坑**：参数依赖纹理尺度（如平流位移 = `vel·texelSize`，push 强度常需放大 10×+）；
对齐色彩空间（全程线性，末端才 sRGB）；对齐时间基。浏览器截图验证行为，而非凭空调参。
详见 `references/rewrite.md`。

---

## 交付与验证
- 每阶段都要**截图比对**（本地 vs 线上），根因修复而非调参掩盖差异。
- L2/L3 交付必须报告资源闭环结果：实测资源数、补齐数、静态缺失数、浏览器资源错误数、server 404 数。
- 产出建议结构见 `references/output-structure.md`（理解线 / 复现线 分库 + 顶层进度看板）。
- 收尾问用户：是否生成进度看板、是否继续 L3/L4、是否需要逐章节复核。

## 参考索引
| 需要 | 看 |
|------|----|
| 环境/MCP 安装与 Node 坑 | `references/environment-setup.md` |
| 线索驱动状态机、证据标签、gate | `references/clue-driven.md` |
| 侦察细节 | `references/recon.md` |
| 反混淆技巧 | `references/deobfuscation.md` |
| 运行时拦截（含拦截器原理） | `references/runtime-capture.md` |
| 文档模板 | `references/doc-templates.md` |
| 整站镜像 | `references/site-mirror.md` |
| Framer/Webflow 等平台导出站 | `references/platform-export.md` |
| React Router/Remix/Oxygen/Next SSR 应用页 | `references/application-ssr.md` |
| 离线化 | `references/offline.md` |
| 从零重写 | `references/rewrite.md` |
| 产出目录结构 | `references/output-structure.md` |
| 各类技术识别速查（高斯泼溅/光场/MSDF/TAA…） | `references/tech-cheatsheet.md` |
