
CREATE TABLE public.auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  event_type text NOT NULL CHECK (event_type IN ('login_success','login_failed','signup','signout','password_reset_requested','password_reset_completed','locked')),
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.auth_events TO authenticated;
GRANT SELECT, INSERT ON public.auth_events TO anon;
GRANT ALL ON public.auth_events TO service_role;

ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anonymous, since failed logins have no session) may insert an event.
CREATE POLICY "anyone can insert auth events"
ON public.auth_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users can read their own events; admins can read all.
CREATE POLICY "users read own auth events"
ON public.auth_events FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX auth_events_email_created_idx ON public.auth_events (email, created_at DESC);
CREATE INDEX auth_events_user_created_idx ON public.auth_events (user_id, created_at DESC);
