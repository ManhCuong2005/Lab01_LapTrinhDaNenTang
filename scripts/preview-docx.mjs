import { chromium } from 'playwright-core';
import { readFile, mkdir } from 'node:fs/promises';

const data = (await readFile('output/bao-cao-vku.docx')).toString('base64');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 1 });
await page.setContent('<html><body style="margin:0;background:#e5e7eb"><div id="report"></div></body></html>');
await page.addScriptTag({ path: 'node_modules/jszip/dist/jszip.min.js' });
await page.addScriptTag({ path: 'node_modules/docx-preview/dist/docx-preview.js' });
await page.evaluate(async base64 => {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  await window.docx.renderAsync(bytes.buffer, document.querySelector('#report'), undefined, { breakPages: true, renderHeaders: true, renderFooters: true });
}, data);
await mkdir('output/qa/docx', { recursive: true });
const pages = page.locator('.docx-wrapper > section');
const count = await pages.count();
for (let i = 0; i < count; i++) await pages.nth(i).screenshot({ path: `output/qa/docx/page-${i + 1}.png` });
console.log(`DOCX preview pages: ${count}`);
await browser.close();
