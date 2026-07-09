# Phase 3 · 运行时拦截（核心）

## 思路
在**页面脚本运行之前**改写 `HTMLCanvasElement.prototype.getContext`，对返回的 WebGL 上下文原型
打 hook，捕获：
- `shaderSource` → 着色器源码
- `attachShader`+`linkProgram` → 每个 program 的 vert/frag 配对
- `getUniformLocation`+`uniform*` → uniform 名 ↔ 实参（**最后一次写入值**）
- `bindFramebuffer` / `drawElements` → 管线规模

拦截器全文：`scripts/gl-interceptor.js`。

## 注入方式
`navigate_page` 的 `initScript` 参数接受一段在 new document、其它脚本之前执行的 JS。
把 `gl-interceptor.js` 内容作为 `initScript` 传入，再导航到目标 URL：

```
mcp__chrome-devtools__navigate_page({
  type: 'url', url: 'https://target/',
  initScript: <gl-interceptor.js 全文>
})
```

## 逐章节采集（关键）
着色器是**按需编译**的——滚到某 Section 才编译它的材质。所以要：
1. 导航后等几秒让首屏管线编译完。
2. `evaluate_script` 逐步 `window.scrollTo` 到每个 Section（用真实 `offsetTop`，DOM 顺序≠视觉顺序），
   每步等 ~1.8s 让新材质编译，记录 `window.__GLCAP.programs.length` 增量 + 截图。
3. 全站滚完后，一次性导出完整捕获。

## 导出（务必落盘，别进上下文）
`evaluate_script` 支持 `filePath`，把可能几十段 GLSL 的 JSON 直接写文件：
```
mcp__chrome-devtools__evaluate_script({
  filePath: 'recon/glcap-full.json',
  function: '() => { const c=window.__GLCAP||{}; return {
     meta:{programCount:c.programs.length, fbos:c.fbos, draws:c.draws,
            uniformCount:Object.keys(c.uniforms||{}).length},
     uniforms:c.uniforms,
     programs:c.programs.map((p,i)=>({i, shaders:p})) }; }'
})
```
然后 `node scripts/split-shaders.mjs recon/glcap-full.json recon/shaders` 拆成单文件 + 分类表。

## 仅凭 uniform 名就能解码算法
真实例子：`u_curlScale`/`u_vel`/`u_dissipations`→curl 流体；`u_shNCodebook`/`u_meansLTexture`/
`u_quatsTexture`→SOGS 高斯泼溅；`u_lightFieldSlicedTexture`→切片光场；`u_goboMatrix`→投影光；
`u_focusDistance`/`u_maxCoC`→Bokeh 景深；`u_luminosityThreshold`/`u_blurTexture0..4`→Bloom。
对照 `references/tech-cheatsheet.md`。

## 抓不到时
- TSL/WebGPU/`WebGL2ComputeRenderingContext` 可能绕过 `shaderSource` → 回 Phase 2 深读 bundle，
  或 hook 更底层（`getProgramParameter`/WebGPU `createShaderModule`）。
- worker 里的 WebGL（如排序）不在主线程 → 单独处理 worker 文件。
