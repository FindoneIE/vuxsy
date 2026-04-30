update public.listings
set
  promotion_status = 'active',
  promotion_tier = 'standard',
  promotion_weight = 1,
  promotion_source = 'free'
where promoted_until is not null
  and (promotion_status is null or promotion_tier is null or promotion_weight is null or promotion_source is null);
