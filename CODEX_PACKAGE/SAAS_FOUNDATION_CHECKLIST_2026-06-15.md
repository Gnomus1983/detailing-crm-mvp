# SaaS Foundation Checklist - 2026-06-15

## Где мы сейчас

Проект уже вышел из стадии "одна сырая CRM для одного центра".

Сейчас у нас есть:

- рабочее CRM MVP для детейлинга
- публичная форма `/request`
- клиентская страница `/status/:token`
- Telegram-уведомления менеджеру
- Telegram-контур для клиента "машина готова"
- витрина / лендинг для продажи продукта

Но внутренняя архитектура приложения пока еще в основном single-company.

Это значит:

- продукт уже можно показывать и продавать как первый центр
- но для настоящего SaaS на много компаний нужен следующий фундаментальный слой

## Что уже подготовлено

В репозитории уже есть черновой SaaS-фундамент на уровне миграций:

- `supabase/migrations/20260614124500_prepare_multi_tenant_foundation.sql`
- `supabase/migrations/20260614130000_backfill_default_company.sql`
- `supabase/migrations/20260614133000_clients_company_phone_uniqueness.sql`
- `supabase/migrations/20260614134500_company_scoped_rls_core.sql`

То есть на уровне базы уже подготовлены:

- таблица `companies`
- таблица `company_members`
- поле `business_type`
- nullable `company_id` в ключевых таблицах
- backfill первой live-компании
- черновой переход на company-scoped RLS
- переход от глобального уникального телефона к `(company_id, phone)`

## Что уже заложено правильно

### База

- `companies`
- `company_members`
- `clients.company_id`
- `services.company_id`
- `leads.company_id`
- `lead_events.company_id`
- `attachments.company_id`
- `automation_runs.company_id`
- `client_accounts.company_id`

### Архитектурный запас под универсальный продукт

- `business_type` уже учитывает:
  - `detailing`
  - `car_wash`
  - `tire_service`

Это хороший фундамент под:

- детейлинг
- автомойки
- шиномонтаж

без переписывания базы заново.

## Что пока еще живет как single-company

### Frontend

Сейчас фронт еще не живет через `activeCompanyId`.

Основные места:

- `src/App.jsx`
- `src/crm.js`
- `src/supabase.js`

Там логика все еще исходит из того, что:

- текущий пользователь работает в одном общем пространстве
- запросы не фильтруются явно по активной компании
- роль в основном читается как глобальная

### CRM helper functions

В `src/crm.js` пока нет company-aware логики:

- `createOrReuseClient()` ищет клиента только по `phone`
- `upsert(... onConflict: "phone")` все еще single-company
- `createLeadRecord()` не прокидывает `company_id`
- `submitPublicLead()` не передает `company_slug` или `company_id`

### Public intake

В `supabase/functions/public-request/index.ts` пока нет компании во входе:

- нет `company_slug`
- нет `company_id`
- rate limit общий для action key, а не для компании
- `submit_public_lead` вызывается без company context

### Telegram / automation

В `supabase/functions/lead-alert/index.ts` пока менеджерский алерт еще single-company по смыслу:

- один `TELEGRAM_MANAGER_CHAT_ID`
- нет company-scoped chat routing
- сообщение не знает, в какой компании создана заявка

Это пока нормально для одного live-центра, но не подходит для SaaS.

## Что уже реально включено в live

На production проекте `knegynsaxsufwfbgqmoq` уже включено:

- `companies`
- `company_members`
- `company_id` в основных таблицах
- backfill первой live-компании
- per-company уникальность клиентов по `(company_id, phone)`
- первый слой company-scoped RLS
- company-aware `public-request`
- company-aware `lead-alert`

Проверка после применения показала:

- live public flow проходит успешно
- smoke suite проходит успешно (`9/9 passed`)
- новые лиды создаются уже с `company_id`

То есть честное состояние уже такое:

- SaaS-фундамент не просто подготовлен
- он уже частично включен в production
- следующий шаг теперь не "впервые применить фундамент", а аккуратно довести frontend и security-hardening

## Что уже не надо придумывать заново

Следующие вещи уже определены и их не нужно спорить по новой:

1. делаем multi-tenant через `companies + company_members`
2. роли переносим из глобальной логики в роль внутри компании
3. данные режем через `company_id`
4. первый go-to-market оставляем под детейлинг
5. универсальность готовим через `business_type`, а не через хаотичную "общую CRM"

