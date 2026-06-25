# PROJECT_HEALTH_REPORT

Дата проверки: 2026-06-05  
Проект: `DETAIL CRM`

Этот отчёт составлен без изменения кода. Ниже только фактическая диагностика текущего состояния проекта.

## 1. Сборка

Команда:

```bash
npm run build
```

Результат:
- Статус: успешно
- Errors: нет
- Warnings: по выводу сборки не обнаружены

Кратко:
- Vite-сборка проходит стабильно
- production assets собираются корректно
- логотип попадает в `dist/assets`

## 2. Smoke tests

Команда:

```bash
npm run test:smoke
```

Результат:
- Passed: 12
- Failed: 0
- Skipped: 0

Пройденные сценарии:
- публичная форма заявки открывается
- browser validation формы работает
- auth страница открывается
- dashboard доступен после логина тестовым аккаунтом
- карточка заявки открывается без white screen
- company login context работает
- owner settings открываются
- creator корректно уходит только в `/platform`
- owner не попадает в `/platform`
- public `/status/:token` открывается
- rate limiting на public request срабатывает с `429`

## 3. Security check

### Валидация POST/PUT/PATCH endpoints

Фактическая картина:
- `supabase/functions/public-request/index.ts`  
  Есть `zod`-валидация, используется `.strict()`
- `supabase/functions/lead-alert/index.ts`  
  Есть `zod`-валидация, используется `.strict()`
- `supabase/functions/follow-up-reminder/index.ts`  
  Отдельный payload от пользователя не принимается, тело запроса не используется
- `supabase/functions/daily-digest/index.ts`  
  Отдельный payload от пользователя не принимается, тело запроса не используется

Вывод:
- для внешних пользовательских payload-ов валидация есть
- явного невалидируемого публичного POST endpoint-а не найдено

### Rate limiting

Проверено:
- `public-request` защищён rate limiting-ом
- лимит работает live и подтверждён smoke-тестом

### Захардкоженные секреты

Проверено:
- private API keys / service role key в frontend коде не найдены
- `SUPABASE_SERVICE_ROLE_KEY` используется только в Edge Functions через env
- Telegram / internal tokens тоже берутся из env

Найденный hygiene-хвост:
- в `tests/smoke.spec.ts` есть fallback для публичных значений Supabase URL / publishable key  
  Это не приватные секреты, но это всё ещё hardcoded config, который лучше убрать

### CORS

Проверено:
- в `supabase/functions/public-request/index.ts` сейчас:

```ts
Access-Control-Allow-Origin: "*"
```

Вывод:
- CORS открыт для всех origin
- для MVP это работает, но перед первым серьёзным публичным доменом лучше сузить

### Service role key во frontend

Проверено:
- `service role` key не попадает во frontend bundle
- frontend использует только publishable key

## 4. Design tokens

Проверено:
- файл `src/styles/design-tokens.css` существует
- токены реально используются в `src/styles.css`
- шрифты `DM Sans` и `Prata` импортируются в `design-tokens.css`

### Что хорошо
- токены для цветов, шрифтов, радиусов, отступов и теней заведены
- `var(--...)` уже активно используется в стилях

### Что ещё не до конца вычищено
- в `src/styles.css` всё ещё остались хардкоднутые hex-значения

Примеры:
- `#fff`
- `#111827`
- `#1a2e2a`
- `#f3f4f6`
- и другие нейтральные оттенки

### Шрифты

Найдена несостыковка:
- `design-tokens.css` использует `DM Sans`
- `index.html` всё ещё импортирует `Manrope` и `Prata`

Вывод:
- дизайн-система уже внедрена
- но token cleanup ещё не 100%
- font setup в `index.html` нужно синхронизировать с токенами

## 5. Бренд

### Старые названия

Проверено по `App.jsx` и связанным файлам:
- `DiMASTER` в текущем UI-коде не найден
- `DETAIL CRM` уже используется

### Логотип

Проверено:
- логотип берётся из `src/assets/detail-crm-logo.jpg`
- абсолютный путь из `Downloads` больше не используется

### DETAIL CRM в ключевых местах

Проверено:
- topbar: да
- auth экран: да
- title страницы (`index.html`): нет

Текущий `<title>`:

```html
<title>Detailing CRM MVP</title>
```

Вывод:
- бренд в приложении в основном выровнен
- но `index.html` всё ещё хранит старый title

## 6. Роли и доступы

### Реально используемые роли

Проверено по коду:
- `owner`
- `manager`
- `detailer`

Роли реально проверяются в `App.jsx` через permission-модель и route/nav gating.

### Проверка экранов

Фактическая картина:
- основные экраны показываются на основе `permissions.nav.includes(...)`
- detailer видит только ограниченный набор разделов
- для заявок detailer дополнительно ограничен assigned records в UI

### Потенциально лишние маршруты

Найдено:
- `Route path="/services"` всё ещё существует
- но в текущей nav-модели он фактически не используется

