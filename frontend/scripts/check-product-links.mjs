import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PRODUCTS_DATA } from '../src/data/products.ts';
import { getRetailerProductUrl, isProductSearchUrl } from '../src/utils/productLinks.ts';

const verification = JSON.parse(await readFile(new URL('../../docs/product-link-verification.json', import.meta.url), 'utf8'));
const retailerHosts = { Nykaa: 'nykaa.com', Tira: 'tirabeauty.com', Purplle: 'purplle.com', Myntra: 'myntra.com', 'Amazon India': 'amazon.in' };
let directOffers = 0;
let searchOffers = 0;

for (const product of PRODUCTS_DATA) {
  assert.ok(product.officialUrl, `${product.id}: missing official product link`);
  const official = new URL(product.officialUrl);
  assert.equal(official.protocol, 'https:');
  assert.notEqual(official.pathname, '/', `${product.id}: official link is a homepage`);
  const checked = verification.officialPages[product.id];
  assert.equal(checked.url, product.officialUrl);
  assert.equal(checked.httpStatus, 200, `${product.id}: product page was not verified`);
  assert.notEqual(new URL(checked.finalUrl).pathname, '/', `${product.id}: product page redirected to homepage`);

  for (const offer of product.storeOffers) {
    const url = new URL(offer.purchaseUrl);
    assert.equal(url.hostname.replace(/^www\./, ''), retailerHosts[offer.storeName], `${product.id}: wrong retailer for ${offer.storeName}`);
    assert.notEqual(url.pathname, '/', `${product.id}: retailer homepage link`);
    assert.equal(getRetailerProductUrl(product, offer.storeName, offer.purchaseUrl), offer.purchaseUrl);
    if (isProductSearchUrl(offer.purchaseUrl)) searchOffers++;
    else directOffers++;
  }
  for (const platform of product.platformRatings || []) {
    assert.notEqual(new URL(platform.productUrl).pathname, '/', `${product.id}: rating link opens homepage`);
  }
  for (const review of product.reviews || []) {
    assert.notEqual(new URL(review.sourceUrl).pathname, '/', `${product.id}: review link opens homepage`);
  }

  for (const [retailer, host] of Object.entries(retailerHosts)) {
    for (const bad of ['', '#', `https://www.${host}`, 'https://example.com/product', 'javascript:alert(1)']) {
      const repaired = getRetailerProductUrl(product, retailer, bad);
      const url = new URL(repaired);
      assert.equal(url.protocol, 'https:');
      assert.equal(url.hostname.replace(/^www\./, ''), host);
      assert.ok(isProductSearchUrl(repaired), `${product.id}: invalid URL was not replaced with a search`);
    }
  }
}

console.log(`PASS: ${PRODUCTS_DATA.length} verified official/product-page links; ${directOffers} retailer product links, ${searchOffers} retailer search links; zero homepage destinations.`);
console.log('PASS: invalid, homepage, and wrong-retailer URLs resolve safely to the exact brand/product-name search.');
