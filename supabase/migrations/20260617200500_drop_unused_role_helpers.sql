drop policy if exists "Staff can read profiles" on public.profiles;
drop policy if exists "Owners and managers can manage client attachment objects" on storage.objects;

create policy "Owners and managers can manage client attachment objects"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'client-lead-attachments'
  and exists (
    select 1
    from public.attachments a
    where a.storage_bucket = storage.objects.bucket_id
      and a.storage_object_path = storage.objects.name
      and public.company_role(a.company_id) in ('owner', 'manager')
  )
)
with check (
  bucket_id = 'client-lead-attachments'
  and exists (
    select 1
    from public.attachments a
    where a.storage_bucket = storage.objects.bucket_id
      and a.storage_object_path = storage.objects.name
      and public.company_role(a.company_id) in ('owner', 'manager')
  )
);

drop function if exists public.is_current_user_staff();
drop function if exists public.is_current_user_owner_or_manager();
