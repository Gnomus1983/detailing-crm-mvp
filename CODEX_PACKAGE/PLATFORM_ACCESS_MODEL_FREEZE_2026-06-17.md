# Platform Access Model Freeze - 2026-06-17

Проект: `detailing-crm-mvp`

## Что фиксируем

Модель доступа делим на 2 независимых слоя:

1. `platform_admin`  
2. `company_members.role`

Они не должны смешиваться.

## 1. Platform layer

`platform_admin` нужен только для создателя продукта.

Этот слой отвечает за:

- `/platform`
- список компаний
- активации
- тарифы
- статусы подписки
- demo-заявки с витрины

Источник доступа:

- таблица `public.platform_admins`
- helper function `public.is_platform_admin()`

`platform_admin` не является company-role.

## 2. Company layer

Роли внутри компании живут отдельно:

- `owner`
- `manager`
- `detailer`

Источник доступа:

- таблица `public.company_members`

Эти роли отвечают только за CRM конкретной компании.

## 3. Жесткое правило

Нельзя:

- использовать `platform_admin` как замену `owner`
- использовать `owner` как замену `platform_admin`
- давать creator-панель через `company_members.role`

## 4. Как читаем это во frontend

Во frontend:

- `isPlatformAdmin` определяет доступ к `/platform`
- `role` определяет доступ к CRM компании
- если `isPlatformAdmin = true`, основной route по умолчанию — `/platform`
- если `isPlatformAdmin = false`, route идёт по company-role permissions

## 5. Как читаем это в базе

### Platform access

- `platform_admins`
- `is_platform_admin()`
- platform-scoped RLS policies

### Company access

- `company_members`
- company-scoped RLS
- active company context

## 6. Что считаем правильной архитектурой дальше

Правильно:

- creator управляет платформой
- owner управляет своей компанией
- manager работает с заявками
- detailer работает только по назначенным задачам

Неправильно:

- один и тот же access-layer для всего
- creator как "супер-owner"
- company-role как вход в platform admin

## 7. Что это разблокирует дальше

После этого freeze можно спокойно продолжать:

- company-scoped hardening
- creator-panel развитие
- onboarding новых компаний
- billing / activation flows
