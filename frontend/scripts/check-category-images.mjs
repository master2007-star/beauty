import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('src/data/categories.ts', root), 'utf8');
const provenance = JSON.parse(await readFile(new URL('public/images/categories/sources.json', root), 'utf8'));
const productProvenance = JSON.parse(await readFile(new URL('public/images/products/sources.json', root), 'utf8'));
const categories = [...source.matchAll(/name: '([^']+)',[\s\S]*?image: ['"]([^'"]+)['"]/g)];
const entries = Object.entries(provenance.images);
const allImages = [...entries.map(([, image]) => image), ...Object.values(productProvenance.images)];
const baseArg = process.argv.find((arg) => arg.startsWith('--base-url='));
const baseUrl = baseArg?.slice('--base-url='.length);

assert.equal(categories.length, 19, 'All 19 categories need an image');
assert.equal(entries.length, categories.length, 'Missing category provenance');
assert.equal(new Set(categories.map((match) => match[2])).size, categories.length, 'Repeated category image');
assert.equal(new Set(allImages.map((image) => image.assetSha256)).size, allImages.length, 'A category photo duplicates another category or product photo');
assert.equal(new Set(allImages.map((image) => image.originalSha256 || image.sha256)).size, allImages.length, 'Repeated source photograph');
assert.ok(!source.includes('images.unsplash.com'), 'Old category links remain');

await Promise.all(categories.map(async ([, name, src]) => {
  const image = provenance.images[name];
  assert.equal(image?.src, src, `${name}: missing provenance`);
  const bytes = await readFile(new URL(`public${src}`, root));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${name}: invalid WebP`);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `${name}: invalid WebP`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), image.assetSha256, `${name}: local image changed`);
  assert.equal(image.status, 200);
  assert.ok(image.contentType.startsWith('image/'));
  for (const url of [baseUrl && new URL(src, baseUrl), process.argv.includes('--remote') && image.remoteUrl].filter(Boolean)) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, `${name}: image URL returned ${response.status}`);
    assert.ok(response.headers.get('content-type')?.startsWith('image/'), `${name}: URL is not an image`);
    await response.arrayBuffer();
  }
}));
console.log(`PASS: all ${categories.length} category photos exist; zero repeated images across ${allImages.length} category/product assets.`);
if (baseUrl) console.log(`PASS: every category image loads at ${baseUrl}`);
if (process.argv.includes('--remote')) console.log('PASS: every source returns HTTP 200 and an image content type.');
