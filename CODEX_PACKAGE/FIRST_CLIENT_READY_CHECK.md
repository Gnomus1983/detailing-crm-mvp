# FIRST CLIENT READY CHECK

Дата live-проверки: 2026-06-11
Проект: `detailing-crm-mvp`
Supabase project ref: `knegynsaxsufwfbgqmoq`

## Что работает

### Технический минимум

- `npm run build` — зелёный
- `npm run test:smoke` — `5/5 passed`
- локальный CRM открывается на `http://127.0.0.1:4173`

### Public form

- `/request` открывается
- валидация пустой формы работает
- public request проходит успешно после очистки `rate_limit_events`
- новая заявка создаётся в CRM
- duplicate guard по телефону работает
- anti-spam rate limit работает

### Роли

- `owner` login проверен
- `manager` login проверен
- `detailer` login проверен
- для `detailer` подтверждена видимость только назначенной заявки
- `owner` видит заявку и её историю

Проверенные demo-аккаунты:

- owner: `owner.demo.1781121095302@gmail.com`
- manager: `detailcrm.manager.1781099947936@gmail.com`
- detailer: `test@detailcrm.com`

### Живой flow

Проверен живой lead:

- lead id: `1661d0ee-7504-4b6e-b633-814e7d021bf2`
- client: `Live Check Client`
- service: `Ceramica`

Подтверждено:

- public form создала клиента и заявку
- create/reuse client внутри CRM работает
- manager перевёл заявку в `in_progress`
- manager добавил заметку
- manager сохранил `follow_up_at`
- запись в `lead_events` появилась
- заявка назначена detailer
- detailer видит назначенную заявку
- owner видит заявку и события

### Telegram automation

- `lead-alert` живой, отвечает `200`, сообщение в Telegram отправлено
- `follow-up-reminder` живой, отвечает `200`, reminder отправлен
- в `automation_runs` есть `started/success` записи для:
  - `lead_alert`
  - `follow_up_reminder`
- в `lead_events` есть `reminder_sent`

## Что пришлось чинить

- очищена блокировка public form в `rate_limit_events`
- удалён demo-мусор `Rate Limit Smoke` / `Public Demo Client` / rate-limit хвосты
- починен smoke suite:
  - стабильное чтение `.env`
  - rate-limit smoke переведён на прямой `fetch`
- найдена и исправлена RLS-рекурсия в policy `Owners can manage all profiles`
- добавлена миграция:
  - `supabase/migrations/20260611_profiles_owner_policy_fix.sql`
- в repo добавлен fix, чтобы `public-request` после деплоя мог сам вызывать `lead-alert`

## Что ещё остаётся

### Обязательное перед первым реальным клиентом

- live Supabase function `public-request` ещё не задеплоена с новым auto-call в `lead-alert`
- поэтому сейчас цепочка `public form -> Telegram lead_created` подтверждена только ручным invoke `lead-alert`, а не автоматическим срабатыванием из `public-request`

### Необязательное

- убрать дубли старых услуг в `services`, если хотите довести demo-картину до идеала
- позже можно сделать scheduler/cron для `follow-up-reminder`, если хотите полностью автономный daily run без ручного invoke

## Итог

ГОТОВ К ПЕРВОМУ КЛИЕНТУ: почти

Главный остаток:

- нужен redeploy live-функции `public-request`, чтобы `lead_created` Telegram уходил автоматически сразу после публичной заявки

После этого проект можно считать готовым к первому клиенту без ручных обходных шагов.
