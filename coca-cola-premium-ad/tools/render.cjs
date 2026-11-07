#!/usr/bin/env node
// Offline renderer: serves the project, drives headless Chromium frame by frame and pipes raw
// RGBA into ffmpeg. Deterministic: every frame is a pure function of its timestamp.
//
//   node tools/render.cjs --stills 0.5,3,6.5        -> out/stills/*.png
//   node tools/render.cjs --video [--sub 5] [--from 0 --to 18]  -> out/frames.mp4 (no audio)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes('--' + k);
const EDIT = arg('edit', 'bright');
const W = +arg('w', EDIT === 'asmr' ? 1080 : 1920), H = +arg('h', EDIT === 'asmr' ? 1920 : 1080), SUB = +arg('sub', 5);
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.png': 'image/png' };
let sink = null; // function(buffer, index)

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/frame') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => { await sink(Buffer.concat(chunks), +url.searchParams.get('i')); res.end('ok'); });
    return;
  }
  const file = path.join(ROOT, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});

function pngFromRaw(buf, file) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', '-', '-vf', 'vflip', file]);
    ff.on('close', (c) => (c === 0 ? resolve() : reject(new Error('ffmpeg ' + c))));
    ff.stdin.end(buf);
  });
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--js-flags=--max-old-space-size=8192'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 400)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.setDefaultTimeout(0);
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/index.html?render=1&w=${W}&h=${H}&edit=${EDIT}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 0 });
  console.log(`init ${(Date.now() - t0) / 1000}s`);
  if (has('eval')) await page.evaluate(arg('eval'));

  const renderFrame = (t, f, sub) => page.evaluate(async ([t, f, sub]) => {
    const a = window.__app;
    a.renderAt(t, { sub, toScreen: false, frameIndex: f });
    const px = a.readPixels();
    await fetch('/frame?i=' + f, { method: 'POST', body: px });
  }, [t, f, sub]);

  if (has('stills')) {
    const times = arg('stills').split(',').map(Number);
    let cur = null;
    sink = (buf) => pngFromRaw(buf, cur);
    for (const t of times) {
      cur = path.join(OUT, 'stills', `t${t.toFixed(2).padStart(5, '0')}.png`);
      const s = Date.now();
      await renderFrame(t, Math.round(t * 25), +arg('sub', 1));
      console.log(`still ${t}s -> ${path.relative(ROOT, cur)} (${(Date.now() - s) / 1000}s)`);
    }
  }

  if (has('video')) {
    const fps = +arg('fps', EDIT === 'asmr' ? 25 : 30), from = +arg('from', 0), to = +arg('to', EDIT === 'asmr' ? 15 : 18);
    const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
    const outFile = path.join(OUT, arg('out', 'frames.mp4'));
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', '-',
      '-vf', 'vflip', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(arg('crf', 14)), '-tune', 'film', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile]);
    const done = new Promise((r) => ff.on('close', r));
    sink = (buf) => new Promise((r) => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', r); else r(); });
    const start = Date.now();
    for (let f = f0; f < f1; f++) {
      await renderFrame(f / fps, f, SUB);
      if ((f - f0) % 10 === 0) {
        const el = (Date.now() - start) / 1000, per = el / (f - f0 + 1);
        console.log(`frame ${f}/${f1}  ${per.toFixed(2)}s/f  eta ${((f1 - f - 1) * per / 60).toFixed(1)} min`);
      }
    }
    ff.stdin.end(); await done;
    console.log(`video -> ${path.relative(ROOT, outFile)} in ${((Date.now() - start) / 60000).toFixed(1)} min`);
  }
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });
