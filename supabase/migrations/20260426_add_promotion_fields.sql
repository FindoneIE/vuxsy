alter table if exists public.listings
  add column if not exists promoted_until timestamptz,
  add column if not exists last_promoted_at timestamptz,
  add column if not exists promotion_tier text default 'standard',
  add column if not exists promotion_weight int default 1,
  add column if not exists promotion_source text default 'free',
  add column if not exists promotion_status text default 'active';

create index if not exists listings_promoted_category_idx
  on public.listings (category_id, promoted_until, promotion_tier, promotion_weight);
