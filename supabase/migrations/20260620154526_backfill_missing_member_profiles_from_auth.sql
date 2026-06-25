with member_auth_data as (
  select
    cm.user_id as id,
    lower(nullif(trim(coalesce(au.email, '')), '')) as email,
    nullif(
      trim(
        coalesce(
          au.raw_user_meta_data ->> 'full_name',
          au.raw_app_meta_data ->> 'full_name',
          split_part(coalesce(au.email, ''), '@', 1)
        )
      ),
      ''
    ) as full_name,
    cm.role,
    nullif(trim(coalesce(au.raw_user_meta_data ->> 'telegram_chat_id', '')), '') as telegram_chat_id
  from public.company_members cm
  join auth.users au on au.id = cm.user_id
),
missing_profiles as (
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    telegram_chat_id
  )
  select
    mad.id,
    mad.email,
    mad.full_name,
    coalesce(mad.role, 'manager'),
    mad.telegram_chat_id
  from member_auth_data mad
  left join public.profiles p on p.id = mad.id
  where p.id is null
  on conflict (id) do nothing
  returning id
)
update public.profiles p
set
  email = coalesce(nullif(p.email, ''), mad.email),
  full_name = coalesce(nullif(p.full_name, ''), mad.full_name),
  telegram_chat_id = coalesce(nullif(p.telegram_chat_id, ''), mad.telegram_chat_id),
  role = coalesce(nullif(p.role, ''), mad.role, p.role),
  updated_at = timezone('utc', now())
from member_auth_data mad
where p.id = mad.id
  and (
    coalesce(p.email, '') = ''
    or coalesce(p.full_name, '') = ''
    or coalesce(p.telegram_chat_id, '') = ''
    or coalesce(p.role, '') = ''
  );
