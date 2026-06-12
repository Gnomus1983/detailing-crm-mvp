# New Computer Start

## Цель

Этот файл нужен, чтобы на другом компьютере быстро запустить `detailing-crm-mvp`, передать контекст новому Codex и продолжить работу без потерь.

## Что уже хранится где

### GitHub

В GitHub уже лежат:

- весь актуальный код проекта
- `src/`
- `supabase/migrations/`
- `README.md`
- `PROJECT_HANDOFF.md`
- `NEXT_TASKS.md`
- `PROJECT_STATUS_PLAN.md`
- `CODEX_PACKAGE/CLIENT_APP_BACKEND_READY.md`
- остальная проектная документация

### Supabase

В Supabase уже живут:

- база CRM
- таблицы
- данные клиентов и заявок
- RLS policies
- auth users
- storage buckets
- edge functions
- применённые миграции

### Локально

Только локально остаются:

- `.env`
- `node_modules`
- `dist`
- временные папки
- локальные служебные файлы

## Что нужно на новом компьютере

Установить:

- `Git`
- `Node.js`

Потом:

```powershell
git clone https://github.com/Gnomus1983/detailing-crm-mvp.git
cd detailing-crm-mvp
```

## Обязательный `.env`

В корне проекта нужно создать файл `.env`.

Минимально туда должны попасть:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Если позже будут нужны дополнительные ключи для деплоя или интеграций, их тоже добавлять в `.env`.

Важно:

- `.env` не пушится в GitHub
- без `.env` новый Codex не увидит секреты и не сможет полноценно запускать проект

## Как запустить проект

```powershell
npm install
npm run dev
```

Если PowerShell блокирует `npm`, использовать:

```powershell
npm.cmd install
npm.cmd run dev
```

## Что написать новому Codex

После открытия проекта на новом компьютере написать новому Codex:

```text
Сначала прочитай:
- PROJECT_HANDOFF.md
- README.md
- NEXT_TASKS.md
- PROJECT_STATUS_PLAN.md
- CODEX_PACKAGE/CLIENT_APP_BACKEND_READY.md
- CODEX_PACKAGE/NEW_COMPUTER_START.md

Потом коротко напиши:
- что уже сделано
- на каком этапе проект
- что делать дальше по текущему плану
```

## Что новый Codex должен понять сразу

### О проекте

- это не универсальная CRM
- это MVP CRM именно для автодетейлинга
- стек: `React + Vite + Supabase`

### Что уже есть

- auth
- dashboard
- leads / clients / tasks / settings
- role-aware CRM
- public request form `/request`
- automation через Supabase Edge Functions
- demo data
- клиентский backend-слой в Supabase уже подготовлен

### Что важно не ломать

- текущую CRM-структуру
- существующие `clients / leads / lead_events / attachments`
- RLS-поведение для owner / manager / detailer

### Что сейчас по приоритету

Смотреть в `NEXT_TASKS.md`.

Главный принцип:

- сначала узкий и продаваемый CRM MVP
- потом customer-facing слой
- не раздувать проект в универсальную систему

## Что делать, если нужен деплой

Перед деплоем новый Codex должен:

1. убедиться, что проект собирается
2. убедиться, что `.env` есть
3. проверить, какая платформа деплоя используется
4. не деплоить старую или частично сломанную версию

Если нужен live deploy, новый Codex должен сначала проверить:

- актуален ли GitHub
- актуальны ли auth redirect URL
- нет ли локальных заглушек или битого текста

## Быстрый чек перед продолжением работы

- проект клонирован
- `.env` создан
- `npm install` выполнен
- `npm run dev` запускается
- Supabase подключается
- новый Codex прочитал основные документы

## Итог

Если на новом компьютере есть:

- клон GitHub-репозитория
- рабочий `.env`
- доступ к Supabase

то новый Codex увидит:

- код проекта
- документацию
- план
- текущую архитектуру
- и сможет продолжить работу почти с той же точки, где работа остановилась здесь
