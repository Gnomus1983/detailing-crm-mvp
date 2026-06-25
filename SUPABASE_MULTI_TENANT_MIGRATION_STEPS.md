# Supabase Multi-Tenant Migration Steps

Этот документ привязан к текущей live-схеме проекта и описывает безопасный переход с single-company CRM на multi-tenant SaaS.

## 1. Текущая база

Сейчас в live-схеме есть:

- `profiles`
- `clients`
- `services`
- `leads`
- `lead_events`
- `attachments`
- `automation_runs`
- `rate_limit_events`
- `client_accounts`

Главное ограничение:

- роль хранится глобально в `profiles.role`
- компании как сущности нет
- данные не разделены по `company_id`
- RLS проверяет роль пользователя и назначение заявки, но не принадлежность к компании

Поэтому текущая модель подходит для одного центра, но не подходит для SaaS для многих центров.

## 2. Цель миграции

После миграции должно быть так:

- в одной Supabase базе живет много компаний
- каждая запись относится к одной компании
- пользователь может входить в одну или несколько компаний
- роли задаются в контексте компании
- ни один центр не видит данные другого

## 3. Новые таблицы

### Шаг 1. Добавить `companies`

```sql
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  contact_phone text,
  contact_email text,
  timezone text not null default 'Europe/Chisinau',
  plan_code text not null default 'starter',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
```

### Шаг 2. Добавить `company_members`

```sql
create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'detailer')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (company_id, user_id)
);
```

## 4. Какие таблицы надо расширить

Добавить `company_id` в таблицы:

- `clients`
- `services`
- `leads`
- `lead_events`
- `attachments`
- `automation_runs`
- `client_accounts`

### На первом проходе делать `company_id` nullable

Это важно, чтобы не сломать live сразу.

Пример:

```sql
alter table public.clients add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.services add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.leads add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.lead_events add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.attachments add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.automation_runs add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.client_accounts add column if not exists company_id uuid references public.companies(id) on delete cascade;
```

## 5. Что делать с `profiles`

### Не хранить роль только в `profiles.role`

Сейчас:

- `profiles.role` = `owner / manager / detailer`

Для SaaS лучше:

- оставить `profiles` для общих данных пользователя
- роль читать из `company_members.role`

То есть `profiles.role` можно:

1. временно оставить для обратной совместимости
2. перестать использовать в новых RLS и во frontend
3. позже удалить или превратить в fallback

Это самый мягкий путь без резкой ломки.

## 6. Как мигрировать текущий live-центр

### Шаг 1. Создать первую компанию

Пример:

```sql
insert into public.companies (name, slug, contact_email, contact_phone)
values ('Detail CRM Demo Center', 'detail-crm-demo', 'arkhangel2016@gmail.com', null)
returning id;
```

Запомнить этот `company_id`.

### Шаг 2. Создать membership для текущих пользователей

Нужно пройти по текущим `profiles` и записать их в `company_members`.

```sql
insert into public.company_members (company_id, user_id, role)
select
  '<COMPANY_ID>'::uuid,
  p.id,
  p.role
from public.profiles p
on conflict (company_id, user_id) do nothing;
```

### Шаг 3. Проставить `company_id` во все текущие данные

```sql
update public.clients set company_id = '<COMPANY_ID>'::uuid where company_id is null;
update public.services set company_id = '<COMPANY_ID>'::uuid where company_id is null;
update public.leads set company_id = '<COMPANY_ID>'::uuid where company_id is null;
update public.lead_events set company_id = '<COMPANY_ID>'::uuid where company_id is null;
update public.attachments set company_id = '<COMPANY_ID>'::uuid where company_id is null;
update public.automation_runs set company_id = '<COMPANY_ID>'::uuid where company_id is null;
update public.client_accounts set company_id = '<COMPANY_ID>'::uuid where company_id is null;
```

## 7. Как связать дочерние таблицы корректно

Чтобы `lead_events`, `attachments`, `automation_runs` не расходились с `leads`, лучше делать backfill не “вручную по одному company_id”, а от `leads`.

Примеры:

```sql
update public.lead_events e
set company_id = l.company_id
from public.leads l
where e.lead_id = l.id
  and e.company_id is null;

update public.attachments a
set company_id = l.company_id
from public.leads l
where a.lead_id = l.id
  and a.company_id is null;

update public.automation_runs ar
set company_id = l.company_id
from public.leads l
where ar.lead_id = l.id
  and ar.company_id is null;
```

## 8. Когда делать `not null`

Только после backfill и проверки.

Порядок:

1. добавить колонку
2. заполнить старые данные
3. проверить `count(*) where company_id is null`
4. только потом:

```sql
alter table public.clients alter column company_id set not null;
alter table public.services alter column company_id set not null;
alter table public.leads alter column company_id set not null;
alter table public.lead_events alter column company_id set not null;
alter table public.attachments alter column company_id set not null;
```

`automation_runs` можно оставить nullable чуть дольше, если есть старые системные записи без `lead_id`.

## 9. Какие индексы добавить

После перехода почти все запросы будут идти через `company_id`.

Добавить индексы:

```sql
create index if not exists clients_company_id_idx on public.clients(company_id);
create index if not exists services_company_id_idx on public.services(company_id);
create index if not exists leads_company_id_idx on public.leads(company_id);
create index if not exists lead_events_company_id_idx on public.lead_events(company_id);
create index if not exists attachments_company_id_idx on public.attachments(company_id);
create index if not exists automation_runs_company_id_idx on public.automation_runs(company_id);
create index if not exists company_members_user_id_idx on public.company_members(user_id);
create index if not exists company_members_company_id_idx on public.company_members(company_id);
```

Уникальность телефонов тоже надо пересмотреть.

Сейчас:

