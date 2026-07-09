#!/usr/bin/env bash
# recon.sh <url> [outdir]
# Phase 1 侦察：抓 HTML + 主 bundle + CSS，扫库签名与技术关键词，列资产引用。
set -euo pipefail
URL="${1:?usage: recon.sh <url> [outdir]}"
OUT="${2:-recon}"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
mkdir -p "$OUT"

echo "== fetch HTML =="
curl -sL -A "$UA" "$URL" -o "$OUT/index.html"
wc -c "$OUT/index.html"

echo "== script srcs =="
grep -oE '<script[^>]*src="[^"]*"' "$OUT/index.html" | grep -oE 'src="[^"]*"' | sed 's/src="//;s/"//' | sort -u

echo "== asset refs (js/css/json/glb/hdr/webp/mp4/obj/wasm/riv/sog/buf) =="
grep -oE '(href|src)="[^"]*\.(js|mjs|css|json|glb|gltf|hdr|exr|ktx2|webp|avif|png|mp4|obj|wasm|riv|sog|ply|buf|woff2?)"' "$OUT/index.html" \
  | grep -oE '"[^"]*"' | tr -d '"' | sort -u

# 下载首个本地 bundle 以便后续反混淆
BASE=$(echo "$URL" | grep -oE '^https?://[^/]+')
FIRST_JS=$(grep -oE 'src="(/[^"]*\.js)"' "$OUT/index.html" | head -1 | grep -oE '/[^"]*\.js' || true)
if [ -n "${FIRST_JS:-}" ]; then
  echo "== download bundle $FIRST_JS =="
  curl -sL "$BASE$FIRST_JS" -o "$OUT/bundle.min.js"
  echo "== library signatures in bundle =="
  for k in three THREE gsap lenis rive Rive babylon framer matter cannon rapier TSL wgsl webgl shader splat lottie pixi; do
    c=$(grep -oiE "$k" "$OUT/bundle.min.js" | wc -l | tr -d ' '); [ "$c" -gt 0 ] && printf "%6s  %s\n" "$c" "$k"; done | sort -rn
  echo "== technique keywords =="
  for k in instanc RenderTarget FBO noise fbm curl morph displacement Bloom Bokeh splat Postprocess particle sdf dither refract fresnel raymarch ScrollTrigger TAA SMAA gobo harmonics; do
    c=$(grep -oiE "$k" "$OUT/bundle.min.js" | wc -l | tr -d ' '); [ "$c" -gt 0 ] && printf "%6s  %s\n" "$c" "$k"; done | sort -rn
fi
echo "== done. next: js-beautify $OUT/bundle.min.js -> deobf, then runtime capture =="
