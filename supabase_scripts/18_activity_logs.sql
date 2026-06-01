-- Activity log foundation for admin audit trail.
-- Do not run on production without explicit approval.

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES public.nguoidung(mand) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target ON public.activity_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity_logs'
      AND policyname = 'activity_logs_admin_select'
  ) THEN
    CREATE POLICY activity_logs_admin_select
      ON public.activity_logs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.nguoidung nd
          WHERE nd.vaitro = 'ADMIN'
            AND nd.trangthai <> 'NGHI_VIEC'
            AND (
              lower(nd.tendangnhap) = lower(coalesce(auth.jwt() ->> 'email', ''))
              OR lower(nd.tendangnhap) = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
            )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity_logs'
      AND policyname = 'activity_logs_client_insert_blocked'
  ) THEN
    CREATE POLICY activity_logs_client_insert_blocked
      ON public.activity_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity_logs'
      AND policyname = 'activity_logs_client_update_blocked'
  ) THEN
    CREATE POLICY activity_logs_client_update_blocked
      ON public.activity_logs
      FOR UPDATE
      TO authenticated
      USING (false)
      WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity_logs'
      AND policyname = 'activity_logs_client_delete_blocked'
  ) THEN
    CREATE POLICY activity_logs_client_delete_blocked
      ON public.activity_logs
      FOR DELETE
      TO authenticated
      USING (false);
  END IF;
END $$;
