-- Boutique schema: catalog, delivery zones, orders and admins, with row level security.
-- Customers (anon) can read the active catalog and place orders ONLY through place_order(),
-- which re-prices every line from these tables and decrements stock atomically.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key,
  slug text unique not null,
  name jsonb not null,
  sort int not null default 0
);

create table if not exists public.products (
  id text primary key,
  slug text unique not null,
  category_id text references public.categories(id) on update cascade on delete set null,
  brand text not null default '',
  name jsonb not null,
  description jsonb not null default '{}'::jsonb,
  how_to_use jsonb,
  ingredients text,
  size_label text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  promo_price numeric(10, 2) check (promo_price is null or promo_price >= 0),
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_new boolean not null default false,
  shape text not null default 'box' check (
    shape in ('bottle', 'pump', 'spray', 'dropper', 'jar', 'tube', 'perfume', 'lipstick', 'gloss', 'pen', 'compact', 'palette', 'polish', 'box', 'pouch', 'roll')
  ),
  width_cm numeric(6, 2) not null default 6 check (width_cm > 0),
  height_cm numeric(6, 2) not null default 15 check (height_cm > 0),
  depth_cm numeric(6, 2) not null default 4 check (depth_cm > 0),
  image text not null default '',
  gallery text[] not null default '{}',
  fixture_id text,
  shelf_level int check (shelf_level is null or shelf_level >= 0),
  slot_order numeric,
  facings int not null default 2 check (facings between 1 and 6),
  display_variants boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  product_id text not null references public.products(id) on update cascade on delete cascade,
  id text not null,
  name jsonb not null,
  color_hex text,
  price numeric(10, 2) check (price is null or price >= 0),
  promo_price numeric(10, 2) check (promo_price is null or promo_price >= 0),
  stock int not null default 0 check (stock >= 0),
  image text,
  sort int not null default 0,
  primary key (product_id, id)
);

