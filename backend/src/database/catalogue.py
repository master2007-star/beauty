"""Seed the React demo catalogue in a small number of database round trips."""
import json
from src.config import DATA_DIR
from src.database.connection import get_connection


def seed_frontend_catalogue():
    products = json.loads((DATA_DIR / 'frontend-catalogue.json').read_text(encoding='utf-8'))
    with get_connection() as conn:
        cursor = conn.cursor()
        product_rows = []
        stores = {}
        for product in products:
            specs = {'Frontend ID': product['id'], 'Quantity': product['quantity'], 'Skin Type': product.get('skinType', ''), 'Key Ingredients': product['keyIngredients'], 'Usage': product['howToUse']}
            product_rows.append(('frontend:' + product['id'], product['name'], product['brand'], product['subcategory'], product['description'], json.dumps(specs), product['image']))
            for offer in product['storeOffers']:
                stores[offer['storeName']] = {'nykaa': 'nykaa.com', 'tira': 'tirabeauty.com', 'purplle': 'purplle.com', 'amazon': 'amazon.in', 'myntra': 'myntra.com'}.get(offer['storeId'], '')
        cursor.execute('INSERT INTO products (sku, title, brand, category, description, specs_json, image_url) VALUES ' + ','.join(['(?,?,?,?,?,?,?)'] * len(product_rows)) + ''' ON CONFLICT(sku) DO UPDATE SET title=excluded.title, brand=excluded.brand, category=excluded.category, description=excluded.description, specs_json=excluded.specs_json, image_url=excluded.image_url''', tuple(value for row in product_rows for value in row))
        cursor.execute('SELECT id,sku FROM products')
        product_ids = {row['sku']: row['id'] for row in cursor.fetchall()}
        cursor.execute('INSERT INTO stores (name,domain) VALUES ' + ','.join(['(?,?)'] * len(stores)) + ' ON CONFLICT(name) DO NOTHING', tuple(value for row in stores.items() for value in row))
        cursor.execute('SELECT id,name FROM stores')
        store_ids = {row['name']: row['id'] for row in cursor.fetchall()}
        offers = [(product_ids['frontend:' + product['id']], store_ids[offer['storeName']], offer['price'], offer.get('originalPrice'), offer.get('shippingFee'), 'INR', 'In Stock' if offer['inStock'] else 'Out of Stock', product['quantity'], offer['purchaseUrl']) for product in products for offer in product['storeOffers']]
        cursor.execute('INSERT INTO offers (product_id,store_id,current_price,original_price,shipping_cost,currency,availability,variant_name,offer_url) VALUES ' + ','.join(['(?,?,?,?,?,?,?,?,?)'] * len(offers)) + ''' ON CONFLICT(product_id,store_id) DO UPDATE SET current_price=excluded.current_price, original_price=excluded.original_price, shipping_cost=excluded.shipping_cost, availability=excluded.availability, variant_name=excluded.variant_name, offer_url=excluded.offer_url''', tuple(value for row in offers for value in row))

def resolve_catalogue_id(value):
    if isinstance(value, int) or (isinstance(value, str) and value.isdigit()):
        return int(value)
    with get_connection() as conn:
        row = conn.execute('SELECT id FROM products WHERE sku = ?', ('frontend:' + str(value),)).fetchone()
    return row[0] if row else None
