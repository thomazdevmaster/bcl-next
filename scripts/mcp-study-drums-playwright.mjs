/**
 * Substitui Browser MCP quando o servidor não está ligado ao agente.
 * npx playwright install chromium && node scripts/mcp-study-drums-playwright.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.STUDY_BASE_URL ?? 'http://127.0.0.1:3000';
const API = process.env.STUDY_API_URL ?? 'http://127.0.0.1:8080';
const TOKEN_KEY = 'app.auth.token';

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: '#bcl.2026@' }),
  });
  if (!res.ok) throw new Error(`Login ${res.status}`);
  const data = await res.json();
  const token = data.accessToken ?? data.token;
  const user = data.user ?? data;
  if (!token) throw new Error('Sem token');
  return { token, user };
}

async function main() {
  const report = { ok: false, steps: [] };
  const log = (step, detail) => {
    report.steps.push({ step, detail });
    console.log(step, detail);
  };

  let auth;
  try {
    auth = await login();
    log('login', 'ok');
  } catch (e) {
    log('login', String(e));
    writeFileSync(join(__dirname, 'mcp-study-drums-report.json'), JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(
    ({ tokenKey, token, userJson }) => {
      localStorage.setItem('app.auth.keepLoggedIn', 'true');
      localStorage.setItem('app.auth.user', userJson);
      localStorage.setItem(tokenKey, token);
    },
    { tokenKey: TOKEN_KEY, token: auth.token, userJson: JSON.stringify(auth.user) },
  );

  const page = await context.newPage();
  await page.goto(`${BASE}/study/8`, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  const continueBtn = page.getByRole('button', { name: 'Continuar' });
  if (await continueBtn.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await continueBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.waitForSelector('button[aria-label="Play"]', { timeout: 120_000 });
  const play = page.getByRole('button', { name: 'Play', exact: true });

  for (let i = 0; i < 60 && !(await play.isEnabled()); i++) {
    await page.waitForTimeout(2000);
  }
  log('play-enabled', await play.isEnabled());

  const audioDiag = await page.evaluate(async () => {
    const hidden = document.querySelector('[aria-hidden="true"]');
    let player = null;
    const walk = (obj, depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 4) return null;
      if (obj._sequencer && obj._context) return obj;
      for (const k of Object.keys(obj)) {
        try {
          const v = obj[k];
          const f = walk(v, depth + 1);
          if (f) return f;
        } catch {
          /* ignore */
        }
      }
      return null;
    };
    player = walk(hidden) ?? walk(window);
    const seq = player?._sequencer;
    const ctx = player?._context;
    return {
      hasPlayer: Boolean(player),
      duration: seq?.duration ?? null,
      isLoading: seq?.isLoading ?? null,
      ctxState: ctx?.state ?? null,
    };
  });
  log('before-play', audioDiag);

  await play.click();
  await page.waitForTimeout(5000);

  const after = await page.evaluate(async () => {
    const walk = (obj, depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 4) return null;
      if (obj._sequencer && obj._context) return obj;
      for (const k of Object.keys(obj)) {
        try {
          const f = walk(obj[k], depth + 1);
          if (f) return f;
        } catch {
          /* ignore */
        }
      }
      return null;
    };
    const player = walk(document.querySelector('[aria-hidden="true"]')) ?? walk(window);
    const seq = player?._sequencer;
    const ctx = player?._context;
    let rms = null;
    if (ctx && ctx.state === 'running') {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const dest = ctx.createGain();
      dest.gain.value = 0;
      dest.connect(analyser);
      analyser.connect(ctx.destination);
      await new Promise((r) => setTimeout(r, 300));
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      rms = data.reduce((a, b) => a + b, 0) / data.length;
    }
    return {
      duration: seq?.duration ?? null,
      currentTime: seq?.currentTime ?? null,
      ctxState: ctx?.state ?? null,
      freqRms: rms,
    };
  });
  log('after-play', after);

  report.ok = after.duration > 0 && after.currentTime > 0;
  report.audibleHint = (after.freqRms ?? 0) > 1;

  await page.screenshot({ path: join(__dirname, 'mcp-study-drums.png'), fullPage: true });
  await browser.close();

  writeFileSync(join(__dirname, 'mcp-study-drums-report.json'), JSON.stringify(report, null, 2));
  console.log('report', report.ok ? 'SEQUENCER_OK' : 'FAIL', 'audibleHint', report.audibleHint);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
