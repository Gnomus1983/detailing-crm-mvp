revoke execute on function public.company_role(uuid) from anon, authenticated;
revoke execute on function public.is_company_member(uuid) from anon, authenticated;
revoke execute on function public.current_client_company_id() from anon, authenticated;
revoke execute on function public.current_staff_company_id() from anon, authenticated;
revoke execute on function public.default_company_id_by_slug(text) from anon, authenticated;
revoke execute on function public.set_company_id_defaults() from anon, authenticated;
revoke execute on function public.is_current_user_owner() from anon, authenticated;;
