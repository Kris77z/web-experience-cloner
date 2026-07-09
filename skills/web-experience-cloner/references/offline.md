# Phase 6 · 完全离线化

把外部依赖逐个本地化，目标：重载后 `performance` 里**外部请求归零**（或只剩无法处理的）。

## 通用手法：bundle 里的 URL 字面量替换
打包代码常用 `.concat()` / 模板串拼 CDN URL。用 node 做**字面量替换 + 计数验证**：
```js
function patch(file, pairs){
  let s=fs.readFileSync(file,'utf8');
  for(const [from,to] of pairs){ const n=s.split(from).length-1; s=s.split(from).join(to);
    console.log(`${n}×  ${from.slice(0,50)}`); }
  fs.writeFileSync(file,s);
}
```
替换后 `grep` 确认外部 host 残留为 0。

## 1. 字体（Adobe Typekit / Google Fonts）
- 找 `@import`（常藏在主 CSS 里）或动态注入的字体 CSS。
- 下载字体 CSS，再下载它 `src:url(...)` 引用的 woff2/woff 到本地。
- 写一份本地 `@font-face`（指向本地文件），把 `@import` 改指它。
- 验证：`document.fonts.check('16px "FontFamily"')` 为 true。
- 注意：许可字体本地化仅供研究，勿再分发。

## 2. 运行时 wasm（如 Rive）
- bundle 里形如 `"https://unpkg.com/".concat(name,"@",ver,"/rive.wasm")` → 替换成 `"/vendor/rive.wasm"`。
- 别忘 fallback（`rive_fallback.wasm` 从 jsdelivr）。下载到 `public/vendor/`。

## 3. 视频（Vimeo / YouTube）
- **难点**：Vimeo/YouTube 多数只给 HLS/DASH 分片，无 progressive mp4；config 端点对 curl 返回 403。
- 需要 `yt-dlp` + `ffmpeg` 合流：
  `yt-dlp "<player-url>" -o public/videos/x.mp4`，再把 bundle 里的嵌入替换为本地 `<video>`。
- 沙箱常无这俩工具 → **降级**：保留本地缩略图作 `poster`，文档标注"视频需联网/需 ffmpeg"。

## 4. 分析打点
直接从 HTML 删 `<script>`（Cloudflare beacon / GA 等）。无功能影响，消除 CORS 噪音。

## 验证
重载（`ignoreCache:true`）并完整滚动页面后：
```
performance.getEntriesByType('resource').map(e=>e.name)
  .filter(u=>!u.startsWith(location.origin) && !/^(data|blob):/.test(u))
```
列出仍在外的 host。理想为空；若只剩视频，记录在案即可。再运行：

```bash
node skills/web-experience-cloner/scripts/asset-closure-scan.mjs public
```

确认本地 bundle 里没有指向远程资产但未镜像的引用。最后截图确认本地字体/纹理/模型/动画下仍 1:1。
