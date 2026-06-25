begin;

revoke all on function public.is_current_user_staff() from anon;
revoke all on function public.is_current_user_owner_or_manager() from anon;
revoke all on function public.current_client_account_id() from anon;
revoke all on function public.current_client_id() from anon;
revoke all on function public.is_current_user_client() from anon;
revoke all on function public.can_current_client_access_lead(uuid) from anon;
revoke all on function public.can_current_client_access_attachment_object(text, text) from anon;
revoke all on function public.link_my_client_account() from anon;
revoke all on function public.get_my_leads() from anon;
revoke all on function public.get_my_active_lead() from anon;
revoke all on function public.get_my_lead_events(uuid) from anon;
revoke all on function public.get_my_lead_attachments(uuid) from anon;

revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

commit;;
