update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now()))
where lower(email) = lower('owner.demo.20260616@gmail.com');
