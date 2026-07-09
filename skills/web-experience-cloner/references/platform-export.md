# 平台导出站分支（Framer / Webflow / Readymag 等）

适用：站点主要由可视化建站平台导出，运行时是 React/平台 runtime + 大量 ESM/CSS/图片/字体/CMS 数据。
这类站的 1:1 难点通常不是 shader，而是本地化后仍能正确 hydration、动态加载和播放原本的 appear/scroll 动效。

## 快速判断

常见信号：
- Framer：`framerusercontent.com`、`app.framerstatic.com`、`data-framer-*`、
  `__framer__handoverData`、`modulepreload`、`.framercms`、`events.framer.com`。
- Webflow：`webflow.js`、`data-w-id`、`data-wf-*`、Webflow IX2 JSON、`uploads-ssl.webflow.com`。
- Readymag/其他 builder：平台 CDN、平台编辑器/analytics、导出 HTML 里大量平台私有 `data-*`。

若同时存在 WebGL canvas/Rive/WASM/大模型资产，把平台壳按本文处理，把特效子系统按
`runtime-capture.md` / `deobfuscation.md` 处理。

## 侦察与资产清单

1. 抓原始 HTML、首屏截图、完整滚动后的截图和 `performance.getEntriesByType("resource")`。
2. 记录同源请求、外部请求、失败请求、console error/warn。平台站常在滚动后才拉图片、CMS 或动态 route chunk。
3. 对 ESM 站额外扫描：
   - `<link rel="modulepreload">`
   - `<script type="module" src="...">`
   - `import("...")`、`import(\`...\`)`
   - `from "..."` / `from '...'`
   - `new URL(spec, base)`
4. 保持远端目录结构镜像到本地，例如 `/framerusercontent.com/sites/<id>/...`、`/fonts.gstatic.com/...`。

## URL 本地化规则

普通资源 URL 可以从 `https://host/path?query` 改成 `/host/path?query`，但不要机械替换所有字符串。

重点坑：
- `new URL("./x", "https://host/path/file.mjs")` 的第二个参数是 URL API 的 base。
  若被改成 `"/host/path/file.mjs"`，浏览器会抛 `Invalid base URL`。应改成
  `location.origin + "/host/path/file.mjs"`，或保留合法绝对 URL 语义。
- 动态 import 可能用反引号：`import(\`./chunk.mjs\`)`。扫描规则必须覆盖 `"`, `'`, `` ` ``。
- `modulepreload`、入口 `<script type="module">`、动态 import 链要同时改，否则可能预加载旧 URL、执行新 URL。
- 浏览器会缓存 ESM 模块。修过 bundle 后，给入口链加短 query（如 `?v=basefix1`）强制取新模块。
- 图片可把本地文件按不带 query 的 canonical path 保存，但 HTML/CSS 里保留 query 通常没问题；静态服务器会忽略 query 找文件。
- SEO meta/canonical/og:image 若不会发运行时请求，可以不强行改；脚本、样式、字体、图片、wasm、CMS 才必须本地化。

## Hydration / 白屏排查

平台导出站白屏常见形态：标题已加载，HTML 有内容或只剩平台 badge，但主应用没挂载。

检查顺序：
1. Console：找 fatal error，例如 `Invalid base URL`、`Failed to fetch dynamically imported module`、
   `Cannot find module`、CMS/JSON parse error。
2. DOM：检查 `document.readyState`、`#main` 子节点数、`document.body.innerText`、首屏 visible elements。
3. Network：检查入口 module、首屏 page chunk、CMS chunk、字体和关键图片是否 200；404 的懒加载 route chunk要记录。
4. Cache：修过 ESM 后普通刷新仍白屏时，给入口链加 query 或用 ignore-cache reload。
5. 平台噪音：analytics/editor 初始化可以移除或 stub，但不要删掉 hydration 需要的数据脚本。

Framer 典型可移除/替换：
- `events.framer.com` analytics script。
- `https://framer.com/edit/init.mjs` 可替换为返回空 `createEditorBar()` 的 data module。

Framer 典型不可随便删：
- `__framer__handoverData`
- `data-framer-hydrate-v2` / route/handover 相关数据
- CMS `.framercms`、collection module、动态 route import

## 动效保真

不要为了避免白屏把所有 `opacity:0` / transform 直接改最终态。平台导出站的质感常来自 appear
和 scroll reveal。

验证方法：
- 对首屏和几个滚动断点截图。
- 采样关键文本/图片元素的 opacity、transform，确认从隐藏态进入可见态，而不是一开始静态可见。
- 对 Framer，留意 `data-framer-appear-id`、`data-framer-name`、`__framer__animateOnce`、
  `data-framer-component-type` 和带 `opacity:0;transform:...` 的 style。
- 若平台 runtime 在本地无法触发原 appear，可用很窄的 fallback：IntersectionObserver + 原始 easing/stagger
  让元素进入视口后播放，不要全局覆盖所有透明元素。跳过居中箭头、遮罩、装饰线等非 reveal 元素。

## 离线化

常见外部项：
- 平台 CDN：Framer runtime chunk、Webflow assets。
- 字体：Google Fonts、Fontshare、Typekit。
- Smooth scroll/小库：Lenis、lottie/rive runtime。
- Analytics/editor：删除或 stub。

离线验证：
```js
performance.getEntriesByType("resource")
  .map(e => e.name)
  .filter(u => !u.startsWith(location.origin) && !/^(data|blob):/.test(u))
```
理想为空；若还有第三方视频/API，记录原因和降级策略。

## 交付验证清单

- 首屏截图与线上对齐。
- 完整页截图与页面高度对齐。
- 桌面和移动至少各一轮。
- 滚完整页后外部请求为 0，或列出剩余项。
- Console 无 fatal error；无影响渲染的 404/CORS。
- 关键 reveal/word stagger/scale/fade 动效已抽样验证。
- 若修过 ESM bundle，入口链已 cache-bust，避免用户刷新还拿旧模块。
