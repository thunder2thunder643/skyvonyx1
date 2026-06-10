ALTER TABLE public.auth_events DROP CONSTRAINT IF EXISTS auth_events_event_type_check;
ALTER TABLE public.auth_events ADD CONSTRAINT auth_events_event_type_check
  CHECK (event_type IN (
    'login_success','login_failed','signup','signout',
    'password_reset_requested','password_reset_completed','locked',
    'mfa_enrolled','mfa_unenrolled','mfa_success','mfa_failed'
  ));