create table if not exists public.delivery_zones (
  id text primary key,
  city text not null,
  fee numeric(10, 2) not null default 0 check (fee >= 0),
  eta jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort int not null default 0
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  status text not null default 'new' check (status in ('new', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  customer_name text not null,
  phone text not null,
  city text not null,
  address text not null,
  notes text,
  preferred_time text,
  payment_method text not null default 'cod' check (payment_method in ('cod')),
  subtotal numeric(10, 2) not null default 0,
  delivery_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  locale text not null default 'fr' check (locale in ('fr', 'ar', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_phone_idx on public.orders (phone, created_at desc);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on update cascade on delete set null,
  variant_id text,
  name_snapshot text not null,
  unit_price numeric(10, 2) not null,
  qty int not null check (qty > 0),
  line_total numeric(10, 2) not null
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- Same rules as src/lib/pricing.ts priceOf(): a variant's own price replaces the product price
-- (and the product promo); a promo only applies when it is lower than the price.
create or replace function public.effective_price(
  p_price numeric, p_promo numeric, v_price numeric, v_promo numeric, has_variant boolean
)
returns numeric
language sql
immutable
as $$
  select case
    when coalesce(cand, base + 1) < base then cand
    else base
  end
  from (
    select
      coalesce(v_price, p_price) as base,
      case
        when has_variant and v_promo is not null then v_promo
        when has_variant and v_price is not null then null
        else p_promo
      end as cand
  ) x
$$;

-- ---------------------------------------------------------------------------------------------
-- place_order: the only way to create an order
-- ---------------------------------------------------------------------------------------------
create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer jsonb := coalesce(payload -> 'customer', '{}'::jsonb);
  v_locale text := coalesce(nullif(payload ->> 'locale', ''), 'fr');
  v_name text := btrim(coalesce(v_customer ->> 'name', ''));
  v_phone text := regexp_replace(coalesce(v_customer ->> 'phone', ''), '[^0-9+]', '', 'g');
  v_address text := btrim(coalesce(v_customer ->> 'address', ''));
  v_settings jsonb;
  v_zone public.delivery_zones%rowtype;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_line jsonb;
  v_qty int;
  v_unit numeric;
  v_has_variant boolean;
  v_label text;
  v_subtotal numeric := 0;
  v_fee numeric := 0;
  v_threshold numeric;
  v_order_id uuid;
  v_number text;
  v_items jsonb := '[]'::jsonb;
  v_recent int;
  v_try int := 0;
begin
  if coalesce(payload ->> 'honeypot', '') <> '' then
    raise exception 'rejected';
  end if;
  if v_locale not in ('fr', 'ar', 'en') then
    v_locale := 'fr';
  end if;
  if length(v_name) < 2 or length(v_name) > 120 or v_phone !~ '^\+?[0-9]{9,15}$' or length(v_address) < 6 or length(v_address) > 500 then
    raise exception 'invalid_customer';
  end if;
  if jsonb_typeof(payload -> 'lines') is distinct from 'array'
     or jsonb_array_length(payload -> 'lines') = 0
     or jsonb_array_length(payload -> 'lines') > 50 then
    raise exception 'invalid_lines';
  end if;

  -- throttle: at most 5 orders per phone number per hour
  select count(*) into v_recent from public.orders where phone = v_phone and created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'too_many_orders';
  end if;

  select * into v_zone from public.delivery_zones where id = payload ->> 'zone_id' and is_active;
  if not found then
    raise exception 'invalid_zone';
  end if;
  select data into v_settings from public.settings where id = 1;

  -- unique, human friendly number: PREFIX-YYMMDD-XXXX
  loop
    v_try := v_try + 1;
    v_number := coalesce(nullif(v_settings ->> 'orderPrefix', ''), 'CMD') || '-' || to_char(now(), 'YYMMDD') || '-'
      || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    exit when not exists (select 1 from public.orders where number = v_number) or v_try > 8;
  end loop;

  insert into public.orders (number, customer_name, phone, city, address, notes, preferred_time, locale)
  values (
    v_number, v_name, v_phone, v_zone.city, v_address,
    nullif(left(btrim(coalesce(v_customer ->> 'notes', '')), 400), ''),
    nullif(left(btrim(coalesce(v_customer ->> 'preferredTime', '')), 80), ''),
    v_locale
  )
  returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(payload -> 'lines') loop
    v_qty := (v_line ->> 'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'invalid_qty';
    end if;
    select * into v_product from public.products where id = v_line ->> 'product_id' and is_active for update;
    if not found then
      raise exception 'product_unavailable:%', v_line ->> 'product_id';
    end if;
    v_has_variant := (v_line ->> 'variant_id') is not null;
    v_label := coalesce(v_product.name ->> v_locale, v_product.name ->> 'fr');
    if v_has_variant then
      select * into v_variant from public.product_variants
        where product_id = v_product.id and id = v_line ->> 'variant_id' for update;
      if not found then
        raise exception 'variant_unavailable:%', v_line ->> 'variant_id';
      end if;
      if v_variant.stock < v_qty then
        raise exception 'out_of_stock:%', v_product.id;
      end if;
      update public.product_variants set stock = stock - v_qty where product_id = v_product.id and id = v_variant.id;
      v_unit := public.effective_price(v_product.price, v_product.promo_price, v_variant.price, v_variant.promo_price, true);
      v_label := v_label || ' — ' || coalesce(v_variant.name ->> v_locale, v_variant.name ->> 'fr');
    else
      if v_product.stock < v_qty then
        raise exception 'out_of_stock:%', v_product.id;
      end if;
      update public.products set stock = stock - v_qty where id = v_product.id;
      v_unit := public.effective_price(v_product.price, v_product.promo_price, null, null, false);
    end if;

    insert into public.order_items (order_id, product_id, variant_id, name_snapshot, unit_price, qty, line_total)
    values (v_order_id, v_product.id, v_line ->> 'variant_id', v_label, v_unit, v_qty, v_unit * v_qty);
    v_subtotal := v_subtotal + v_unit * v_qty;
    v_items := v_items || jsonb_build_object(
      'productId', v_product.id, 'variantId', v_line ->> 'variant_id', 'name', v_label,
      'unitPrice', v_unit, 'qty', v_qty, 'lineTotal', v_unit * v_qty
    );
  end loop;

  v_threshold := nullif(v_settings ->> 'freeDeliveryThreshold', '')::numeric;
  v_fee := case when v_threshold is not null and v_subtotal >= v_threshold then 0 else v_zone.fee end;
  update public.orders set subtotal = v_subtotal, delivery_fee = v_fee, total = v_subtotal + v_fee where id = v_order_id;

  return jsonb_build_object(
    'order_number', v_number, 'subtotal', v_subtotal, 'delivery_fee', v_fee,
    'total', v_subtotal + v_fee, 'items', v_items
  );
end
$$;

-- Admin-only status change; cancelling puts the items back in stock.
create or replace function public.set_order_status(p_number text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item public.order_items%rowtype;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select * into v_order from public.orders where number = p_number for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_order.status = 'cancelled' and p_status <> 'cancelled' then
    raise exception 'cancelled_orders_are_final';
  end if;
  if p_status = 'cancelled' and v_order.status <> 'cancelled' then
    for v_item in select * from public.order_items where order_id = v_order.id loop
      if v_item.variant_id is not null then
        update public.product_variants set stock = stock + v_item.qty where product_id = v_item.product_id and id = v_item.variant_id;
      elsif v_item.product_id is not null then
        update public.products set stock = stock + v_item.qty where id = v_item.product_id;
      end if;
    end loop;
  end if;
  update public.orders set status = p_status where id = v_order.id;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admins enable row level security;

create policy "settings readable" on public.settings for select using (true);
create policy "settings admin" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "categories readable" on public.categories for select using (true);
create policy "categories admin" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "active products readable" on public.products for select using (is_active or public.is_admin());
create policy "products admin" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "variants readable" on public.product_variants for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_admin()))
);
create policy "variants admin" on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "zones readable" on public.delivery_zones for select using (true);
create policy "zones admin" on public.delivery_zones for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- no insert policy on orders/order_items: customers go through place_order()
create policy "orders admin read" on public.orders for select to authenticated using (public.is_admin());
create policy "orders admin delete" on public.orders for delete to authenticated using (public.is_admin());
create policy "order items admin read" on public.order_items for select to authenticated using (public.is_admin());

create policy "admins see themselves" on public.admins for select to authenticated using (user_id = auth.uid());

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;
revoke all on function public.set_order_status(text, text) from public;
grant execute on function public.set_order_status(text, text) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
