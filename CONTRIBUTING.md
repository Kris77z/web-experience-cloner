# Contributing

欢迎改进 `web-experience-cloner`。请优先保持 skill 对 AI agent 友好：少解释常识，多保留可执行流程、验证门禁和可复用脚本。

## 提交前检查

```bash
node scripts/validate-skill.mjs
```

请不要提交：

- 第三方网站的镜像资产、视频、字体、bundle 或完整本地副本。
- 运行产物：`recon/`、`verify/`、`dist/`、`node_modules/`、大体积截图。
- cookie、token、Authorization header、私有 API 响应或其它敏感数据。

## Skill 编写约定

- `skills/web-experience-cloner/SKILL.md` 的 frontmatter 至少包含 `name` 和 `description`。
- `SKILL.md` 保持精简；长细节放入一层 `references/`。
- 可重复执行或容易出错的流程放入 `scripts/`。
- 不要在 skill 目录内放 README/安装指南/变更日志；这些应放在仓库顶层。
- 更新 `SKILL.md` 后，确认 `agents/openai.yaml` 这类兼容元数据的显示名称、短描述和默认提示仍然匹配。

## 法律与伦理边界

Web 复刻 skill 只能帮助本地研究、调试和学习。贡献示例时不要包含受版权保护的目标站点资源，
也不要引导用户公开部署第三方站点副本。
