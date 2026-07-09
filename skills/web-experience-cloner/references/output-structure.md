# 产出目录结构

把"理解线"和"复现线"分库，顶层放进度看板。已在 Oryzo、Reset Wellness、Shopify Editions
三类站点上验证好用。

```
<project>/
├── 项目总览.md              ← 唯一入口/进度看板：目录地图 + ✅已完成 + ⏳待办(带优先级) + 运行命令 + 版权
├── <site>-re/                【理解线】逆向分析 + 文档 + 从零重写
│   ├── README.md            文档索引
│   ├── docs/                NN-组件.md（00 架构 + 各组件 + 通用引擎）
│   ├── recon/
│   │   ├── index.html / bundle.min.js
│   │   ├── classification.json  L0 分类卡（站点类型 + route + next probe）
│   │   ├── runtime-resources.json / network-events.json  浏览器实测资源和请求
│   │   ├── glcap-full.json  运行时实捕（programs + uniforms）
│   │   ├── shaders/         progNN.frag/vert.glsl
│   │   └── shots/           分章节截图
│   ├── deobf/bundle.beauty.js
│   └── ports/<effect>/      从零重写的独立 demo（含自己的 README + 验证截图）
└── <site>-clone/             【复现线】整站 1:1 副本
    ├── README.md            运行/离线说明 + 离线化状态表
    ├── public/              站点根（镜像资产 + 本地字体/wasm）
    │   ├── asset-urls.json  实测资产清单（权威来源）
    │   ├── <route>/index.html  SSR/SPA 页面保持原 route 时使用
    │   ├── <route>/api/...     同源 API/loader fixture（若有）
    │   └── mirror.log       下载结果
    ├── verify/
    │   ├── compare-live-local.png
    │   ├── local-runtime.json
    │   └── local-*.png
```

## 进度看板要点
- **目录地图**：一眼看清两条线放哪。
- **✅已完成**：分阶段打勾（分析/1:1/离线/重写）。
- **⏳待办**：按 价值×成本 排序，带 ★ 优先级和成本估计。
- **运行命令** + **性质边界/版权声明**：功能级 1:1 vs 算法级重写讲清楚。

## 收尾建议
每完成一个级别（L1/L2/L3/L4）就更新看板；新增从零重写就在 `ports/` 加目录并回链。
