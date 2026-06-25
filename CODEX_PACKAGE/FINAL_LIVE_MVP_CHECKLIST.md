# FINAL LIVE MVP CHECKLIST

Дата фиксации: 2026-06-15  
Проект: `detailing-crm-mvp`  
Live URL: `https://vivid-kettle-zdyw.here.now/`  
Supabase project ref: `knegynsaxsufwfbgqmoq`

## 1. Цель этого чеклиста

Этот список нужен перед фиксацией MVP как первой продаваемой live-версии.

Фокус:

- не добавлять новые большие фичи
- проверить, что текущий продуктовый контур работает целиком
- отделить `готово` от `можно улучшить позже`

## 2. Что уже подтверждено

### Build / smoke

- [x] `npm run build` проходит
- [x] Playwright smoke проходит по текущему живому сценарию (`9/9 passed`)
- [x] авторизованный manager-flow проходит
- [x] white screen на экране `Заявки` исправлен

### Auth

- [x] вход по email/password работает
- [x] Google login возвращает в правильный live-домен после настройки Supabase Auth URL Configuration
- [x] manager-role работает
- [x] owner-role отдельно перепроверен через smoke/live-check

### CRM core

- [x] `Dashboard` открывается
- [x] `Leads` открывается
- [x] клик по карточке заявки открывает detail card без падения страницы
- [x] `Clients` открывается
- [x] `Tasks` открывается
- [x] manager корректно не получает доступ к `Settings`
- [x] owner manual/smoke check для `Settings`

### Public customer layer

- [x] `/request` открывается без логина
- [x] валидация формы работает
- [x] заявка из `/request` создаёт клиента и lead
- [x] пошаговый wizard на `/request` работает
- [x] `/status/:token` открывается
- [x] customer status page показывает статус и историю
- [x] customer-visible photos поддерживаются

### Attachments / photos

- [x] фото можно добавить из CRM
- [x] у фото есть видимость для клиента
- [x] у фото есть этап `До / После`
- [x] фото можно удалить
- [x] customer status page группирует фото по `До / После`

### Backend / automation

- [x] public request backend flow живой
- [x] rate limit живой
- [x] lead creation живой
- [x] edge/backend public flow script подтверждает живой backend

## 3. Что ещё нужно сделать перед фиксацией MVP

Это не новые большие задачи. Это короткий остаточный список.

### Критично

- [x] owner-check:
  - [x] login owner
  - [x] открыть `Settings`
  - [x] проверить секции `Профиль / Команда / Настройки`

- [x] один live-check customer flow:
  - [x] открыть `/request`
  - [x] отправить заявку
  - [x] открыть lead в CRM
  - [x] получить `public_status_token`
  - [x] открыть `/status/:token`
  - [x] убедиться на свежем lead, что фото тоже видны после загрузки

Автоматически уже подтверждено после wizard-обновления:

- [x] live public flow script проходит
- [x] новая заявка создаётся в live Supabase
- [x] новый lead после wizard-check:
  - `lead_id`: `4f9a8a57-3adc-4640-8ce7-70673a807086`
  - `client_id`: `ff0f3767-544a-477e-a902-26ce2c639ccd`
  - `source`: `landing`
  - `public_status_token`: `7c4d1ac6-f096-417e-b38a-50ec1b421bfa`
- [x] owner settings smoke проходит с реальным owner-account
- [x] `get_public_lead_status(...)` по свежему token возвращает живой lead
- [x] в свежий lead загружено customer-visible photo:
  - `attachment_id`: `7c14f682-79f6-4e40-a831-fe28627cc73c`
  - `photo_stage`: `before`
- [x] live `/status/:token` показывает фото на клиентской странице

### Желательно

- [ ] ещё раз быстро просмотреть live UI на остатки смешанного языка
- [ ] зафиксировать owner smoke credentials в env для полного green regression
- [ ] обновить главный статус-документ проекта после завершения этих двух ручных проверок

## 4. Что не блокирует MVP

Это важно не тащить в текущую фиксацию:

- [ ] полноценный client cabinet
- [ ] React Native / Expo app
- [ ] публикация в App Store / Play Market
- [ ] глубокая аналитика
- [ ] универсализация CRM под все бизнесы
- [ ] большие auth-рефакторы

## 5. Переход к приложению

Переход к приложению разрешён после закрытия двух оставшихся ручных live-check пунктов выше.

Следующий этап после фиксации MVP:

1. PWA-обвязка текущего web-продукта
2. client app shell поверх уже готового customer flow
3. только потом, при необходимости, полноценный customer auth cabinet

## 6. Текущее решение

Если смотреть строго по приоритету, сейчас не надо уходить в новые фичи.

Остаточных MVP-блокеров больше нет.

MVP checkpoint на этой стадии можно считать зафиксированным как первую продаваемую web-версию.

После этого:

- MVP можно считать зафиксированным
- можно официально переходить к работе над приложением в формате PWA-first

## 7. Что идёт сразу после фиксации MVP

Это уже следующий продуктовый шаг, не часть текущей фиксации.

1. превратить `/request` в пошаговый wizard:
   - услуга
   - автомобиль
   - дата / время
   - контакт и отправка
2. ещё раз прогнать live customer flow уже через wizard
3. потом сделать PWA-обвязку текущего web-продукта

Важно:

- не уходить сразу в React Native
- не строить сейчас полноценный client cabinet
- не ломать рабочий token-flow `/status/:token`
