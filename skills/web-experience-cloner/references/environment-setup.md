# 环境与 MCP 安装

## Chrome DevTools MCP（必装）
```bash
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
```

### 高频坑：Node 版本（真实踩过）
`chrome-devtools-mcp` 要求 Node `^20.19 || ^22.12 || >=23`。很多人默认 Node 是 v18（尤其 nvm 用户），
表现为：`claude mcp list` 显示 **Connected**，但工具死活不出现 / server 实际启动失败。

诊断：
```bash
node --version                       # 看默认版本
npm view chrome-devtools-mcp engines # 看要求
ls ~/.nvm/versions/node              # nvm 用户常已装了 v20，只是默认没切
```

解决（不改用户全局默认）：写一个**固定 PATH 到 Node20 的包装脚本**再注册 MCP：
```bash
mkdir -p ~/.claude/bin
cat > ~/.claude/bin/chrome-devtools-mcp.sh <<'EOF'
#!/bin/zsh
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"   # 改成你机器上的 v20 路径
exec npx -y chrome-devtools-mcp@latest "$@"
EOF
chmod +x ~/.claude/bin/chrome-devtools-mcp.sh
claude mcp remove chrome-devtools
claude mcp add chrome-devtools -- ~/.claude/bin/chrome-devtools-mcp.sh
claude mcp list   # 应为 ✔ Connected
```

### 关键：装好后必须重启会话
CLI 层 Connected ≠ 工具进了当前会话。**重启 Claude Code（`claude --resume` / `claude -c`）**
让工具 schema 重新加载，`mcp__chrome-devtools__*` 才会出现在工具集里。
可用一个子 agent 探测：让它列出名字含 "chrome" 的工具，返回 NONE 就说明还没加载。

## 其他工具
- `js-beautify`（反混淆）：`npx js-beautify`，无需预装。
- `node`（拆着色器脚本）：≥18 即可。
- 视频离线化需要 `ffmpeg` + `yt-dlp`（沙箱里常缺，缺则视频无法本地化，用 poster 兜底）。
- Chrome 本体需已安装（`/Applications/Google Chrome.app`）。

## 沙箱网络注意
- GitHub / 部分 CDN 在沙箱里可能被 `ERR_TUNNEL_CONNECTION_FAILED` 拦截 → 用 `WebFetch`/`WebSearch` 兜底。
- 目标站点本身一般可达；**并发 curl 易触发限流（HTTP 000）→ 顺序下载**。
