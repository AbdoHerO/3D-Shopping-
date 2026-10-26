// Supabase Edge Function (Deno): sends the shop owner a Telegram message and/or an email for every
// new order. Hook it to the `orders` table with a Database Webhook on INSERT (see README).
//
// Secrets (supabase secrets set ...):
//   WEBHOOK_SECRET        shared secret, sent by the webhook as the `x-webhook-secret` header
//   TELEGRAM_BOT_TOKEN    + TELEGRAM_CHAT_ID   (optional) Telegram alert
//   RESEND_API_KEY        + ORDER_EMAIL_TO + ORDER_EMAIL_FROM   (optional) email alert
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3'

interface OrderRecord {
  id: string
  number: string
  customer_name: string
  phone: string
  city: string
  address: string
  notes: string | null
  preferred_time: string | null
  subtotal: number
  delivery_fee: number
  total: number
  created_at: string
}

const env = (k: string) => Deno.env.get(k) ?? ''

function format(order: OrderRecord, items: { name_snapshot: string; qty: number; line_total: number }[]) {
  const lines = [
    `🛍️ Nouvelle commande ${order.number}`,
    '',
    ...items.map((i) => `• ${i.qty} × ${i.name_snapshot} — ${i.line_total} DH`),
    '',
    `Livraison : ${order.city} — ${order.delivery_fee} DH`,
    `Total : ${order.total} DH (paiement à la livraison)`,
    '',
    `👤 ${order.customer_name}`,
    `📞 ${order.phone}  https://wa.me/${order.phone.replace(/[^\d]/g, '')}`,
    `📍 ${order.address}`,
  ]
  if (order.preferred_time) lines.push(`🕒 ${order.preferred_time}`)
  if (order.notes) lines.push(`📝 ${order.notes}`)
  return lines.join('\n')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  if (!env('WEBHOOK_SECRET') || req.headers.get('x-webhook-secret') !== env('WEBHOOK_SECRET')) {
    return new Response('unauthorised', { status: 401 })
  }
  const body = await req.json()
  const order = body?.record as OrderRecord | undefined
  if (body?.type !== 'INSERT' || !order?.id) return new Response('ignored', { status: 200 })

  // place_order inserts the order first and its items right after, in the same transaction;
  // read them with the service role
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
  const { data: fresh } = await db.from('orders').select('*').eq('id', order.id).single()
  const { data: items } = await db.from('order_items').select('name_snapshot, qty, line_total').eq('order_id', order.id)
  const text = format((fresh as OrderRecord) ?? order, items ?? [])

  const jobs: Promise<Response>[] = []
  if (env('TELEGRAM_BOT_TOKEN') && env('TELEGRAM_CHAT_ID')) {
    jobs.push(
      fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: env('TELEGRAM_CHAT_ID'), text, disable_web_page_preview: true }),
      }),
    )
  }
  if (env('RESEND_API_KEY') && env('ORDER_EMAIL_TO') && env('ORDER_EMAIL_FROM')) {
    jobs.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: env('ORDER_EMAIL_FROM'),
          to: env('ORDER_EMAIL_TO').split(','),
          subject: `Nouvelle commande ${order.number} — ${order.total} DH`,
          text,
        }),
      }),
    )
  }
  const results = await Promise.allSettled(jobs)
  const failed = results.filter((r) => r.status === 'rejected' || !r.value.ok).length
  return new Response(JSON.stringify({ sent: jobs.length - failed, failed }), {
    status: failed ? 502 : 200,
    headers: { 'content-type': 'application/json' },
  })
})
