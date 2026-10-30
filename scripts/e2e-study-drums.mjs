/**
 * Teste automatizado: estudo só com bateria (Playwright).
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = process.env.STUDY_BASE_URL ?? 'http://127.0.0.1:3000';
const API = process.env.STUDY_API_URL ?? 'http://127.0.0.1:8080';
const SONG_ID = process.env.STUDY_SONG_ID ?? '3';
const LOGIN_ID = process.env.STUDY_LOGIN ?? 'admin';
const LOGIN_PW = process.env.STUDY_PASSWORD ?? '#bcl.2026@';
const TOKEN_KEY = 'app.auth.token';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function apiLogin() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: LOGIN_ID, password: LOGIN_PW }),
  });
  if (!res.ok) throw new Error(`Login API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const token = data.accessToken ?? data.token ?? data.access_token;
  if (!token) throw new Error('Token ausente');
  const user = data.user ?? data;
  return { token, user };
}

function countNoteOns(buffer) {
  const b = Buffer.from(buffer);
  let noteOn = 0;
  const byCh = {};
  for (let i = 0; i < b.length - 2; i++) {
    const st = b[i] & 0xf0;
    const ch = b[i] & 0x0f;
    if (st === 0x90 && b[i + 2] > 0) {
      noteOn++;
      byCh[ch] = (byCh[ch] || 0) + 1;
    }
  }
  return { noteOn, byCh, size: b.length, header: b.slice(0, 4).toString('ascii') };
}

async function main() {
  const report = { ts: new Date().toISOString(), steps: [] };
  const log = (step, detail) => {
    report.steps.push({ step, detail });
    console.log(`[${step}]`, typeof detail === 'object' ? JSON.stringify(detail) : detail);
  };

  const { token, user } = await apiLogin();
  log('api-login', 'ok');

  const midiRes = await fetch(`${API}/songs/${SONG_ID}/midi?parts=P24`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  log('midi-P24', {
    status: midiRes.status,
    stats: midiRes.status === 200 ? countNoteOns(await midiRes.arrayBuffer()) : await midiRes.text(),
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(
    ({ tokenKey, token, userJson }) => {
      localStorage.setItem('app.auth.keepLoggedIn', 'true');
      localStorage.setItem('app.auth.user', userJson);
      localStorage.setItem(tokenKey, token);
    },
    { tokenKey: TOKEN_KEY, token, userJson: JSON.stringify(user) },
  );

  const page = await context.newPage();
  const consoleLines = [];
  page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto(`${BASE}/study/${SONG_ID}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  await page.getByRole('button', { name: /iniciar estudo|continuar|abrir partitura/i }).first().click({
    timeout: 120_000,
  }).catch(() => undefined);

  await page.waitForSelector('.score-container, [class*="score"]', { timeout: 120_000 }).catch(() => undefined);

  const drumMidiCheckbox = page.getByLabel(/incluir.*bateria.*áudio|bateria.*midi|midi.*bateria/i).first();
  if (await drumMidiCheckbox.isVisible().catch(() => false)) {
    await drumMidiCheckbox.check();
  }

  const play = page.getByRole('button', { name: 'Play', exact: true });
  await play.waitFor({ state: 'visible', timeout: 120_000 });
  for (let i = 0; i < 90; i++) {
    if (await play.isEnabled()) break;
    await page.waitForTimeout(2000);
  }
  log('play-enabled', await play.isEnabled());

  await play.click();
  await page.waitForTimeout(5000);

  const sequencer = await page.evaluate(() => {
    const hidden = document.querySelector('[aria-hidden="true"]');
    const walk = (root) => {
      if (!root || typeof root !== 'object') return null;
      if (root._sequencer && typeof root._sequencer.duration === 'number') {
        return {
          duration: root._sequencer.duration,
          isLoading: root._sequencer.isLoading,
          currentTime: root._sequencer.currentTime,
        };
      }
      return null;
    };
    for (const key of Object.keys(window)) {
      try {
        const v = window[key];
        const found = walk(v);
        if (found) return found;
      } catch {
        /* ignore */
      }
    }
    return null;
  });
  log('sequencer', sequencer);

  log('errors-on-page', await page.getByRole('alert').allTextContents());
  report.console = consoleLines.filter(
    (l) => /study|midi|audio|error|warn/i.test(l),
  );
  log('console', report.console.slice(0, 20));

  await page.screenshot({ path: join(__dirname, 'e2e-study-drums.png'), fullPage: true });
  await browser.close();

  writeFileSync(join(__dirname, 'e2e-study-drums-report.json'), JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
