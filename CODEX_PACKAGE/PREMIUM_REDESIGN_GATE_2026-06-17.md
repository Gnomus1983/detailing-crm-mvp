# Premium Redesign Gate - 2026-06-17

Проект: `detailing-crm-mvp`  
Live URL: `https://vivid-kettle-zdyw.here.now/`

## Зачем нужен этот gate

Сейчас проект уже не в стадии "сделать хоть что-то рабочее".

Сейчас у нас другая логика:

- web MVP уже живой
- витрина уже живая
- creator / platform surface уже начата
- SaaS-фундамент уже частично включен

Поэтому полный дорогой редизайн нельзя мешать с критическими foundation-задачами.

Этот документ фиксирует:

1. что уже считается стабильной базой
2. что надо закрыть до большого редизайна
3. что можно делать только после этого

## 1. Что уже считаем зафиксированным

- `CRM MVP` работает
- `public /request` работает
- `public /status/:token` работает
- `marketing storefront` работает
- `creator /platform` уже отделён от company CRM
- `multi-tenant foundation` уже начат в базе и частично в live
- `business_type` уже введён как запас под:
  - `detailing`
  - `car_wash`
  - `tire_service`

## 2. Что обязательно закрыть до большого премиум-редизайна

### A. Live stability

- [x] один полный production walkthrough без поломок:
  - [x] `/`
  - [x] `/features`
  - [x] `/pricing`
  - [x] `/demo`
  - [x] `/login`
  - [x] `/request`
  - [x] `/status/:token`
  - [x] `/platform`
- [x] ещё один быстрый проход по русскому live UI без смешанных хвостов
- [x] убедиться, что creator login всегда попадает только в creator surface
- [x] убедиться, что owner / manager / detailer не видят creator surface

### B. SaaS foundation

- [x] дожать первый creator-panel scope до зафиксированного минимума:
  - [x] компании
  - [x] статус активации
  - [x] тариф
  - [x] trial / paid dates
  - [x] owner contact
- [x] добить company-aware контур там, где ещё оставались single-company хвосты в public/request и доступах
- [x] зафиксировать company-scoped access model как основной

### C. Sales readiness

- [x] собрать реальные product screenshots вместо текстовых заглушек
- [x] зафиксировать один clean demo path для продажи
- [x] проверить, что demo CTA ведёт в правильный сценарий, а не в случайный auth-flow

## 3. Что входит в сам премиум-редизайн

Это уже отдельная фаза, не смешанная с foundation-фиксом.

### Visual direction

- более дорогой и спокойный US-style вид
- меньше "текстовых прямоугольников"
- лучше типографика
- чище вертикальный ритм
- больше ощущения продукта по подписке
- меньше ощущения "локальной самописной CRM"
- mobile-first подача с ощущением приложения, а не просто сайта
- тёмно-графитовая база с одним ярким бирюзово-мятным акцентом
- крупные уверенные заголовки и большой визуальный воздух
- большие CTA-кнопки и простая понятная навигация
- отдельное premium-ощущение для клиентского контура и PWA-слоя
- не копировать beauty / salon marketplace буквально, а взять только визуальную дисциплину, ритм, мобильную подачу и ощущение дорогого digital product

### Marketing upgrades

- сильный hero с реальным продуктовым визуалом
- mockups / screenshots CRM, manager flow, master flow, client status
- premium pricing presentation
- аккуратный demo CTA
- отдельный блок доверия / use cases / vertical fit

### Visual reference locked

Зафиксирован визуальный референс-набор уровня mobile premium product:

- onboarding / splash
- mobile auth
- clean mobile home
- empty states
- dark premium landing
- крупная типографика на мобильном лендинге

Фокус для переноса в Detail CRM:

- premium mobile rhythm
- дорогая тёмная палитра
- app-like navigation feel
- визуально простые, но дорогие блоки
- меньше текста, больше product presence

### Product design upgrades later

- редизайн внутренних CRM-экранов
- единая дорогая дизайн-система
- mobile-first polishing для клиентского контура

## 4. Что не делаем раньше времени

До закрытия этого gate не расползаемся в:

- React Native app
- App Store / Play Market
- billing automation глубже, чем нужно для первой платформенной панели
- большой универсальный редизайн всех ролей сразу
- сложную enterprise-аналитику

## 5. Текущий честный этап

Текущий этап проекта:

`рабочий MVP + витрина + creator surface + SaaS hardening`

Не этап:

- не финальный premium product
- не полноценный many-company SaaS
- не mobile app release

## 6. Следующий правильный порядок

1. добить live / creator / SaaS checklist
2. зафиксировать clean green checkpoint
3. собрать product screenshots
4. только потом идти в большой premium redesign

## 8. Green Checkpoint

На сейчас gate закрыт в green-состоянии:

1. walkthrough закрыт
2. русский live UI-pass закрыт
3. demo CTA и финальный сценарий закрыты
4. реальные product screenshots собраны
5. можно переходить в premium redesign без смешивания с live foundation-фиксом

Собранные скриншоты:

- `CODEX_PACKAGE/product-screenshots/director-dashboard.png`
- `CODEX_PACKAGE/product-screenshots/manager-leads.png`
- `CODEX_PACKAGE/product-screenshots/master-tasks.png`
- `CODEX_PACKAGE/product-screenshots/client-status-page.png`

## 7. Коротко для resume

Если возвращаемся к проекту позже, главное помнить:

- редизайн уже в плане
- редизайн нужен "дорого и по-американски"
- но сначала закрываем стабильность и SaaS-основание
