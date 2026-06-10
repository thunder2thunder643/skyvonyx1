
DROP POLICY "anyone can insert auth events" ON public.auth_events;

CREATE POLICY "authenticated insert own auth events"
ON public.auth_events FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "anon insert failed login events only"
ON public.auth_events FOR INSERT
TO anon
WITH CHECK (user_id IS NULL AND event_type IN ('login_failed','password_reset_requested'));
