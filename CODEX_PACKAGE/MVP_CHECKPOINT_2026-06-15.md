# MVP CHECKPOINT — 2026-06-15

Проект: `detailing-crm-mvp`  
Stage: `sellable web MVP`  
Live URL: `https://vivid-kettle-zdyw.here.now/`  
Supabase project ref: `knegynsaxsufwfbgqmoq`

## 1. Что именно зафиксировано

На этом checkpoint проект считается не "черновой CRM", а первой рабочей web-версией продукта, которую уже можно:

- показывать владельцу центра
- использовать как live-demo
- давать на первый тест внутри реального центра
- упаковывать дальше как подписочный продукт

Это checkpoint не про "всё идеально", а про:

- продукт уже работает end-to-end
- витрина уже существует отдельно от CRM
- клиентский поток уже существует отдельно от внутренней CRM
- дальше можно идти в SaaS foundation, не ломая текущий рабочий контур

## 2. Что уже входит в checkpoint

### Product surfaces

- `Маркетинговая витрина / showcase`
- `Внутренняя CRM`
- `Публичная клиентская форма /request`
- `Публичная страница статуса /status/:token`

### Internal CRM

- роли `owner / manager / detailer`
- `Dashboard`
- `Leads`
- `Clients`
- `Tasks`
- `Settings` для owner
- карточка заявки
- комментарии
- follow-up
- назначение мастера
- загрузка фото
- статусы работы
- оплата / касса / финблок директора

### Customer-facing layer

- пошаговый wizard на `/request`
- публичная отправка заявки без логина
- генерация `public_status_token`
- клиентская страница статуса
- customer-visible фото
- блок подключения Telegram для клиента

### Automation

- Telegram alert менеджеру по новой заявке
- reminder / digest automation
- клиентский Telegram-ready контур для статуса `Готово`
- anti-spam / rate limit на публичном входе

### Sales layer

- отдельная витрина на `/`
- страницы:
  - `/features`
  - `/pricing`
  - `/demo`
  - `/login`
- pricing-пакеты
- contact block
- demo CTA

## 3. Что проверено на checkpoint

### Build / QA

- `npm run build` — проходит
- `npm run test:smoke` — `12/12 passed`

### Live behavior

- логин через `/login` работает
- owner / manager / detailer path живой
- creator / platform path живой
- creator-panel права в Supabase дотянуты до cross-company чтения и обновления подписок/статусов
- `/request` открывается
- `/request` wizard работает
- lead создаётся в live backend
- lead открывается в CRM
- `/status/:token` открывается
- клиентские фото и статус видны
- company login context через `/login?company_slug=...` работает
- `Контакты` на витрине прокручивают в нужный блок

### Public flow note

`npm run public:flow` на checkpoint даёт корректный зелёный результат с важной пометкой:

- публичный Edge Function rate limit активен
- fallback backend creation подтверждает, что backend заявки живой

То есть:

- защита не сломана
- backend не сломан
- ограничение сейчас именно защитное, а не аварийное

## 4. Что НЕ входит в этот checkpoint

Это важно не путать с текущим MVP:

- full mobile app
- React Native / Expo app
- App Store / Play Market packaging
- полноценный клиентский кабинет
- глубокая аналитика enterprise-уровня
- полноценный multi-tenant SaaS runtime
- универсальная CRM "для всех бизнесов подряд"

## 5. Текущий честный статус проекта

Сейчас проект находится здесь:

`рабочий web MVP + витрина + подготовка к SaaS`

Не здесь:

- не "сырая CRM"
- не "идеальный SaaS"
- не "готовое мобильное приложение"

## 6. Следующий правильный шаг

После этого checkpoint идти нужно так:

1. собрать реальные product screenshots для витрины
2. закрепить один clean demo-path для продаж
3. подготовить `companies / company_members / company_id`
4. только потом углубляться в multi-tenant SaaS foundation

## 7. Коротко для resume

Если открыть проект позже, нужно помнить главное:

- MVP уже рабочий
- storefront уже live
- smoke уже зелёный
- customer flow уже живой
- следующая фаза — не новые хаотичные фичи, а `SaaS foundation`
