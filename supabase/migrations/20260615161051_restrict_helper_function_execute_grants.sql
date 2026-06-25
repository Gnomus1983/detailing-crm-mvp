revoke all on function public.company_role(uuid) from public;
revoke all on function public.is_company_member(uuid) from public;
revoke all on function public.current_client_company_id() from public;
revoke all on function public.current_staff_company_id() from public;
revoke all on function public.default_company_id_by_slug(text) from public;
revoke all on function public.set_company_id_defaults() from public;
revoke all on function public.is_current_user_owner() from public;

grant execute on function public.current_staff_company_id() to authenticated;
grant execute on function public.is_current_user_owner() to authenticated;;
