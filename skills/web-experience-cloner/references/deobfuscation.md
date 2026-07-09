# Phase 2 · 静态反混淆

## 美化
```bash
npx js-beautify -f recon/bundle.min.js -o deobf/bundle.beauty.js
wc -l deobf/bundle.beauty.js   # 1MB ≈ 3 万行
```

## 类名是金矿
现代打包（Vite/Astro/webpack production）**通常保留 class 名**。`grep -oE 'class [A-Z][A-Za-z0-9_]+'`
往往直接给出与页面区块 1:1 对应的组件清单。真实例子（oryzo）：
- `HeroScene` / `HeroSceneDeskPad` / `HeroSceneProp` → 首屏 3D 桌面
- `ThermodynamicOverlay` → 热扩散 overlay
- `LetterFlippers` → 翻牌文字
- `TableGripMicroWaterBear` → 微观水熊虫
- `SecondOrderDynamics` / `WiggleSystem` → 通用动画原语
- `Splats` / `SplatsWorker` → 高斯泼溅

把类名分三类：**Section/组件类**、**引擎/管线类**（renderer/postprocessing/fbo）、**数学/动画原语类**。

## 定位关键结构
```bash
# 主入口与初始化链
grep -n 'class App' deobf/bundle.beauty.js
# 共享 GLSL chunk 注册表（shaderHelper.addChunk(...)）→ 站点的“着色器词汇表”
grep -n 'addChunk' deobf/bundle.beauty.js
# 后处理链构造顺序
grep -nE 'new (Bloom|Bokeh|Fxaa|Smaa|TAA|Final)' deobf/bundle.beauty.js
# 资产路径常量（拼 fetch 用）
grep -oE '"[A-Za-z0-9_./-]+\.(webp|avif|sog|riv|buf|glb|hdr|json)"' deobf/bundle.beauty.js | sort -u
```

## 抽某个类的实现
```bash
ln=$(grep -n 'class SecondOrderDynamics' deobf/bundle.beauty.js | head -1 | cut -d: -f1)
awk -v L=$ln 'NR>=L && NR<=L+40' deobf/bundle.beauty.js | grep -vE '^\s*$'
```

## 用途与边界
- 静态反混淆给**结构与逻辑**（类关系、参数、驱动方程、资产路径）。
- 但**着色器源码 / uniform 实参 / FBO 拓扑**用 Phase 3 运行时实捕更准（min 里 GLSL 常是模板字符串拼接，静态读很痛苦）。
- 若拦截器在 Phase 3 抓不到着色器（如 TSL/WebGPU node 系统绕过 `shaderSource`），再回这里深读 bundle。
