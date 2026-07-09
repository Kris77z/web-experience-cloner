#!/usr/bin/env node
// Scan a mirrored public directory for remote asset references and report which
// referenced files are not present locally. Intended as an L2/L3 closure gate.
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const publicDir = process.argv[2] || "public";
const hostFilter = process.argv[3] ? new RegExp(process.argv[3], "i") : null;

const assetExts = new Set([
  "avif", "gif", "jpeg", "jpg", "png", "svg", "webp",
  "css", "js", "mjs", "json", "map",
  "woff", "woff2", "ttf", "otf",
  "glb", "gltf", "bin", "ktx2", "hdr", "exr",
  "riv", "wasm", "worker",
  "mp4", "webm", "mov", "m3u8", "mpd", "ts", "m4s",
]);

const textExts = new Set([
  ".html", ".htm", ".css", ".js", ".mjs", ".json", ".map",
  ".svg", ".txt", ".xml", ".webmanifest",
]);

const urlPattern =
  /(?:https?:\\?\/\\?\/|\/\/|[A-Za-z0-9.-]+\.[A-Za-z]{2,}\/)[^"'`\s<>)\]}]+/g;

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walk(full));
    } else if (entry.isFile() && textExts.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

function normalizeUrl(raw) {
  let s = raw
    .replace(/\\\//g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/[),.;]+$/g, "");

  if (s.startsWith("//")) s = `https:${s}`;
  if (/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}\//.test(s)) s = `https://${s}`;
  if (!/^https?:\/\//i.test(s)) return null;

  try {
    return new URL(s);
  } catch {
    return null;
  }
}

function assetExtension(pathname) {
  const lower = pathname.toLowerCase();
  if (lower.endsWith(".worker.js")) return "worker";
  return path.extname(pathname).slice(1).toLowerCase();
}

function canonicalPathname(pathname) {
  const stripped = pathname.replace(/\/+$/, "");
  if (stripped !== pathname && assetExts.has(assetExtension(stripped))) return stripped;
  return pathname;
}

function localCandidates(url) {
  const pathname = canonicalPathname(url.pathname).replace(/^\/+/, "");
  const host = url.host.toLowerCase();
  const candidates = [
    path.join(publicDir, host, pathname),
    path.join(publicDir, pathname),
  ];

  try {
    const decoded = decodeURIComponent(pathname);
    if (decoded !== pathname) {
      candidates.push(path.join(publicDir, host, decoded));
      candidates.push(path.join(publicDir, decoded));
    }
  } catch {
    // Keep raw candidates when the URL contains malformed escapes.
  }

  return [...new Set(candidates)];
}

function isPresent(url) {
  return localCandidates(url).some((candidate) => existsSync(candidate));
}

const files = await walk(publicDir);
const refs = new Map();

for (const file of files) {
  const stat = await fs.stat(file);
  if (stat.size > 30 * 1024 * 1024) continue;
  const text = await fs.readFile(file, "utf8");
  for (const match of text.matchAll(urlPattern)) {
    const url = normalizeUrl(match[0]);
    if (!url) continue;
    if (hostFilter && !hostFilter.test(url.host)) continue;
    const pathname = canonicalPathname(url.pathname);
    const ext = assetExtension(pathname);
    if (!assetExts.has(ext)) continue;
    const key = `${url.origin}${pathname}`;
    const item = refs.get(key) || { url, seenIn: new Set() };
    item.seenIn.add(path.relative(publicDir, file));
    refs.set(key, item);
  }
}

const rows = [...refs.values()]
  .map((item) => ({
    url: `${item.url.origin}${canonicalPathname(item.url.pathname)}`,
    present: isPresent(item.url),
    seenIn: [...item.seenIn].slice(0, 5),
  }))
  .sort((a, b) => a.url.localeCompare(b.url));

const missing = rows.filter((row) => !row.present);
const present = rows.length - missing.length;

console.log(`remote asset refs: ${rows.length}`);
console.log(`present locally:   ${present}`);
console.log(`missing locally:   ${missing.length}`);

if (missing.length) {
  console.log("\nMissing:");
  for (const row of missing) {
    console.log(row.url);
    console.log(`  seen in: ${row.seenIn.join(", ")}`);
  }
  process.exitCode = 2;
}
