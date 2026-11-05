/**
 * Verifica a sincronia partitura × áudio no /score_playground (dev).
 *
 *   PLAYGROUND_SONG="hurricane" node scripts/e2e-score-playground-sync.mjs
 *
 * Requer `next dev` (expõe window.__scorePlayground) e a API local.
 * Se `playwright` não estiver no projeto, aponte PLAYWRIGHT_MODULE para o pacote.
 */
import { createRequire } from 'node:module';
import { constants, createPublicKey, publicEncrypt } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.STUDY_BASE_URL ?? 'http://127.0.0.1:3000';
const API = process.env.STUDY_API_URL ?? 'http://127.0.0.1:8080';
const SONG = (process.env.PLAYGROUND_SONG ?? '').toLowerCase();
const LOGIN_ID = process.env.STUDY_LOGIN ?? 'admin';
const LOGIN_PW = process.env.STUDY_PASSWORD ?? '#bcl.2026@';
const PLAY_SECONDS = Number(process.env.PLAY_SECONDS ?? 20);
const VIEWPORT = process.env.MOBILE
  ? { width: 390, height: 844 }
  : { width: 1440, height: 900 };

async function apiLogin() {
  const keyRes = await fetch(`${API}/auth/public-key`);
  if (!keyRes.ok) throw new Error(`public-key ${keyRes.status}`);
  const jwk = await keyRes.json();
  const key = createPublicKey({ key: { kty: 'RSA', n: jwk.n, e: jwk.e }, format: 'jwk' });
  const sealed = publicEncrypt(
    { key, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(LOGIN_PW, 'utf8'),
  ).toString('base64');
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: LOGIN_ID, password: sealed, keepLoggedIn: true }),
  });
  if (!res.ok) throw new Error(`login ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.token) throw new Error('token ausente');
  return { token: data.token, user: data.user };
}

async function main() {
  const { token, user } = await apiLogin();
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: VIEWPORT });
  await context.addInitScript(
    ({ token, userJson }) => {
      localStorage.setItem('app.auth.keepLoggedIn', 'true');
      localStorage.setItem('app.auth.user', userJson);
      localStorage.setItem('app.auth.token', token);
    },
    { token, userJson: JSON.stringify(user) },
  );

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') errors.push(text);
    if (text.includes('[score_playground]')) console.log('  console:', text.slice(0, 200));
  });

  await page.goto(`${BASE}/score_playground`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const startButtons = page.getByRole('button', { name: 'Iniciar estudo' });
  await startButtons.first().waitFor({ timeout: 90_000 });

  if (SONG) {
    const search = page.getByRole('searchbox').or(page.getByPlaceholder(/Buscar/i)).first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill(SONG);
      await page.waitForTimeout(800);
    }
  }
  const songRow = SONG
    ? page.locator('tr, [role="row"], article').filter({ hasText: new RegExp(SONG, 'i') }).first()
    : null;
  const startBtn = songRow && (await songRow.count())
    ? songRow.getByRole('button', { name: 'Iniciar estudo' })
    : startButtons.first();
  await startBtn.click();

  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ timeout: 90_000 });
  const title = (await dialog.locator('h2, [id$="title"]').first().textContent())?.trim();
  console.log('song:', title);
  await dialog.getByRole('button', { name: 'Continuar' }).click();

  const t0 = Date.now();
  await page.waitForFunction(
    () => {
      const pg = window.__scorePlayground;
      const alert = document.querySelector('[role="alert"]');
      return Boolean(pg?.player) || Boolean(alert?.textContent?.trim());
    },
    null,
    { timeout: 240_000 },
  );
  const loadMs = Date.now() - t0;
  const alertText = await page.locator('[role="alert"]').first().textContent().catch(() => null);
  if (alertText?.trim() && !(await page.evaluate(() => Boolean(window.__scorePlayground?.player)))) {
    throw new Error(`erro na sessão: ${alertText.trim()}`);
  }

  const setup = await page.evaluate(() => {
    const { player, renderer, timemap } = window.__scorePlayground;
    const inner = renderer.inner;
    const midi = player._midi;
    const tmTotal = timemap.reduce((sum, e) => sum + (e.duration ?? 0), 0);

    const onsets = [];
    for (const track of midi.tracks ?? []) {
      for (const ev of track.events ?? []) {
        const status = ev.statusByte ?? ev.messageStatusByte;
        const velocity = ev.data?.[1] ?? 0;
        if (status >= 0x90 && status <= 0x9f && velocity > 0) {
          onsets.push(midi.midiTicksToSeconds?.(ev.ticks) ?? midi.MIDIticksToSeconds?.(ev.ticks));
        }
      }
    }
    onsets.sort((a, b) => a - b);

    const firstOnsetPerMeasure = timemap.map((entry) => {
      const start = entry.timestamp / 1000;
      const end = (entry.timestamp + entry.duration) / 1000;
      const hit = onsets.find((t) => t >= start - 0.25 && t < end);
      return hit == null ? null : Math.round((hit - start) * 1000);
    });

    return {
      engine: renderer.sheetEngine,
      measuresRendered: inner?.measures?.length ?? inner?.osmd?.Sheet?.SourceMeasures?.length ?? null,
      timemapEntries: timemap.length,
      timemapTotalMs: Math.round(tmTotal),
      playerDurationMs: Math.round(player.duration),
      midiNoteOns: onsets.length,
      lastOnsetMs: Math.round((onsets.at(-1) ?? 0) * 1000),
      firstOnsetOffsetsMs: firstOnsetPerMeasure,
      outputLatencyMs: Math.round((player._context.outputLatency ?? 0) * 1000),
      baseLatencyMs: Math.round((player._context.baseLatency ?? 0) * 1000),
      zoom: renderer.getZoomState(),
    };
  });

  const offsets = setup.firstOnsetOffsetsMs.filter((v) => v != null);
  const median = (arr) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const third = Math.max(1, Math.floor(offsets.length / 3));
  const drift = {
    measuresWithNotes: offsets.length,
    medianFirstOnsetMs: median(offsets),
    medianEarlyThird: median(offsets.slice(0, third)),
    medianLastThird: median(offsets.slice(-third)),
    negativeOnsets: offsets.filter((v) => v < -20).length,
  };
  delete setup.firstOnsetOffsetsMs;
  console.log('setup:', JSON.stringify({ loadMs, ...setup, drift }, null, 2));

  await page.screenshot({ path: join(__dirname, 'score-playground-ready.png') });

  await page.getByRole('button', { name: 'Tocar' }).click();
  const samples = await page.evaluate(async (seconds) => {
    const { player, renderer, timemap } = window.__scorePlayground;
    const inner = renderer.inner;
    const container = inner.container;
    const cursor = container?.querySelector('.score-playground-cursor');
    const out = [];

    const expectedIndex = (pos) => {
      let idx = 0;
      for (let i = 0; i < timemap.length; i++) {
        if (timemap[i].timestamp <= pos) idx = i;
        else break;
      }
      return idx;
    };

    const measureBox = (index) => {
      if (inner.measures) {
        const m = inner.measures.find((x) => x.id === index) ?? inner.measures[index];
        if (!m) return null;
        const wrap = inner.pagesHost.querySelector(`[data-page="${m.page}"]`);
        const a = inner.cursorPointOnPage(wrap, m.x, m.y, m.sy);
        const b = inner.cursorPointOnPage(wrap, m.x + m.sx, m.y, m.sy);
        return { left: a.x, right: b.x, top: a.y };
      }
      const b = inner.measureBoundsPx?.(inner.osmd, index);
      if (!b) return null;
      const top = (inner.osmdMount?.offsetTop ?? 0) + b.y;
      return { left: b.x, right: b.x + b.width, top };
    };

    const wallStart = performance.now();
    let posStart = null;
    while (performance.now() - wallStart < seconds * 1000) {
      await new Promise((r) => setTimeout(r, 250));
      const pos = player.position;
      if (posStart == null && pos > 0) posStart = { pos, wall: performance.now() };
      const idx = expectedIndex(pos);
      const box = measureBox(idx);
      const left = parseFloat(cursor?.style.left ?? 'NaN');
      const top = parseFloat(cursor?.style.top ?? 'NaN');
      const entry = timemap[idx];
      const fraction = entry?.duration ? (pos - entry.timestamp) / entry.duration : 0;
      const scroll = container.closest('[data-score-scroll]');
      const scrollRect = scroll?.getBoundingClientRect();
      const cursorRect = cursor?.getBoundingClientRect();
      out.push({
        t: Math.round(performance.now() - wallStart),
        pos: Math.round(pos),
        idx,
        fraction: Math.round(fraction * 100) / 100,
        cursorLeft: Math.round(left),
        cursorTop: Math.round(top),
        boxLeft: box ? Math.round(box.left) : null,
        boxRight: box ? Math.round(box.right) : null,
        boxTop: box ? Math.round(box.top) : null,
        inMeasure: box ? left >= box.left - 3 && left <= box.right + 3 && Math.abs(top - box.top) < 40 : null,
        cursorVisible: cursorRect && scrollRect
          ? cursorRect.top >= scrollRect.top && cursorRect.bottom <= scrollRect.bottom
          : null,
        state: player.state,
      });
    }
    const last = out.at(-1);
    const rate = posStart && last
      ? (last.pos - posStart.pos) / (performance.now() - posStart.wall)
      : null;
    return { out, rate };
  }, PLAY_SECONDS);

  const bad = samples.out.filter((s) => s.inMeasure === false);
  const hidden = samples.out.filter((s) => s.cursorVisible === false);
  console.log('playback:', JSON.stringify({
    samples: samples.out.length,
    clockRate: samples.rate && Math.round(samples.rate * 1000) / 1000,
    finalPos: samples.out.at(-1)?.pos,
    cursorOutsideExpectedMeasure: bad.length,
    cursorOutOfView: hidden.length,
    firstBad: bad.slice(0, 5),
  }, null, 2));

  await page.screenshot({ path: join(__dirname, 'score-playground-playing.png') });

  await page.getByRole('button', { name: 'Pausar' }).click();
  await page.waitForTimeout(400);
  const paused = await page.evaluate(() => window.__scorePlayground.player.position);
  await page.waitForTimeout(800);
  const pausedLater = await page.evaluate(() => window.__scorePlayground.player.position);
  console.log('pause holds position:', Math.abs(pausedLater - paused) < 5, Math.round(paused));

  const zoomOut = page.getByRole('button', { name: /Diminuir zoom/ });
  const zoomLabelBefore = setup.zoom?.label;
  if ((await zoomOut.count()) > 0 && (await zoomOut.isEnabled().catch(() => false))) {
    await zoomOut.click();
    await page.waitForTimeout(3000);
    const z = await page.evaluate(() => window.__scorePlayground.renderer.getZoomState());
    console.log('zoom out:', zoomLabelBefore, '->', z.label);
    await page.screenshot({ path: join(__dirname, 'score-playground-zoomout.png') });
  }

  await page.getByRole('button', { name: 'Voltar ao início' }).click();
  await page.waitForTimeout(400);
  const rewound = await page.evaluate(() => window.__scorePlayground.player.position);
  console.log('rewind position:', Math.round(rewound));

  const report = { title, loadMs, setup, drift, samples, errors: errors.slice(0, 20) };
  writeFileSync(join(__dirname, 'score-playground-sync-report.json'), JSON.stringify(report, null, 2));
  console.log('errors:', errors.slice(0, 8));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
