alter table if exists public.listings
	add column if not exists last_promoted_at timestamptz null;
