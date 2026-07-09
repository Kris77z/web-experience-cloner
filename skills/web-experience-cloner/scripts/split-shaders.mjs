#!/usr/bin/env node
// split-shaders.mjs <glcap.json> [outdir]
// 把运行时捕获的 JSON 拆成单个 GLSL 文件，并按 uniform/关键词分类打印一张速查表。
// glcap.json 结构：{ programs:[{i, shaders:[{type:'vert'|'frag', src}]}], uniforms:{} }
import fs from 'node:fs';
import path from 'node:path';

const inFile = process.argv[2];
const outDir = process.argv[3] || 'shaders';
if (!inFile) { console.error('usage: split-shaders.mjs <glcap.json> [outdir]'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

const cap = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const KW = ['curl','paint','vel','dissipation','blueNoise','luminosityThreshold','blurTexture',
  'areaTexture','edgesTexture','vignette','channelMixer','splat','msdf','sdf','fresnel','refract',
  'matcap','envMap','instanceMatrix','morphTarget','gobo','dither','bokeh','coc','harmonics',
  'bicubic','aces','tonemap','displacement','thermal','lightField','codebook'];

const rows = [];
for (const p of cap.programs) {
  const frag = (p.shaders.find(s => s.type === 'frag') || {}).src || '';
  const vert = (p.shaders.find(s => s.type === 'vert') || {}).src || '';
  const n = String(p.i).padStart(2, '0');
  fs.writeFileSync(path.join(outDir, `prog${n}.frag.glsl`), frag);
  fs.writeFileSync(path.join(outDir, `prog${n}.vert.glsl`), vert);
  const low = frag.toLowerCase();
  const toks = KW.filter(k => low.includes(k.toLowerCase()));
  rows.push({ i: p.i, fLen: frag.length, toks: toks.join(',') });
}

console.log(`programs: ${cap.programs.length}  uniforms: ${Object.keys(cap.uniforms || {}).length}`);
console.log('idx  fragLen  tokens');
for (const r of rows) console.log(String(r.i).padStart(3), String(r.fLen).padStart(7), ' ', r.toks);
console.log('\nuniform names:\n' + Object.keys(cap.uniforms || {}).join(' '));
