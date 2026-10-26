-- Redesign (Oct 2026): package families for the product-to-3D pipeline, the 3D asset record and
-- the source of each product, plus per-product shelf orientation and display scale.
-- Safe to run on a database created with 20261026000000_boutique.sql (existing rows are upgraded).

alter table public.products drop constraint if exists products_shape_check;
update public.products set shape = case shape
    when 'bottle' then 'bottle-tall'
    when 'pump' then 'bottle-pump'
    when 'spray' then 'spray-bottle'
    when 'dropper' then 'dropper-bottle'
    when 'jar' then 'jar-lid'
    when 'perfume' then 'perfume-neck'
    when 'gloss' then 'lip-gloss'
    when 'pen' then 'pencil'
    when 'polish' then 'nail-polish'
    when 'box' then 'box-carton'
    when 'roll' then 'roll-on'
    else shape end
  where shape in ('bottle', 'pump', 'spray', 'dropper', 'jar', 'perfume', 'gloss', 'pen', 'polish', 'box', 'roll');
alter table public.products alter column shape set default 'box-carton';
alter table public.products add constraint products_shape_check check (shape in (
    'perfume-rect',
    'perfume-rounded',
    'perfume-cylinder',
    'perfume-neck',
    'bottle-tall',
    'bottle-rect',
    'bottle-pump',
    'bottle-squeeze',
    'bottle-flip-top',
    'dropper-bottle',
    'spray-bottle',
    'aerosol',
    'roll-on',
    'jar-cylinder',
    'jar-low',
    'jar-lid',
    'tube',
    'lipstick',
    'lip-gloss',
    'mascara',
    'pencil',
    'foundation-bottle',
    'foundation-tube',
    'compact',
    'palette',
    'nail-polish',
    'box-carton',
    'box-perfume',
    'box-flat',
    'box-gift-set',
    'pouch',
    'accessory',
    'card'
));

-- 3D asset (status, cut-out, silhouette, model source, review notes) and traceability (where the
-- record came from and under which licence). Prices, stock and variants stay in their columns.
alter table public.products add column if not exists asset jsonb;
alter table public.products add column if not exists source jsonb;
alter table public.products add column if not exists orientation text not null default 'upright';
alter table public.products drop constraint if exists products_orientation_check;
alter table public.products add constraint products_orientation_check check (orientation in ('upright', 'flat'));
alter table public.products add column if not exists display_scale numeric(4, 2) not null default 1;
alter table public.products drop constraint if exists products_display_scale_check;
alter table public.products add constraint products_display_scale_check check (display_scale between 0.5 and 2);

-- shelves now grow facings up to 10
alter table public.products drop constraint if exists products_facings_check;
alter table public.products add constraint products_facings_check check (facings between 1 and 10);

-- an imported record is identified by its source id, so re-running an import updates it
create unique index if not exists products_source_key on public.products ((source ->> 'name'), (source ->> 'id'))
  where source ->> 'kind' = 'import';
