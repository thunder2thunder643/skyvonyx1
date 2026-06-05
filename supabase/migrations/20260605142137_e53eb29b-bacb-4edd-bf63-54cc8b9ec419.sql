
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.has_role(uuid, public.app_role) from public, authenticated;
