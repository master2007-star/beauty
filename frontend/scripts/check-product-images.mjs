import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const provenance = JSON.parse(await readFile(new URL('public/images/products/sources.json', root), 'utf8'));
const catalogue = await readFile(new URL('src/data/products.ts', root), 'utf8');
const alternatives = await readFile(new URL('src/data/alternatives.ts', root), 'utf8');
const app = await readFile(new URL('src/App.tsx', root), 'utf8');
const productImages = [...catalogue.matchAll(/id: '(prod-\d+)',[\s\S]*?image: ['"]([^'"]+)['"]/g)];
const entries = Object.entries(provenance.images);
const baseArg = process.argv.find((arg) => arg.startsWith('--base-url='));
const baseUrl = baseArg?.slice('--base-url='.length);

assert.ok(productImages.length > 0, 'Catalogue must contain product images');
assert.equal(new Set(productImages.map((match) => match[2])).size, productImages.length, 'Two catalogue products use the same image');
assert.equal(new Set(entries.map(([, image]) => image.src)).size, entries.length, 'Duplicate asset paths');
assert.equal(new Set(entries.map(([, image]) => image.remoteUrl)).size, entries.length, 'Duplicate source URLs');
assert.equal(new Set(entries.map(([, image]) => image.sha256)).size, entries.length, 'Duplicate downloaded photos');
assert.equal(new Set(entries.map(([, image]) => image.assetSha256)).size, entries.length, 'Duplicate local photos');
assert.ok(!app.includes('CustomCursor'), 'Custom cursor is still mounted');
assert.ok(!catalogue.includes('images.unsplash.com'), 'Generic catalogue images remain');
assert.ok(!alternatives.includes('images.unsplash.com'), 'Generic dupe images remain');

for (const [, id, src] of productImages) {
  assert.equal(provenance.images[id]?.src, src, `Missing provenance for ${id}`);
}
for (const match of alternatives.matchAll(/image: ['"]([^'"]+)['"]/g)) {
  assert.ok(entries.some(([, image]) => image.src === match[1]), `Missing dupe asset ${match[1]}`);
}

await Promise.all(entries.map(async ([id, image]) => {
  const bytes = await readFile(new URL(`public${image.src}`, root));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${id}: invalid WebP`);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `${id}: invalid WebP`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), image.assetSha256, `${id}: local photo changed`);
  assert.equal(image.status, 200, `${id}: source was not downloaded successfully`);
  assert.ok(image.contentType.startsWith('image/'), `${id}: source was not an image`);
  assert.ok(image.width > 0 && image.height > 0, `${id}: empty image`);

  const targets = [];
  if (baseUrl) targets.push(new URL(image.src, baseUrl));
  if (process.argv.includes('--remote')) targets.push(image.remoteUrl);
  for (const url of targets) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, `${id}: ${url} returned ${response.status}`);
    assert.ok(response.headers.get('content-type')?.startsWith('image/'), `${id}: ${url} is not an image`);
    await response.arrayBuffer();
  }
}));

console.log(`PASS: ${productImages.length} catalogue products, ${entries.length} unique image assets, zero duplicate photos; cursor removed.`);
if (baseUrl) console.log(`PASS: all local image URLs returned HTTP 200 and image content types at ${baseUrl}`);
if (process.argv.includes('--remote')) console.log('PASS: all recorded source image URLs returned HTTP 200 and image content types.');
