revoke all on function public.is_platform_admin() from public;
revoke all on function public.is_company_active(uuid) from public;
revoke all on function public.can_write_company_data(uuid) from public;
revoke all on function public.set_company_id_defaults() from public;
revoke all on function public.handle_new_user() from public;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_company_active(uuid) to authenticated;
grant execute on function public.can_write_company_data(uuid) to authenticated;