Вывод:
- явного экрана, который полностью открыт любому авторизованному, не найдено
- но есть мёртвый route-хвост `/services`

### RLS

Проверено по `supabase/schema.sql`:
- RLS включён на основных таблицах
- покрыты:
  - `profiles`
  - `clients`
  - `services`
  - `leads`
  - `lead_events`
  - `attachments`
  - `automation_runs`
  - `rate_limit_events`

Вывод:
- основное RLS покрытие есть

## 7. ENV переменные

Сравнение `.env.example` и реально используемых переменных показало следующее.

### Уже есть в `.env.example`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_AUTOMATION_WEBHOOK_URL`
- legacy-комментарий про `VITE_N8N_WEBHOOK_URL`

### Используются в коде, но отсутствуют в `.env.example`

Testing:
- `VITE_TEST_EMAIL`
- `VITE_TEST_PASSWORD`

Server-side / Edge Functions:
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALERT_INTERNAL_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_MANAGER_CHAT_ID`

Scripts:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_REFRESH_TOKEN`

Вывод:
- `.env.example` сейчас неполный
- для handoff и повторного поднятия проекта это реальный хвост

## 8. Документация

Проверено наличие:

- `ARCHITECTURE.md` — есть
- `SECURITY_AUDIT.md` — есть
- `CRM_USER_GUIDE.md` — есть
- `ROLES_AND_ACCESS.md` — есть
- `DEMO_PLAYBOOK.md` — есть
- `QA_CHECKLIST.md` — есть
- `PROJECT_STATUS_PLAN.md` — есть
- `NEXT_TASKS.md` — есть

Уточнение:
- первые 6 файлов лежат в `CODEX_PACKAGE`
- `PROJECT_STATUS_PLAN.md` и `NEXT_TASKS.md` находятся в корне проекта, не внутри `CODEX_PACKAGE`

## 9. Открытые хвосты

### Найденные TODO/FIXME/HACK

Явных критичных `TODO`, `FIXME`, `HACK` в рабочих frontend/backend файлах не найдено.

### Закомментированный устаревший код

Критичного большого блока мёртвого закомментированного кода не обнаружено.

### console.log

Найдены в основном в вспомогательных скриптах:
- `scripts/public-flow-check.mjs`
- `scripts/demo-flow.mjs`

В production UI-коде лишнего `console.log`-шума не обнаружено.

### Реальные незакрытые хвосты

1. `index.html` всё ещё содержит старый title:
   - `Detailing CRM MVP`

2. `index.html` импортирует `Manrope`, хотя дизайн-система уже сидит на `DM Sans`

3. `src/styles.css` ещё не полностью очищен от hardcoded hex-цветов

4. `tests/smoke.spec.ts` содержит hardcoded fallback для публичных Supabase значений

5. `.env.example` не покрывает актуальный набор env-переменных

6. `public-request` держит `Access-Control-Allow-Origin: "*"`

7. В коде ещё есть legacy-совместимость с `VITE_N8N_WEBHOOK_URL`

8. Есть мёртвый route `/services`

## 10. Итоговая оценка

### Статус по блокам

| Блок | Статус | Комментарий |
|------|--------|-------------|
| Фундамент/Security | ⚡ | Основа сильная: build зелёный, validation и rate limiting live, RLS есть. Но CORS ещё открыт, а env hygiene не доведён до конца. |
| UX/UI | ⚡ | Редизайн и бренд уже хорошие, но `index.html` и часть hardcoded цветов ещё не вычищены. |
| Public layer | ✅ | Public intake, Edge Function gateway и anti-spam flow работают. |
| Документация | ✅ | Основные документы созданы и покрывают архитектуру, безопасность, onboarding, demo и QA. |
| QA/Testing | ✅ | Smoke suite зелёный: 5/5 passed. |
| Demo/Sales ready | ⚡ | Проект уже можно показывать, но перед первым важным demo стоит закрыть hygiene-хвосты бренда, env и CORS. |

### Топ-3 проблемы которые нужно закрыть до первого demo

1. Привести `index.html` к финальному бренду:
   - `<title>DETAIL CRM</title>`
   - убрать `Manrope`, синхронизировать шрифты с design tokens

2. Дополнить `.env.example` до реального набора переменных:
   - testing
   - Edge Functions
   - scripts

3. Добить hygiene cleanup:
   - убрать remaining hardcoded цвета в `styles.css`
   - убрать fallback public config из `tests/smoke.spec.ts`
   - сузить CORS на `public-request`, когда будет финальный домен

### Что уже можно показывать клиенту прямо сейчас

Уже можно показывать:
- вход в CRM
- dashboard
- pipeline заявок
- карточку клиента
- public request flow
- role-aware доступы
- Telegram automation как часть demo-сценария
- общий визуальный уровень и бренд `DETAIL CRM`

Итог:
- проект уже находится в demo-ready состоянии
- до первого серьёзного показа остались не логические дыры, а в основном hygiene и branding cleanup
