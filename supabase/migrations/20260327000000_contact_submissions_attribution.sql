ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS entry_point text,
  ADD COLUMN IF NOT EXISTS interest_type text,
  ADD COLUMN IF NOT EXISTS landing_page text,
  ADD COLUMN IF NOT EXISTS referrer_url text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS click_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_contact_submissions_entry_point
  ON public.contact_submissions(entry_point);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_interest_type
  ON public.contact_submissions(interest_type);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_utm_source
  ON public.contact_submissions(utm_source);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_utm_campaign
  ON public.contact_submissions(utm_campaign);
