alter table public.company_subscription_events
  drop constraint if exists company_subscription_events_event_type_check;

alter table public.company_subscription_events
  add constraint company_subscription_events_event_type_check
  check (
    event_type in (
      'created',
      'updated',
      'status_changed',
      'billing_changed',
      'plan_changed',
      'manual_prepared',
      'invoice_sent',
      'payment_confirmed',
      'payment_paused'
    )
  );
