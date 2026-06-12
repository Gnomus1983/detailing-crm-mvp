# Client App Backend Ready

## Статус решения

- Supabase уже подготовлен под будущий клиентский доступ.
- Текущая CRM не сломана: сотрудники продолжают жить через `profiles`.
- Для клиентского приложения добавлен совместимый слой, а не большой рефакторинг ядра CRM.
- При этом по продуктовому приоритету следующий клиентский слой всё равно должен оставаться лёгким:
  - сначала `status` / token-based experience для продаж и demo
  - потом, если реально понадобится, отдельный client auth app поверх уже подготовленного backend-слоя

## Продуктовая рекомендация

- Не тащить полноценный клиентский кабинет в ближайший demo как главный акцент.
- Использовать уже подготовленный backend как безопасный фундамент на будущее.
- Для первого customer-facing слоя держать фокус на:
  - `Мои заявки`
  - `Статус работы`
  - `Фото`
  - `История`
  но показывать это клиенту либо через очень лёгкий auth flow, либо раньше через `/status/:token`.

## Что найдено в текущей схеме

- `public.profiles` — сотрудники CRM, связаны с `auth.users`.
- `public.clients` — карточки клиентов.
- `public.leads` — заявки / работы, уже связаны с `clients` и `services`.
- `public.lead_events` — история по заявке.
- `public.attachments` — вложения по заявке, но без storage-связки.
- `storage` был пустой: bucket для клиентских фото не был настроен.
- В исходной схеме были небезопасные MVP-policy:
  - публичное чтение `clients`
  - публичное чтение `leads`
  - публичное чтение `lead_events`
  - публичное чтение `attachments`
  - слишком широкие authenticated write/update/delete policy на core-таблицах

## Что добавлено

### Новая таблица

- `public.client_accounts`
  - связывает auth-пользователя клиентского приложения с существующей записью в `public.clients`
  - схема:
    - `id`
    - `client_id`
    - `auth_user_id`
    - `email`
    - `status`
    - `last_login_at`
    - `created_at`
    - `updated_at`

### Доработка вложений

- В `public.attachments` добавлены:
  - `storage_bucket`
  - `storage_object_path`

Это позволяет безопасно связывать строку в БД с объектом в Supabase Storage.

### Новый storage bucket

- `client-lead-attachments`
  - private bucket
  - клиент видит только фото своих заявок
  - detailer видит только фото по назначенным ему заявкам
  - owner/manager сохраняют полный operational access

### Новые helper functions

- `public.is_current_user_staff()`
- `public.is_current_user_owner_or_manager()`
- `public.current_client_account_id()`
- `public.current_client_id()`
- `public.is_current_user_client()`
- `public.can_current_client_access_lead(uuid)`
- `public.can_current_client_access_attachment_object(text, text)`
- `public.link_my_client_account()`

### Новый client data layer

- `public.get_my_leads()`
- `public.get_my_active_lead()`
- `public.get_my_lead_events(uuid)`
- `public.get_my_lead_attachments(uuid)`

## Архитектура MVP

### Модель доступа

- сотрудник CRM продолжает жить через `profiles`
- клиентское приложение живёт через `client_accounts`
- одна запись `client_accounts` = один клиентский auth user
- `client_accounts.client_id` указывает на существующую запись `public.clients`
- клиент читает только:
  - свой `clients`
  - свои `leads`
  - свои `lead_events`
  - свои `attachments`
  - свои storage objects

### Логика входа

Рекомендуемый MVP:

1. клиент вводит email
2. фронт вызывает magic link / OTP email sign-in
3. после возврата сессии фронт вызывает:
   - `rpc('link_my_client_account')`
4. функция связывает `auth.uid()` с заранее подготовленным `client_accounts.email`

Это даёт мягкий onboarding без большого рефактора CRM.

## RLS-результат

Проверено live после миграции:

- клиент видит:
  - `clients = 1`
  - `leads = 1`
  - `lead_events = 3`
  - `attachments = 1`
  - `foreign_* = 0`
- manager продолжает видеть operational CRM
- detailer продолжает видеть только назначенный scope

### Фактическая проверка

- `client_victor`
  - `visible_clients = 1`
  - `visible_leads = 1`
  - `foreign_leads_visible = 0`
  - `visible_events = 3`
  - `foreign_events_visible = 0`
  - `visible_attachments = 1`
  - `foreign_attachments_visible = 0`
