// @vitest-environment node
/**
 * Runs the real Supabase migration + seed in PGlite (Postgres compiled to WASM) with a stubbed
 * `auth` schema and the anon/authenticated roles, to check RLS and the order function.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

let db: PGlite
const ADMIN = '00000000-0000-4000-8000-000000000001'
const OTHER = '00000000-0000-4000-8000-000000000002'

async function as<T>(role: 'anon' | 'authenticated' | null, uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
  if (role) await db.exec(`set role ${role}`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
  }
}

let phone = 612000000
// each order gets its own phone number so the per-phone throttle only bites where it is tested
const order = (lines: object[], extra: object = {}) => ({
  lines,
  zone_id: 'rabat',
  locale: 'fr',
  honeypot: '',
  customer: { name: 'Salma Bennani', phone: `+212${phone++}`, address: '12 rue des Lilas, Rabat' },
  ...extra,
})

async function place(payload: object) {
  const r = await db.query<{ r: Record<string, unknown> }>('select public.place_order($1::jsonb) as r', [JSON.stringify(payload)])
  return r.rows[0].r as { order_number: string; subtotal: number; delivery_fee: number; total: number; items: { name: string }[] }
}

const stock = async (id: string) => (await db.query<{ stock: number }>('select stock from products where id = $1', [id])).rows[0].stock

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public, auth to anon, authenticated;
  `)
  await db.exec(readFileSync('supabase/migrations/20261026000000_boutique.sql', 'utf8'))
  // Supabase grants table privileges to these roles by default; RLS then decides.
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    grant usage, select on all sequences in schema public to anon, authenticated;
  `)
  await db.exec(readFileSync('supabase/seed.sql', 'utf8'))
  await db.exec(`insert into auth.users values ('${ADMIN}'), ('${OTHER}'); insert into admins values ('${ADMIN}');`)
}, 60_000)

describe('row level security', () => {
  it('lets anyone read the active catalog', async () => {
    const r = await as('anon', null, () => db.query('select count(*)::int as n from products'))
    expect((r.rows[0] as { n: number }).n).toBe(81)
  })

  it('hides inactive products from customers', async () => {
    await db.exec(`update products set is_active = false where id = 'lime-verre'`)
    const r = await as('anon', null, () => db.query(`select id from products where id = 'lime-verre'`))
    expect(r.rows).toHaveLength(0)
    await db.exec(`update products set is_active = true where id = 'lime-verre'`)
  })

  it('never lets customers read or write orders directly', async () => {
    await place(order([{ product_id: 'shampooing-argan', variant_id: null, qty: 1 }]))
    const read = await as('anon', null, () => db.query('select * from orders'))
    expect(read.rows).toHaveLength(0)
    await expect(
      as('anon', null, () => db.query(`insert into orders (number, customer_name, phone, city, address) values ('X', 'a', 'b', 'c', 'd')`)),
    ).rejects.toThrow(/row-level security/)
    await expect(as('anon', null, () => db.query(`update products set price = 1`))).resolves.toBeDefined()
    expect(Number((await db.query<{ price: string }>(`select price from products where id = 'shampooing-argan'`)).rows[0].price)).toBe(89)
  })

  it('lets admins read orders, and nobody else', async () => {
    const admin = await as('authenticated', ADMIN, () => db.query('select * from orders'))
    expect(admin.rows.length).toBeGreaterThan(0)
    const other = await as('authenticated', OTHER, () => db.query('select * from orders'))
    expect(other.rows).toHaveLength(0)
  })
})

describe('place_order', () => {
  it('prices from the database, not from the request', async () => {
    const before = await stock('shampooing-argan')
    const r = await place(order([{ product_id: 'shampooing-argan', variant_id: null, qty: 2, unit_price: 1 }]))
    expect(Number(r.subtotal)).toBe(178)
    expect(Number(r.delivery_fee)).toBe(30)
    expect(Number(r.total)).toBe(208)
    expect(r.order_number).toMatch(/^ML-\d{6}-[0-9A-F]{4}$/)
    expect(await stock('shampooing-argan')).toBe(before - 2)
  })

  it('applies promos, variant prices and free delivery', async () => {
    const r = await place(
      order([
        { product_id: 'serum-vitamine-c', variant_id: null, qty: 1 },
        { product_id: 'edp-rose-de-damas', variant_id: '100ml', qty: 1 },
      ]),
    )
    expect(Number(r.subtotal)).toBe(159 + 549)
    expect(Number(r.delivery_fee)).toBe(0)
    expect(r.items[1].name).toBe('Rose de Damas — Eau de parfum — 100 ml')
  })

  it('decrements the stock of the chosen shade', async () => {
    const q = `select stock from product_variants where product_id = 'vernis-brillance' and id = 'bordeaux'`
    const before = (await db.query<{ stock: number }>(q)).rows[0].stock
    await place(order([{ product_id: 'vernis-brillance', variant_id: 'bordeaux', qty: 3 }]))
    expect((await db.query<{ stock: number }>(q)).rows[0].stock).toBe(before - 3)
  })

  it('refuses out-of-stock items and leaves nothing behind', async () => {
    const count = async () => (await db.query<{ n: number }>('select count(*)::int as n from orders')).rows[0].n
    const before = await count()
    await expect(place(order([{ product_id: 'chouchous-satin', variant_id: null, qty: 1 }]))).rejects.toThrow(/out_of_stock/)
    expect(await count()).toBe(before)
  })

  it.each([
    ['an unknown city', { zone_id: 'paris' }, /invalid_zone/],
    ['a bot (honeypot)', { honeypot: 'acme' }, /rejected/],
    ['a bad phone', { customer: { name: 'Salma', phone: '123', address: '12 rue des Lilas' } }, /invalid_customer/],
    ['an empty basket', { lines: [] }, /invalid_lines/],
  ])('rejects %s', async (_label, extra, error) => {
    await expect(place(order([{ product_id: 'shampooing-argan', variant_id: null, qty: 1 }], extra))).rejects.toThrow(error)
  })

  it('throttles repeated orders from the same phone', async () => {
    const payload = order([{ product_id: 'gel-douche-fleur-oranger', variant_id: null, qty: 1 }], {
      customer: { name: 'Nadia', phone: '+212698765432', address: '5 avenue Hassan II' },
    })
    for (let i = 0; i < 5; i++) await place(payload)
    await expect(place(payload)).rejects.toThrow(/too_many_orders/)
  })
})

describe('set_order_status', () => {
  it('restores stock when an admin cancels an order', async () => {
    const before = await stock('masque-keratine')
    const r = await place(order([{ product_id: 'masque-keratine', variant_id: null, qty: 2 }]))
    expect(await stock('masque-keratine')).toBe(before - 2)
    await as('authenticated', ADMIN, () => db.query('select public.set_order_status($1, $2)', [r.order_number, 'cancelled']))
    expect(await stock('masque-keratine')).toBe(before)
    await expect(
      as('authenticated', ADMIN, () => db.query('select public.set_order_status($1, $2)', [r.order_number, 'new'])),
    ).rejects.toThrow(/cancelled_orders_are_final/)
  })

  it('is forbidden to non-admins', async () => {
    const r = await place(order([{ product_id: 'savon-noir', variant_id: null, qty: 1 }]))
    await expect(
      as('authenticated', OTHER, () => db.query('select public.set_order_status($1, $2)', [r.order_number, 'shipped'])),
    ).rejects.toThrow(/forbidden/)
  })
})
