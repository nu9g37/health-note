CREATE TABLE public.blood_pressure_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  systolic SMALLINT NOT NULL CHECK (systolic BETWEEN 50 AND 300),
  diastolic SMALLINT NOT NULL CHECK (diastolic BETWEEN 30 AND 200),
  pulse SMALLINT CHECK (pulse BETWEEN 30 AND 250),

  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_bp_ratio CHECK (systolic > diastolic)
);

CREATE INDEX idx_bp_logs_user_measured_at
ON public.blood_pressure_logs (user_id, measured_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bp_logs_updated_at
BEFORE UPDATE ON public.blood_pressure_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.blood_pressure_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs"
ON public.blood_pressure_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
ON public.blood_pressure_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logs"
ON public.blood_pressure_logs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own logs"
ON public.blood_pressure_logs FOR DELETE
USING (auth.uid() = user_id);