- `manager`
  - `visible_clients = 7`
  - `visible_leads = 7`
  - `visible_events = 23`
- `detailer`
  - `visible_clients = 1`
  - `visible_leads = 1`
  - `visible_events = 7`

## Новые policies

### public.clients

- `Clients can read own client`

### public.leads

- `Clients can read own leads`

### public.lead_events

- `Clients can read own lead events`

### public.attachments

- `Clients can read own attachments`

### public.client_accounts

- `Owners and managers can read client accounts`
- `Owners and managers can create client accounts`
- `Owners and managers can update client accounts`
- `Owners and managers can delete client accounts`
- `Clients can read own client account`

### storage.objects

- `Owners and managers can manage client attachment objects`
- `Detailers can read assigned client attachment objects`
- `Clients can read own attachment objects`

## Что нужно для frontend Next.js / PWA

### Env

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Auth settings в Supabase

Для client app рекомендован email magic link:

- `Authentication -> Sign In / Providers -> Email`:
  - включить magic link / OTP email flow
- `Authentication -> URL Configuration`:
  - `Site URL` = production URL клиентского приложения
  - `Redirect URLs`:
    - `https://client.detailcrm.md/auth/callback`
    - локальный callback при разработке

### Рекомендуемый flow на фронте

1. Экран входа
2. `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
3. После callback:
   - `await supabase.rpc('link_my_client_account')`
4. Затем загрузка данных:
   - `get_my_leads`
   - `get_my_active_lead`
   - `get_my_lead_events`
   - `get_my_lead_attachments`

## Примеры клиентских запросов

### Вход

```ts
await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

### Привязка клиентского аккаунта после callback

```ts
const { data, error } = await supabase.rpc('link_my_client_account');
```

### Список моих заявок

```ts
const { data, error } = await supabase.rpc('get_my_leads');
```

### Текущая активная заявка

```ts
const { data, error } = await supabase.rpc('get_my_active_lead');
```

### История по заявке

```ts
const { data, error } = await supabase.rpc('get_my_lead_events', {
  target_lead_id: leadId,
});
```

### Фото по заявке

```ts
const { data, error } = await supabase.rpc('get_my_lead_attachments', {
  target_lead_id: leadId,
});
```

### Загрузка приватного фото из bucket

Если в `attachments` есть `storage_bucket` и `storage_object_path`:

```ts
const { data, error } = await supabase.storage
  .from('client-lead-attachments')
  .createSignedUrl(storageObjectPath, 60 * 10);
```

## Как provision-ить клиента

Сотрудник CRM создаёт заранее клиентский доступ так:

```sql
insert into public.client_accounts (client_id, email, status)
values (
  '<client_uuid>',
  'client@example.com',
  'invited'
);
```

После первого magic-link входа `link_my_client_account()` автоматически привяжет `auth_user_id`.

## Что осталось необязательным, но полезным

- клиентский view `client_app_leads_v` для ещё более простого чтения
- отдельный `client_status_label` mapping для UI
- signed URL helper RPC
- soft-disable / re-invite flow для клиентов
- отдельный audit trail по клиентским логинам

## Архитектурные риски

1. Сейчас helper-функции для RLS оставлены executable для `authenticated`, потому что они реально используются в policy-слое.
   Более строгий следующий шаг:
   - вынести internal helpers в private schema
   - или закрыть их за additional wrapper layer

2. `submit_public_lead(...)` остаётся `SECURITY DEFINER` и доступен anon по текущей CRM-логике.
   Это ожидаемо для публичной формы, но нужно продолжать держать anti-spam / rate-limit слой рабочим.

3. `attachments` пока исторически опираются на `file_url`.
   Для клиентского приложения лучше постепенно перейти на:
   - `storage_bucket`
   - `storage_object_path`
   как на главный источник истины.

## Что использовать в клиентском приложении

Итоговый безопасный набор для экранов:

- экран `Мои заявки`
  - `rpc('get_my_leads')`
- экран `Статус работы`
  - `rpc('get_my_active_lead')`
- экран `Фото`
  - `rpc('get_my_lead_attachments', { target_lead_id })`
- экран `История`
  - `rpc('get_my_lead_events', { target_lead_id })`

Это уже готово поверх текущей CRM-базы без большого рефактора.
