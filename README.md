# Web Experience Cloner

`web-experience-cloner` 是一个通用 AI agent skill，用于逆向、复刻、离线化和重写复杂 Web 体验。
它覆盖 WebGL/Three.js/Rive 创意站、Framer/Webflow 平台导出站，以及
React Router/Remix/Oxygen/Next/Nuxt SSR/SPA 体验页。

## 安装

核心入口是 `skills/web-experience-cloner/SKILL.md`。任何支持 `SKILL.md` 风格技能目录的
agent 都可以读取并使用这套工作流。

兼容 skills CLI 的安装方式：

```bash
npx skills add https://github.com/Kris77z/web-experience-cloner --skill web-experience-cloner
```

也可以把 `skills/web-experience-cloner` 复制到目标 agent 的 skills 目录。Codex 用户可使用：

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R skills/web-experience-cloner "${CODEX_HOME:-$HOME/.codex}/skills/"
```

## 工作流

这个 skill 使用端到端线索驱动工作流：

```text
CLASSIFY -> ATTRIBUTE -> LOCK -> TRACE -> MIRROR/REPLAY -> VERIFY
```

它强调先分类、再取证、再复刻：

- 自研创意引擎站：WebGL/Three.js/GSAP/Rive/高斯泼溅/光场等。
- 平台导出站：Framer/Webflow/Readymag 等。
- 应用型 SSR/SPA 体验页：React Router/Remix/Oxygen/Next/Nuxt 等。
- 普通静态/SPA 站：常规框架导出和动画库。

支持的交付层级：

| 级别 | 交付物 |
| --- | --- |
| L0 | 站点分类 + 复刻路线图 |
| L1 | 动画组件原理文档 |
| L2 | 整站 1:1 本地副本，复用原 bundle |
| L3 | 完全离线化 |
| L4 | 从零重写单个特效 |

主入口是 [skills/web-experience-cloner/SKILL.md](skills/web-experience-cloner/SKILL.md)。
细节文档在 `references/`，可复用脚本在 `scripts/`。

## 质量检查

发布前运行：

```bash
node scripts/validate-skill.mjs
```

这个脚本会检查 skill frontmatter、目录结构、缺失引用、过大文件，以及 skill 目录内不适合发布的 README 等。

## 版权与使用边界

这个仓库的代码和文档按 MIT 许可开源。使用 skill 复刻第三方网站时，请遵守目标站点的版权、
服务条款和当地法律。L2/L3 通常会运行或镜像目标站点自己的压缩代码和资源，仅适合本地学习研究，
不要把第三方站点副本公开部署或再分发。
