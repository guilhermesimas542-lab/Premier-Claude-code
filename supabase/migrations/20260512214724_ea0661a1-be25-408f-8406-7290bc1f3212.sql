ALTER TABLE user_feedback
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'ia-tipster'));

ALTER TABLE user_feedback
  ADD COLUMN IF NOT EXISTS tip_cache_id UUID
    REFERENCES ai_tip_cache(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_feedback_source_status
  ON user_feedback(source, status, created_at DESC);

INSERT INTO user_feedback (
  id, user_id, email, category, message, status, created_at, source, tip_cache_id
)
SELECT
  abr.id,
  abr.user_id,
  COALESCE(NULLIF(abr.user_email, ''), 'sem-email@desconhecido') AS email,
  'bug' AS category,
  abr.message,
  CASE abr.status
    WHEN 'open' THEN 'novo'
    WHEN 'reviewed' THEN 'lido'
    WHEN 'resolved' THEN 'resolvido'
    ELSE 'novo'
  END AS status,
  abr.created_at,
  'ia-tipster' AS source,
  abr.tip_cache_id
FROM ai_bug_reports abr
WHERE NOT EXISTS (
  SELECT 1 FROM user_feedback uf WHERE uf.id = abr.id
);