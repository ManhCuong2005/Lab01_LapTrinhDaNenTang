import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { createServer } from 'node:http';
import { mkdir } from 'node:fs/promises';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const received = [];
const api = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  let body = '';
  for await (const chunk of req) body += chunk;
  received.push(JSON.parse(body));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ id: received.at(-1).id }));
});
await new Promise(resolve => api.listen(8788, '127.0.0.1', resolve));
let vite = await preview({ preview: { host: '127.0.0.1', port: 4174, strictPort: true } });
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'allow' });
const page = await context.newPage();
try {
  await mkdir('docs/assets', { recursive: true });
  await page.goto('http://127.0.0.1:4174/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cached = await page.evaluate(async () => !!await caches.match('/'));
  if (!cached) throw new Error('App Shell was not cached');
  await page.screenshot({ path: 'docs/assets/01-tong-quan.png', fullPage: true });
  await page.locator('#endpoint').fill('http://localhost:8788/api/surveys');
  await page.locator('#saveEndpoint').click();
  await page.locator('[name=building]').fill('Khu A');
  await page.locator('[name=floor]').fill('2');
  await page.locator('[name=room]').fill('A204');
  await page.waitForTimeout(500);
  await vite.httpServer.close();
  await page.reload();
  await page.locator('[name=building]').waitFor();
  if (await page.locator('[name=building]').inputValue() !== 'Khu A') throw new Error('Draft did not survive offline reload');
  await page.locator('#nextBtn').click();
  await page.locator('[data-rating="3"]').click();
  await page.locator('[name=notes]').fill('Máy chiếu hiển thị mờ');
  await page.screenshot({ path: 'docs/assets/02-danh-gia-ngoai-tuyen.png', fullPage: true });
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }));
  await new Promise(resolve => api.close(resolve));
  await page.locator('#nextBtn').click();
  await page.locator('#nextBtn').click();
  await page.getByText('Chờ đồng bộ', { exact: true }).first().waitFor();
  await page.screenshot({ path: 'docs/assets/03-cho-dong-bo.png', fullPage: true });
  vite = await preview({ preview: { host: '127.0.0.1', port: 4174, strictPort: true } });
  await new Promise(resolve => api.listen(8788, '127.0.0.1', resolve));
  await page.evaluate(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true }));
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.getByText('Đã đồng bộ', { exact: true }).first().waitFor({ timeout: 30000 });
  await page.screenshot({ path: 'docs/assets/04-da-dong-bo.png', fullPage: true });
  if (new Set(received.map(item => item.id)).size !== 1 || received[0].building !== 'Khu A') throw new Error('Server did not receive the expected survey');
  console.log(`PASS: offline shell, draft reload, queue and online sync; server received ${received.length} request(s) for 1 UUID`);
} finally {
  await browser.close();
  await vite.httpServer.close();
  if (api.listening) await new Promise(resolve => api.close(resolve));
}
