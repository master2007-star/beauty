"""Postgres transactions for the existing parameterized service queries."""
import re
from contextlib import contextmanager
import psycopg
from psycopg.rows import dict_row

IDENTITY_TABLES = {'products', 'stores', 'offers', 'price_history', 'users', 'wishlist', 'price_tracking', 'price_alerts', 'product_reviews', 'product_platform_ratings', 'price_check_logs', 'user_routines', 'user_routine_items'}


class Record(dict):
    def __getitem__(self, key):
        return list(self.values())[key] if isinstance(key, int) else super().__getitem__(key)


def parameter_sql(sql):
    # Replace bind markers only outside quoted SQL strings/identifiers.
    result, quote, i = [], None, 0
    while i < len(sql):
        ch = sql[i]
        if quote:
            result.append('%%' if ch == '%' else ch)
            if ch == quote:
                if i + 1 < len(sql) and sql[i + 1] == quote:
                    result.append(sql[i + 1]); i += 1
                else:
                    quote = None
        elif ch in "'\"":
            quote = ch; result.append(ch)
        else:
            result.append('%s' if ch == '?' else '%%' if ch == '%' else ch)
        i += 1
    return ''.join(result)


class Cursor:
    def __init__(self, conn):
        self.raw = conn.cursor(row_factory=dict_row)
        self.lastrowid = None
        self.pending = None

    @property
    def rowcount(self):
        return self.raw.rowcount

    def execute(self, sql, params=None):
        self.lastrowid = None; self.pending = None
        sql = sql.strip().rstrip(';')
        ignore = bool(re.match(r'INSERT\s+OR\s+IGNORE\s+', sql, re.I))
        sql = re.sub(r'INSERT\s+OR\s+IGNORE\s+', 'INSERT ', sql, flags=re.I)
        if ignore:
            sql += ' ON CONFLICT DO NOTHING'
        table = re.match(r'INSERT\s+INTO\s+(\w+)', sql, re.I)
        returning = bool(table and table[1].lower() in IDENTITY_TABLES and not re.search(r'\bRETURNING\b', sql, re.I))
        if returning:
            sql += ' RETURNING id'
        self.raw.execute(parameter_sql(sql) if params is not None else sql, params)
        if returning:
            self.pending = self.raw.fetchone()
            self.lastrowid = self.pending['id'] if self.pending else None
        return self

    def fetchone(self):
        if self.pending is not None:
            row, self.pending = self.pending, None
        else:
            row = self.raw.fetchone()
        return Record(row) if row is not None else None

    def fetchall(self):
        rows = self.raw.fetchall()
        if self.pending is not None:
            rows.insert(0, self.pending); self.pending = None
        return [Record(row) for row in rows]

    def __iter__(self):
        while (row := self.fetchone()) is not None:
            yield row


class Connection:
    def __init__(self, raw):
        self.raw = raw

    def cursor(self):
        return Cursor(self.raw)

    def execute(self, sql, params=None):
        return self.cursor().execute(sql, params)

    def executescript(self, sql):
        self.raw.execute(sql)


@contextmanager
def get_postgres_connection(url):
    with psycopg.connect(url, connect_timeout=15) as raw:
        raw.execute('SET LOCAL statement_timeout = 15000')
        raw.execute('SET LOCAL search_path TO pricewise')
        yield Connection(raw)
