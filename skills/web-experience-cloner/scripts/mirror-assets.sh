#!/usr/bin/env bash
# mirror-assets.sh <base-url> <paths-file> [public-dir]
# Phase 5 资产镜像：顺序 + 重试下载，保持目录结构。失败项自动二次重试。
# paths-file：每行一个站内绝对路径（如 /textures/coaster/DIFF.webp），从浏览器实测请求导出。
#   推荐来源：performance.getEntriesByType('resource') 里 origin 一致的 URL，去掉 origin。
# 也可传完整 URL；脚本会保存到 public/<host>/<path>，适合 CDN 资源闭环。
set -uo pipefail
BASE="${1:?usage: mirror-assets.sh <base-url> <paths-file> [public-dir]}"
LIST="${2:?need paths file}"
PUB="${3:-public}"
mkdir -p "$PUB"

dl_one() {
  local p="$1" url out rel clean
  if [[ "$p" =~ ^https?:// ]]; then
    url="$p"
    clean="${p%%#*}"
    clean="${clean%%\?*}"
    rel="${clean#http://}"
    rel="${rel#https://}"
    out="$PUB/$rel"
  elif [[ "$p" =~ ^// ]]; then
    url="https:$p"
    clean="${p%%#*}"
    clean="${clean%%\?*}"
    rel="${clean#//}"
    out="$PUB/$rel"
  else
    url="$BASE$p"
    out="$PUB$1"
  fi
  mkdir -p "$(dirname "$out")"
  curl -sL --retry 5 --retry-delay 2 --connect-timeout 20 --max-time 240 \
       -w "%{http_code}" "$url" -o "$out"
}

: > mirror.log
echo "== pass 1 (sequential) =="
while IFS= read -r p; do
  [ -z "$p" ] && continue
  code=$(dl_one "$p")
  echo "$code $p" >> mirror.log
  sleep 0.2
done < "$LIST"

echo "== retry failures =="
grep -vE '^(200|304) ' mirror.log | awk '{print $2}' > mirror.retry || true
while IFS= read -r p; do
  [ -z "$p" ] && continue
  for a in 1 2 3; do code=$(dl_one "$p"); [ "$code" = "200" ] && break; sleep 2; done
  echo "retry $code $p"
done < mirror.retry

echo "== summary =="
awk '{print $1}' mirror.log | sort | uniq -c
echo "files: $(find "$PUB" -type f | wc -l | tr -d ' ')  size: $(du -sh "$PUB" | cut -f1)"
echo "== zero-byte (silent failures) =="
find "$PUB" -type f -size -16c -print || echo "none"
# 提示：并发下载在沙箱里常触发 HTTP 000 限流，所以本脚本刻意顺序执行。
