/**
 * Smoke test: /score_playground carrega partitura webmscore + player.
 */
import { chromium } from 'playwright';

const BASE = process.env.STUDY_BASE_URL ?? 'http://127.0.0.1:3000';
const API = process.env.STUDY_API_URL ?? 'http://127.0.0.1:8080';
const SONG_TITLE = process.env.PLAYGROUND_SONG ?? 'hurricane';
const LOGIN_ID = process.env.STUDY_LOGIN ?? 'admin';
const LOGIN_PW = process.env.STUDY_PASSWORD ?? '#bcl.2026@';
const TOKEN_KEY = 'app.auth.token';

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
  return { token, user: data.user ?? data };
}

async function main() {
  const { token, user } = await apiLogin();
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
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(`${BASE}/score_playground`, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.getByRole('button', { name: 'Iniciar estudo' }).first().click();
  await page.getByRole('dialog').waitFor({ timeout: 60_000 });
  await page.getByRole('button', { name: /Continuar|Iniciar/i }).click();

  await page.getByRole('button', { name: 'Tocar' }).waitFor({ timeout: 180_000 });
  const svgCount = await page.locator('.score-playground-page svg').count();
  if (svgCount < 1) throw new Error('Nenhuma página SVG renderizada');

  await page.getByRole('button', { name: 'Tocar' }).click();
  await page.waitForTimeout(2500);
  const timeText = await page.locator('text=/\\d+:\\d+/').first().textContent();
  console.log(JSON.stringify({ ok: true, song: SONG_TITLE, svgCount, timeText, errors: errors.slice(0, 5) }, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
