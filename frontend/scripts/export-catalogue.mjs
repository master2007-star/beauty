import { PRODUCTS_DATA } from '../src/data/products.ts';
import { writeFile } from 'node:fs/promises';

const catalogue = PRODUCTS_DATA.map(({ id, slug, name, brand, category, subcategory, quantity, description, image, skinType, keyIngredients, howToUse, storeOffers }) => ({ id, slug, name, brand, category, subcategory, quantity, description, image, skinType, keyIngredients, howToUse, storeOffers }));
await writeFile(new URL('../../data/frontend-catalogue.json', import.meta.url), JSON.stringify(catalogue, null, 2) + '\n');
console.log(`Exported ${catalogue.length} demo products for the account backend.`);