## Следующий правильный порядок

### Этап 1. Безопасно довести live-базу до company-aware основы

- [x] проверить, какие из multi-tenant миграций уже реально применены в live
- [x] подготовить safe apply-order для production
- [x] применить multi-tenant миграции в live по порядку
- [x] проверить, что текущий центр получил свою запись в `companies`
- [x] проверить, что текущие пользователи попали в `company_members`
- [x] проверить, что в основных таблицах больше нет `company_id is null`

### Этап 2. Перевести backend-flow на company context

- [x] сделать `submit_public_lead` company-aware
- [x] добавить `company_slug` или эквивалент во внешний intake flow
- [x] писать `company_id` в новые лиды, события, вложения, automation runs
- [x] подготовить company-aware Telegram routing

### Этап 3. Перевести frontend на active company

- [ ] получить membership пользователя из `company_members`
- [ ] ввести `activeCompanyId`
- [ ] все выборки в CRM фильтровать по компании
- [ ] роль читать как роль пользователя внутри компании

### Этап 3a. Довести security-hardening без поломки live

- [x] убрать лишние `anon` execute grants с helper functions
- [x] проверить smoke после ужесточения прав
- [x] вернуть только те `authenticated` grants, без которых ломается текущее RLS
- [ ] при желании позже вынести policy-helper functions в более строгую схему / модель

### Этап 4. Подготовить создание новых подписочных компаний

- [ ] сценарий "создать новую компанию"
- [ ] сценарий "добавить owner"
- [ ] сценарий "дать slug / домен / бренд"
- [ ] первичные настройки компании
- [ ] пакет / план / billing layer

## Что считаем текущим этапом проекта

Текущий этап:

`рабочий MVP + витрина + подготовка SaaS-фундамента`

То есть честно:

- CRM уже продаваема как первый продукт
- витрина уже живая
- мобильное направление пока не главный приоритет
- следующий большой блок работы: не новый экран, а multi-tenant foundation

## Что не трогаем раньше времени

Пока не надо расползаться в:

- полноценное мобильное приложение
- App Store / Play Market
- сложную универсальную CRM "для всех сразу"
- billing automation до завершения multi-tenant фундамента

## Практический следующий шаг

Следующий рабочий шаг уже конкретный:

1. довести frontend до `activeCompanyId`
2. перевести `src/crm.js` helpers на явный company context
3. сделать company-aware выборки и записи на фронте
4. только после этого идти в onboarding новых подписочных компаний

## Safe Apply Order For Production

Если идем в production, порядок должен быть именно такой:

### 1. `20260614124500_prepare_multi_tenant_foundation.sql`

Что даст:

- создаст `companies`
- создаст `company_members`
- добавит nullable `company_id`
- добавит helper functions и индексы

После применения проверить:

- таблицы появились
- существующие сценарии CRM не сломались
- старый live-flow по заявкам все еще работает

### 2. `20260614130000_backfill_default_company.sql`

Что даст:

- создаст первую live-компанию
- заполнит `company_members`
- проставит `company_id` в существующие записи

После применения проверить:

- есть 1 рабочая компания
- owner / manager / detailer попали в `company_members`
- в `clients`, `services`, `leads` нет пустых `company_id`

### 3. `20260614133000_clients_company_phone_uniqueness.sql`

Что даст:

- уберет глобальную уникальность телефона
- переведет клиентов на уникальность внутри компании

После применения проверить:

- старый client create / reuse flow все еще работает
- поиск клиента по телефону не ломает CRM

### 4. `20260614134500_company_scoped_rls_core.sql`

Что даст:

- включит company-scoped RLS для основных таблиц

Это самый чувствительный шаг.

После применения проверить:

- owner видит свои данные
- manager видит свои данные
- detailer видит только назначенное
- `/request` все еще создает лид
- `/status/:token` все еще открывается

## Что проверить сразу после apply

Минимальный post-check:

1. login owner
2. login manager
3. login detailer
4. создать заявку через `/request`
5. открыть заявку в CRM
6. открыть `/status/:token`
7. проверить Telegram alert менеджеру

Если все это зеленое, только тогда идем в следующий шаг:

- делать backend company-aware уже на новой схеме
