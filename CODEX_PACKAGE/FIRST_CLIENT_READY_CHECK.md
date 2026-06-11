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
- public request проходит успешно
- новая заявка создаётся в CRM
- duplicate guard по телефону работает
- anti-spam rate limit работает
- после live redeploy `public-request` сам вызывает `lead-alert`

### Роли

- `owner` login проверен
- `manager` login проверен
- `detailer` login проверен
- `detailer` видит только назначенную заявку
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

- `lead-alert` живой, отвечает `200`
- `follow-up-reminder` живой, отвечает `200`
- в `automation_runs` есть `started/success` для:
  - `lead_alert`
  - `follow_up_reminder`
- в `lead_events` есть `reminder_sent`

Дополнительно после финального redeploy проверен новый публичный lead:

- lead id: `3a45dbe6-3d3d-49e0-8af9-688cd1ccbfe4`
- client: `Auto Alert Client`
- ответ `public-request`: `alert_status = sent`
- в `automation_runs` автоматически появились `lead_alert started/success`
- в `lead_events` автоматически появилась запись `reminder_sent`

## Что пришлось чинить

- очищена блокировка public form в `rate_limit_events`
- удалён demo-мусор `Rate Limit Smoke` / `Public Demo Client` / хвосты rate limit
- починен smoke suite:
  - стабильное чтение `.env`
  - rate-limit smoke переведён на прямой `fetch`
- найдена и исправлена RLS-рекурсия в policy `Owners can manage all profiles`
- добавлена миграция:
  - `supabase/migrations/20260611_profiles_owner_policy_fix.sql`
- live redeploy `public-request` обновлён до версии, которая автоматически триггерит `lead-alert`
- добавлен защитный `try/catch` в `public-request`, чтобы не оставлять немые `500`

## Что ещё остаётся необязательным

- убрать дубли старых услуг в `services`, если захотите довести demo-картину до идеала
- позже можно вынести follow-up reminder на полностью автономный cron/scheduler, если нужен ежедневный run без ручного invoke
- можно расширить настройки: управление участниками команды, услугами и прайсами прямо из UI

## Итог

ГОТОВ К ПЕРВОМУ КЛИЕНТУ: да

Главный результат:

- публичная форма работает
- CRM flow работает
- роли работают
- Telegram automation работает
- smoke и build зелёные

Проект можно показывать клиенту и проводить первый живой demo-flow без ручных обходных шагов.
