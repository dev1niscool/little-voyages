import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Export the actual header ship, including its flag, rather than maintain a
// second illustration. The opaque canvas lets each operating system apply its
// own home-screen mask; no rounded transparent corners are baked into PNGs.
const source = fileURLToPath(new URL('../', import.meta.url));
const main = await readFile(`${source}src/main.js`, 'utf8');
const boatTemplate = main.match(/const boat = [^\n]+?=> `([^`]+)`;/)?.[1];
if (!boatTemplate) throw new Error('Could not find the header boat SVG.');
const boat = boatTemplate.replaceAll('${color}', '#fff8e8').replaceAll('${cls}', '');
const innerBoat = boat.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const gradient = 'linear-gradient(135deg, #43cec0, #178a9e 68%, #7277c6)';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
await mkdir(`${source}public/icons`, { recursive: true });

// Reference reproduces the existing desktop badge's shape, tilt, glass edge,
// and ship proportions at high resolution for companion brand artwork.
const referencePage = await browser.newPage({ viewport: { width: 64, height: 64 }, deviceScaleFactor: 16 });
await referencePage.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:transparent;width:64px;height:64px;display:grid;place-items:center}.brand-mark{display:grid;place-items:center;width:49px;height:49px;border-radius:17px;transform:rotate(-5deg);background:${gradient};border:1px solid #ffffff7a;box-shadow:inset 0 2px 4px #ffffff6b,0 5px 12px #159ea526}.boat-art{width:46px;height:43px;transform:rotate(5deg) scale(1.09)}</style><span class="brand-mark">${boat}</span>`);
await referencePage.screenshot({ path: '/tmp/little-voyages-brand-reference.png', omitBackground: true });
await referencePage.evaluate(() => { document.body.style.background = '#eef5fc'; });
await referencePage.screenshot({ path: '/tmp/little-voyages-brand-reference-on-paper.png' });
await referencePage.close();

const svgIcon = ({ maskable = false, rounded = false } = {}) => {
  // The header's opposing rotations leave the ship upright. Preserve that
  // orientation; extend its gradient to the edge for an OS-masked app icon.
  const width = maskable ? 88 : 102.33;
  const height = width * .78;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#43cec0"/><stop offset=".68" stop-color="#178a9e"/><stop offset="1" stop-color="#7277c6"/></linearGradient><linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".18"/><stop offset=".13" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="100" height="100" ${rounded ? 'rx="31"' : ''} fill="url(#sea)"/><rect width="100" height="100" ${rounded ? 'rx="31"' : ''} fill="url(#gloss)"/><svg x="${(100 - width) / 2}" y="${(100 - height) / 2}" width="${width}" height="${height}" viewBox="0 0 100 78">${innerBoat}</svg></svg>\n`;
};

async function raster(size, file, maskable = false) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}body>svg{display:block;width:100%;height:100%}</style>${svgIcon({ maskable })}`);
  await page.screenshot({ path: `${source}public/${file}`, omitBackground: false });
}
try {
  await writeFile(`${source}public/icons/brand-ship.svg`, svgIcon());
  await writeFile(`${source}public/favicon.svg`, svgIcon({ rounded: true }));
  for (const size of [180, 192, 512]) await raster(size, `icons/brand-ship-${size}.png`);
  await raster(512, 'icons/brand-ship-maskable-512.png', true);
  await raster(32, 'favicon-32.png');
  console.log('Exported header ship as 180/192/512 app icons, a maskable icon, and favicons.');
  console.log('Header badge reference: /tmp/little-voyages-brand-reference.png');
} finally {
  await browser.close();
}
