# Secrets Checklist

## Назначение

Этот файл нужен, чтобы при переносе проекта на другой компьютер не забыть ключи, логины и доступы.

## Минимум для запуска CRM

Нужно перенести в `.env`:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Без этого frontend не подключится к Supabase.

## Что ещё может понадобиться

В зависимости от того, что проверяем или настраиваем:

- доступ к GitHub
- доступ к Supabase
- доступ к Google Cloud
- доступ к Google OAuth настройкам
- доступ к платформе деплоя
- доступ к Telegram-боту / chat id

## GitHub

Нужно, чтобы на новом компьютере работало:

- `git clone`
- `git pull`
- `git push`

Если push не работает:

- перелогиниться в GitHub Desktop или Git Credential Manager
- либо заново авторизовать Git

## Supabase

Нужно иметь доступ к проекту:

- project ref: `knegynsaxsufwfbgqmoq`
- project name: `detailing-crm-mvp`

Новый Codex должен видеть:

- таблицы
- auth
- storage
- edge functions
- migrations

## Google OAuth

Для входа через Google может понадобиться доступ к:

- `console.cloud.google.com`
- OAuth client
- redirect URLs
- test users

Если Google login сломан, проверить:

- `Site URL` в Supabase Auth
- `Redirect URLs` в Supabase Auth
- `Authorized redirect URIs` в Google Cloud

## Telegram / automation

Если нужно проверять уведомления:

- bot token
- manager / owner chat id
- edge functions secrets в Supabase

## Деплой

Если нужен live deploy, отдельно проверить:

- где именно деплоим
- есть ли токен / credentials этой платформы
- есть ли доступ у нового компьютера к публикации

## Что не переносится в GitHub

Не пушить:

- `.env`
- личные токены
- локальные credentials
- служебные файлы публикации

## Минимальный чек перед началом работы на новом компьютере

- есть `.env`
- есть доступ к GitHub
- есть доступ к Supabase
- если нужен Google login: есть доступ к Google Cloud
- если нужен deploy: есть доступ к платформе деплоя

## Итог

Если все ключи и доступы перенесены, новый Codex сможет:

- запустить проект
- подключиться к CRM
- видеть структуру базы
- править код
- тестировать auth
- продолжать работу без потери контекста
