# Platform Panel Scope Freeze - 2026-06-17

Проект: `detailing-crm-mvp`

## Что фиксируем

Первую версию кабинета создателя фиксируем как отдельную поверхность над CRM компаний.

Это не CRM директора и не CRM менеджера.
Это backoffice создателя продукта.

## Route первой версии

- `/platform`

Позже можно вынести на отдельный поддомен, но сейчас route внутри текущего приложения считаем нормой.

## Кто видит этот кабинет

Только:

- `platform_admin`

Не видят:

- `owner`
- `manager`
- `detailer`

## Откуда берется доступ

Не через `company_members.role`.

Основа доступа:

- таблица `platform_admins`
- отдельная проверка platform-admin в приложении

## Что входит в первый scope

### 1. Обзор платформы

- всего компаний
- активные / пауза / архив
- triал
- MRR вручную
- сигналы внимания
- последние demo-заявки

### 2. Компании

- список компаний
- slug
- ниша
- статус
- тариф
- owner contact
- дата подключения
- сотрудники / клиенты / заявки / услуги

### 3. Подписка компании

- status
- plan
- billing status
- price per month
- starts at
- trial ends at
- renews at
- ends at
- internal notes

### 4. Быстрые действия по компании

- активировать
- поставить на паузу
- сменить billing status
- открыть форму клиента
- открыть вход компании

### 5. Demo requests

- список входящих demo-заявок
- смена статуса
- привязка к компании

## Что сознательно не входит в первый scope

- Stripe automation
- invoice PDF
- auto-billing
- seat billing automation
- revenue analytics enterprise-уровня
- полноценный impersonation в CRM компании

## Что считаем закрытым по этому freeze

- creator surface отделен от обычной CRM
- creator login не смешивается с owner / manager / detailer login
- быстрый вход в company context уже есть через:
  - company login deep link
  - public request deep link

## Что дальше после freeze

1. live-check creator surface
2. добивка company-aware хвостов
3. screenshots продукта
4. только потом premium redesign
