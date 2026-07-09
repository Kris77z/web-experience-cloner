# Phase 5 · 整站 1:1 本地副本

## 核心认知
对堆满高斯泼溅/光场/自研流体的复杂站，"整站 1:1"= **镜像全部资产 + 复用站点自己的（压缩）
bundle**，本地以根路径服务。这是**功能级 1:1**，不是从零重写——开工前向用户讲明、提示版权。

若分类结果是 Framer/Webflow/Readymag 等平台导出站，先读 `platform-export.md`；这类站的主要风险是
hydration、ESM 动态 import、CMS 数据、appear 动效和模块缓存，而不是 WebGL 管线。

若分类结果是 React Router/Remix/Oxygen/Next SSR 等应用型体验页，先读 `application-ssr.md`；这类站的
主要风险是 route base、hydration 数据、同源 API/loader 响应和 CDN bundle，而不是“缺几张图片”。

## 1. 拿权威资产清单（别手猜路径）
浏览器滚完整站后，从实测请求导出：
```
// list_network_requests 看 reqid/URL，或更干净地：
mcp__chrome-devtools__evaluate_script({
  filePath: 'asset-urls.json',
  function: `() => {
    const u = performance.getEntriesByType('resource').map(e=>e.name);
    u.push(location.href);
    const same = [...new Set(u.filter(x=>x.startsWith(location.origin) && !x.startsWith('blob:')))].sort();
    const ext  = [...new Set(u.filter(x=>!x.startsWith(location.origin) && !/^(blob|data):/.test(x)))].sort();
    return { same, ext };
  }`
})
```
先**全站分步滚动**触发懒加载（每屏等 ~250ms），否则漏资产。把 `same` 去掉 origin 写成路径清单。
同时导出 Network response/failed events，因为 worker 请求、同源 API、beacon abort、loader JSON 可能不完整出现在
`performance` 里。

滚动策略要覆盖首屏、所有 section、页尾，并在页面稳定后再读一次 `performance`。对滚动驱动的体验页，
至少执行一次 top -> bottom 的完整扫描；若有 WebGL/Rive/视频懒加载，重载后再扫一次，防止首次缓存掩盖缺失。

## 2. 镜像
`scripts/mirror-assets.sh <base-url> paths.txt public`
- **顺序下载 + 重试**：并发在沙箱里触发 HTTP 000 限流（真实踩过，15/134 失败，顺序重试后全绿）。
- 检查零字节文件（静默失败）。
- 别忘 worker 里 fetch 的文件（如 `splat_sorter_bg-*.wasm`）和 worker JS 本身——
  它们不在主线程 `performance` 里，需从 network 列表或 bundle 引用补抓。
- 若清单中是完整 URL，脚本会按 `public/<host>/<path>` 保存；这比把所有 CDN 资源拍平成一个目录更稳。

## 3. 资产闭环门禁
L2 不是“首屏能看”，而是资源闭环。至少合并三类证据：

- **运行时实测**：线上和本地完整滚动后的 Network / `performance` / console。
- **静态扫描**：镜像目录里 HTML/CSS/JS/JSON/SVG 对远程 URL 的引用。
- **本地服务日志**：404、500、Broken pipe 噪声、Range 请求异常、API route 缺失。

运行静态扫描：

```bash
node skills/web-experience-cloner/scripts/asset-closure-scan.mjs public
```

若只想检查指定 CDN：

```bash
node skills/web-experience-cloner/scripts/asset-closure-scan.mjs public 'cdn.shopify.com|myshopify.com|gstatic.com'
```

重点扩展名：`.glb`、`.gltf`、`.ktx2`、`.riv`、`.wasm`、`.worker.js`、`.mp4`、`.webm`、
`.m3u8`、`.ts`、`.woff2`、`.json`、图片和 CSS/JS chunk。缺失数不为 0 时继续补资源。

本地复测时用无缓存服务或 cache-bust URL，尤其是 ESM 动态 import、React Router route chunk、Rive runtime
和 Draco/KTX2 decoder；浏览器有时会缓存一个失败模块，导致修完文件后仍显示旧错误。

## 4. 页面外壳
- 纯静态站：直接把线上 `index.html` 放 `public/`，CSS/bundle/资产都用根相对路径 → 服务 `public/` 即可。
- 应用型 SSR/SPA：保持原始 route 路径，例如线上 `/editions/spring2026`，本地也放
  `public/editions/spring2026/index.html` 并从同路径访问。
- 检查 HTML 里硬编码的绝对 URL（`https://target/...`）：SEO meta（og:image/canonical）无害；
  真正会发请求的（脚本/样式）才需要改本地。
- CSS 里的 `url()` 若非根相对需改写。
- 同源 API/loader 响应按原路径放静态 fixture 或做本地代理；不要让静态 server 404 后再用视觉调参掩盖。

## 5. 跑通 + 验证
```bash
cd public && python3 -m http.server 8099 --bind 127.0.0.1
```
浏览器打开本地副本，**逐章节截图与线上比对**。控制台只应剩无害错误（分析打点 CORS、favicon 404）。
WebGL/资产报错必须根因修复。

最低验证集：
- `document.title`
- `document.documentElement.scrollHeight`
- key text / section count
- 三个以上滚动断点截图
- `performance` 外部请求摘要
- console error/warn 和 404/fetch failed 分类
- `asset-closure-scan` 缺失数
- 本地 server 404 清单

若页面出现平台自带的 "Reload page" / "Something went wrong" / hydration fatal，不要把它当普通视觉差异；
通常是动态 import、route loader、API fixture、WASM/decoder 或运行时资产缺失。

## 常见外部依赖（留到 Phase 6 处理）
品牌字体（Typekit/Google）、运行时 wasm（Rive 从 unpkg）、视频（Vimeo/YouTube）、分析打点。
联网时这些自动从 CDN 加载，已是 1:1；要彻底离线见 `offline.md`。
