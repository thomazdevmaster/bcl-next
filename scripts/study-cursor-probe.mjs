/**
 * Sonda cursor de reprodução (headless). Requer: npm i playwright && npx playwright install chromium
 * Uso: node scripts/study-cursor-probe.mjs [hurricane|vento]
 */
import { chromium, devices } from 'playwright';

const BASE = process.env.STUDY_BASE_URL ?? 'http://localhost:3000';
const songFilter = process.argv[2] ?? 'hurricane';

async function probeSong(page, songName) {
  console.log(`\n=== ${songName} ===`);
  await page.goto(`${BASE}/study`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByRole('button', { name: /Iniciar estudo/i }).first().click({ timeout: 5_000 }).catch(async () => {
    const row = page.getByRole('listitem').filter({ hasText: new RegExp(songName, 'i') });
    await row.getByRole('button', { name: /Iniciar estudo/i }).click({ timeout: 60_000 });
  });

  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ timeout: 120_000 }).catch(() => null);
  if (await dialog.isVisible().catch(() => false)) {
    const clarinet = page.getByText(/Clarinete em Bb/i).first();
    if (await clarinet.isVisible().catch(() => false)) {
      const labels = page.locator('label').filter({ hasText: /Clarinete em Bb/i });
      const count = await labels.count();
      for (let i = 0; i < count; i++) {
        const input = labels.nth(i).locator('input');
        const type = await input.getAttribute('type');
        if (type === 'radio') await input.check();
        else await input.check();
      }
    }
    await page.getByRole('button', { name: /^Continuar$/i }).click({ timeout: 10_000 });
  }

  await page.waitForSelector('.study-osmd-host svg', { timeout: 180_000 });
  const play = page.getByRole('button', { name: /^Play$/i });
  await play.waitFor({ state: 'visible', timeout: 180_000 });
  for (let i = 0; i < 120; i++) {
    if (!(await play.isDisabled().catch(() => true))) break;
    await page.waitForTimeout(1000);
  }
  if (await play.isDisabled().catch(() => true)) {
    console.log('Play still disabled — player may have failed');
    return null;
  }

  await play.click();
  const samples = [];
  for (let t = 0; t <= 8000; t += 500) {
    await page.waitForTimeout(t === 0 ? 0 : 500);
    const sample = await page.evaluate(() => {
      const line = document.querySelector('.study-playback-line');
      const osmdHost = document.querySelector('.study-osmd-host');
      const container = document.querySelector('.score-container');
      const svg = osmdHost?.querySelector('svg');
      const lineRect = line?.getBoundingClientRect();
      const svgRect = svg?.getBoundingClientRect();
      return {
        t: performance.now(),
        line: line
          ? {
              left: lineRect?.left,
              top: lineRect?.top,
              height: lineRect?.height,
              width: lineRect?.width,
            }
          : null,
        scroll: container
          ? { top: container.scrollTop, left: container.scrollLeft, sh: container.scrollHeight, ch: container.clientHeight }
          : null,
        svgW: svgRect?.width,
        playbackLabel: document.body.innerText.match(/Compasso \d+, tempo \d+/)?.[0] ?? null,
      };
    });
    samples.push(sample);
  }
  return samples;
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    console.error('Chromium launch failed:', e.message);
    process.exit(2);
  }
  const context = await browser.newContext({ ...devices['iPhone 12'], locale: 'pt-BR' });
  const page = await context.newPage();

  const songs =
    songFilter === 'all'
      ? ['hurricane', 'Vento Ventania']
      : [songFilter === 'vento' ? 'Vento Ventania' : 'hurricane'];

  for (const song of songs) {
    try {
      const samples = await probeSong(page, song);
      if (!samples) continue;
      console.log(JSON.stringify(samples, null, 2));
      const withLine = samples.filter((s) => s.line?.height > 5);
      console.log(
        `samples=${samples.length} withLine=${withLine.length} playback=${samples.map((s) => s.playbackLabel).filter(Boolean).slice(0, 3)}`,
      );
    } catch (err) {
      console.error(`Failed ${song}:`, err.message);
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
