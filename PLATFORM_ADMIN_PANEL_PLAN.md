# Platform Admin Panel Plan

Цель: сделать отдельный кабинет создателя Detail CRM для управления компаниями, активациями и подписками без смешивания этого слоя с обычной CRM центра.

## 1. Зачем нужен отдельный кабинет

У нас уже есть:

- витрина / маркетинговый сайт
- внутренняя CRM компании
- клиентские страницы `/request` и `/status/:token`

Для SaaS не хватает четвертой поверхности:

- `platform admin`

Это кабинет не для владельца детейлинг-центра.
Это кабинет для тебя как владельца продукта.

## 2. Что должно быть в первой версии

Первая версия должна быть простой и рабочей.

### Экран 1. Компании

Таблица:

- компания
- slug
- тип бизнеса
- статус
- тариф
- владелец
- телефон / email
- trial до
- подписка до
- дата подключения

Действия:

- открыть CRM компании
- поставить на паузу
- активировать
- сменить тариф

### Экран 2. Подписки

Список подписок:

- компания
- тариф
- monthly price
- billing status
- started at
- renews at / expires at

### Экран 3. Операционный обзор

Карточки:

- всего компаний
- активных
- trial
- paused
- MRR вручную

## 3. Как лучше по доступу

Не использовать для этого `company_members.role`.

Почему:

- `owner / manager / detailer` — роли внутри компании
- creator panel находится над всеми компаниями

Правильнее:

- отдельная таблица `platform_admins`
- отдельная helper function `is_platform_admin()`

## 4. Минимальная модель данных

### `platform_admins`

- `id uuid primary key`
- `user_id uuid not null references auth.users(id)`
- `is_active boolean not null default true`
- `created_at timestamptz default now()`

### `company_subscriptions`

- `id uuid primary key`
- `company_id uuid not null references companies(id)`
- `plan_code text not null`
- `billing_status text not null`
- `price_monthly numeric(10,2)`
- `currency text not null default 'EUR'`
- `trial_ends_at timestamptz`
- `starts_at timestamptz`
- `renews_at timestamptz`
- `ends_at timestamptz`
- `notes text`
- `created_at timestamptz`
- `updated_at timestamptz`

## 5. Как лучше открыть в продукте

Для старта:

- route: `/platform`

Потом, если захотим отделить сильнее:

- `admin.detailcrm...`

Но сейчас отдельного route внутри текущего приложения достаточно.

## 6. Что не надо делать сразу

Пока не нужно:

- Stripe billing automation
- invoice PDF
- tax logic
- self-serve checkout
- partner/referral system

Сначала нужен рабочий ручной backoffice.

## 7. Порядок внедрения

1. подготовить schema foundation
2. сделать доступ `platform_admin`
3. сделать route `/platform`
4. показать список компаний
5. добавить подписки
6. добавить переключение статуса компании
7. только потом думать про автооплату
