# Phase 1 · 侦察（Recon）

一把梭：`scripts/recon.sh <url> [outdir]`，做了下面 1–4。注意：这是静态初探，不是结论。
正式路线按 `clue-driven.md`：先分类，再沿线索取证。

## 1. 抓静态底料
- HTML、主 bundle、CSS。注意现代站常是 Astro/Next/Nuxt 预渲染 + 一个 hoisted bundle。
- 看 `<script src>`、`<link href>`、`modulepreload`，以及框架全局：`__NEXT_DATA__`/`__NUXT__`/`data-astro-*`。
- 看 SSR/应用线索：`window.__reactRouterContext`、Remix/Oxygen/Next loader 数据、同源 `/api` 或 route JSON。

## 2. 库签名扫描（在 bundle 里 grep）
| 命中 | 说明 |
|------|------|
| `THREE` / `WebGLRenderer` | Three.js（可能是裁剪内联版） |
| `gsap` / `SplitText` / `ScrollTrigger` | GSAP 动画 |
| `rive` / `@rive-app` | Rive 矢量动画（WASM） |
| `splat` / `SplatSorter` / `.sog` | 3D 高斯泼溅 |
| `TSL` / `wgsl` / `WebGPU` | 新一代 node/WebGPU 着色（拦截器可能抓不到，需深读 bundle） |
| `lenis` / 自研 `ScrollManager` | 平滑滚动 |

## 3. 技术关键词计数
`RenderTarget`/`FBO`/`Bloom`/`Bokeh`/`TAA`/`SMAA`（后处理链）、`noise`/`fbm`/`curl`（程序化）、
`instanc`（实例化）、`morph`/`displacement`、`gobo`/`harmonics`（光照）、`sdf`/`raymarch`。
计数高低能快速判断"这站重不重 WebGL、用了哪些套路"。

## 4. 资产引用初探
HTML 里直接可见的 `.webp/.mp4/.glb/.hdr/...`。但**完整资产清单要等 Phase 5 用浏览器实测**——
很多资产是 JS 运行时按需 fetch 的，HTML 里看不到（`.buf`/`.sog`/`.riv`/贴图等）。
同源 API/loader 响应也算运行时依赖；不要只记录图片/JS/CSS。

## 5. 分类输出

写一个简短分类卡，至少包含：

```json
{
  "canonicalUrl": "",
  "route": "",
  "viewport": "",
  "siteType": "creative-engine|platform-export|application-ssr|static-spa|mixed",
  "signals": [],
  "blockingUnknowns": [],
  "nextReference": "",
  "nextProbe": ""
}
```

只有当分类卡能解释下一步为什么读 `runtime-capture.md`、`platform-export.md` 或
`application-ssr.md` 时，才进入深挖。

## 输出
`recon/index.html`、`recon/bundle.min.js`，以及上面四类扫描结果。
下一步：`js-beautify recon/bundle.min.js -o deobf/bundle.beauty.js`，进入 Phase 2。
