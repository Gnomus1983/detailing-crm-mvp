with ranked_services as (
  select
    id,
    row_number() over (
      partition by name
      order by is_active desc, updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.services
)
update public.services
set is_active = false
where id in (
  select id
  from ranked_services
  where rn > 1
);
