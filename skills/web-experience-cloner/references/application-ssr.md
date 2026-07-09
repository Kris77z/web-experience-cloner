# 应用型 SSR/SPA 体验页分支

适用：React Router、Remix、Shopify Oxygen/Hydrogen、Next SSR/App Router、Nuxt SSR 等页面。它们看起来像创意落地页，但本质是应用路由：HTML、bundle、loader/API 响应、route base 和 hydration 数据共同决定运行时。

## 快速判断

常见信号：

- React Router / Remix / Oxygen：`window.__reactRouterContext`、streaming `<script>`、route manifest、`entry.client-*`、Hydrogen/Oxygen headers。
- Next SSR/App Router：`__NEXT_DATA__`、`/_next/static/`、RSC flight、`/_next/data`。
- Nuxt：`__NUXT__`、`/_nuxt/`、payload JSON。
- 同源请求：`/api/...`、route loader、`?index`、`_data=...`、Rive/media runtime config。
- 资源路径依赖当前 route：页面必须服务在原路径，例如 `/editions/spring2026/`，不能随便放到 `/`。

## L2 路线

1. 保存线上 SSR HTML，保持原始 route 路径。
2. 用浏览器滚目标屏幕，最好完整滚到页尾，导出：
   - `performance.getEntriesByType("resource")`
   - Network response/failed events
   - Console log/error/warn
   - `document.title`、`document.documentElement.scrollHeight`、key text
   - 目标屏幕截图
3. 区分四类请求：
   - CDN 静态资源：JS/CSS/font/image/wasm/video/texture。
   - 同源文档和 route loader/API：必须本地补齐或代理。
   - analytics/ads/beacon：可删除、stub 或列为无害噪音。
   - external auth/private：需要用户授权，不能保存敏感 token。
4. 静态本地 mirror 时，按原 route 保存 HTML：

```text
public/editions/spring2026/index.html
public/editions/spring2026/api/rive-runtime/agentic-plan
```

5. 本地验证必须访问原 route：

```text
http://127.0.0.1:<port>/editions/spring2026/?ref=...
```

6. 本地服务应禁用缓存或对 JS/CSS 加 cache-bust。React Router/Oxygen/Next 的 ESM chunk、
   dynamic import 和 loader 错误可能被浏览器缓存；修完文件后仍报错时先重启服务并换查询参数复测。

## 同源 API/loader 处理

同源 API 响应是 L2 的运行时资产。处理顺序：

1. 从 Network 找 404/failed/fetch/XHR。
2. 在线上请求同一路径，保存响应 body、content-type、状态码和简短说明。
3. 若响应稳定且不含敏感数据，可作为静态 fixture 放到同路径。
4. 若响应依赖 query、cookie、地理或会话，优先做本地代理或记录外部 blocker；不要保存 cookies/Authorization。

例：

```text
/editions/spring2026/api/rive-runtime/agentic-plan?media=productMedia
```

这个 route 返回 Rive `.riv` 和 webp assetsMap，不是图片本体；静态 mirror 缺这个文件会 404。

## 验证清单

- 本地 route、线上 route 一致。
- `scrollHeight` 与线上同 viewport 接近或一致。
- title、关键文案、首屏/滚动断点截图对齐。
- `performance` 资源数合理；关键 JS/CSS/API 200。
- Console 无 hydration fatal、dynamic import fatal、关键 API 404。
- 无框架级 "Reload page" / "Something went wrong" 兜底页；出现这类 UI 时继续查 chunk、loader、
  WASM/decoder、Rive/GLB/KTX2 等运行时资产。
- `asset-closure-scan` 对已知 CDN host 的缺失数为 0，或剩余项有明确无害说明。
- 剩余 abort/beacon/analytics 标为无害，不能混入渲染阻塞错误。