- `clients.phone` уникален глобально

Для SaaS это плохо:

- один и тот же клиент может встречаться в двух разных центрах

Нужно перейти с глобального unique на составной:

```sql
drop index if exists clients_phone_unique_idx;
create unique index if not exists clients_company_phone_unique_idx on public.clients(company_id, phone);
```

Это важный пункт.

## 10. Как переписать RLS

### Базовая вспомогательная функция

Лучше сначала создать функцию:

```sql
create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  );
$$;
```

И отдельно:

```sql
create or replace function public.company_role(p_company_id uuid)
returns text
language sql
stable
as $$
  select cm.role
  from public.company_members cm
  where cm.company_id = p_company_id
    and cm.user_id = auth.uid()
    and cm.is_active = true
  limit 1;
$$;
```

### Пример для `clients`

Owner/manager:

```sql
using (
  public.is_company_member(clients.company_id)
  and public.company_role(clients.company_id) in ('owner', 'manager')
)
```

### Пример для `leads`

Owner/manager:

```sql
using (
  public.is_company_member(leads.company_id)
  and public.company_role(leads.company_id) in ('owner', 'manager')
)
```

Detailer:

```sql
using (
  public.is_company_member(leads.company_id)
  and public.company_role(leads.company_id) = 'detailer'
  and leads.assigned_to = auth.uid()
)
```

### Важная мысль

Сначала добавить новые policies.
Старые на `profiles.role` удалять только после того, как frontend и функции уже перешли на новую модель.

## 11. Что менять в SQL-функциях

Сейчас особое внимание на функции:

- `submit_public_lead(...)`
- `get_public_lead_status(...)`
- `handle_new_user()`

### `submit_public_lead`

Сейчас функция не знает, в какую компанию писать лид.

Нужно выбрать один из двух путей:

1. добавить параметр `p_company_id uuid`
2. лучше для публичного режима:
   добавить параметр `p_company_slug text`

Рекомендую:

```sql
submit_public_lead(..., p_company_slug text, ...)
```

Внутри функция:

1. ищет `company_id` по `slug`
2. создает/обновляет клиента в этой компании
3. создает лид в этой компании
4. пишет `company_id` в `lead_events`

### `get_public_lead_status`

Сейчас токен глобально уникален, и это нормально.

Но лучше, чтобы функция отдавала:

- `lead.company_id`
- и все join-данные только из той же компании

Даже если токен уникален, внутренняя дисциплина по `company_id` все равно нужна.

### `handle_new_user()`

Сейчас она только создает строку в `profiles`.

Это правильно и можно оставить.
Членство в компании туда мешать не надо.

`company_members` создается отдельно:

- через owner onboarding
- или через invite flow

## 12. Что менять в Edge Functions

Проверить и обновить:

- `public-request`
- `lead-alert`
- `follow-up-reminder`
- `daily-digest`
- `client-telegram-link`
- `telegram-webhook`
- `client-ready-telegram`

### Что им нужно

Все они должны понимать `company_id`.

Особенно:

- `lead-alert` должен брать Telegram-канал/настройки компании
- `follow-up-reminder` должен напоминать по лидам своей компании
- `daily-digest` должен строиться по компании
- `client-ready-telegram` должен использовать настройки нужной компании

Если позже у каждого центра будет свой Telegram-чат или свой бот, без `company_id` это развалится.

## 13. Что менять во frontend

Во frontend нужен `activeCompanyId`.

Минимальный порядок:

1. после логина загрузить:
   - `profile`
   - `company_members` для текущего пользователя
2. если membership один:
   сразу выбрать его
3. если несколько:
   показать экран выбора компании
4. все запросы фильтровать по `company_id`

Особенно проверить:

- заявки
- клиенты
- услуги
- настройки
- dashboard
- tasks
- отчеты директора

## 14. Публичные маршруты

Тебе понадобится компания в публичных страницах.

Лучший стартовый формат:

- `/request/:companySlug`
- `/status/:token`

Почему так:

- форма заявки должна однозначно знать, в какой центр пишет
- статус можно оставить по токену, если токен уникален

Если хочешь красивее позже:

- `center-slug.domain.com/request`

Но это уже второй этап.

## 15. Безопасный порядок внедрения

### Фаза A. Подготовка

1. создать `companies`
2. создать `company_members`
3. добавить nullable `company_id`
4. добавить индексы

### Фаза B. Миграция текущих live-данных

1. создать первую компанию
2. перенести текущих пользователей в membership
3. проставить `company_id` в данные
4. проверить, что `null` не осталось

### Фаза C. Backend compatibility

1. обновить SQL functions
2. обновить Edge Functions
3. не ломать текущий live UI

### Фаза D. Frontend

1. добавить `activeCompanyId`
2. переключить чтение/запись на компанию
3. протестировать роли

### Фаза E. Security

1. включить новые RLS policies
2. удалить старые role-only policies
3. прогнать smoke для owner / manager / detailer / public form / public status

## 16. Самые рискованные места

1. `clients.phone` unique
   Сейчас глобальный unique сломает SaaS-модель.

2. `profiles.role`
   Если оставить его главным источником прав, компании не изолируются нормально.

3. `submit_public_lead`
   Пока форма не знает компанию, публичный intake не масштабируется.

4. Telegram automation
   При нескольких компаниях нельзя держать все уведомления как “один общий центр”.

5. Dashboard metrics
   Все метрики должны считаться по `company_id`, иначе директор увидит чужие цифры.

## 17. Что делать следующим ходом

Самый правильный следующий рабочий шаг:

1. сделать первую миграцию:
   - `companies`
   - `company_members`
   - nullable `company_id`
2. сделать backfill для текущего центра
3. только потом переходить к RLS и frontend

Это даст мягкий переход без падения live.
