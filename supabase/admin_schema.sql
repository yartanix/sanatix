-- ============================================================
-- SANATIX — Admin Schema v1.0
-- Run this after the base schema.sql
-- ============================================================

-- ─── Admin Roles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'moderator', 'analyst')),
  permissions JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- ─── Activity Logs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES profiles(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID,
  changes     JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Platform Settings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES profiles(id),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Content Reports ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_reports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id          UUID NOT NULL REFERENCES profiles(id),
  reported_entity_type VARCHAR(50) NOT NULL,
  reported_entity_id   UUID NOT NULL,
  reason               VARCHAR(255) NOT NULL,
  description          TEXT,
  status               VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  resolved_by          UUID REFERENCES profiles(id),
  resolution_notes     TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  resolved_at          TIMESTAMPTZ
);

-- ─── Vendor Admin Columns ────────────────────────────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS admin_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verified_by    UUID REFERENCES profiles(id);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verified_at    TIMESTAMPTZ;

-- ─── Event Admin Columns ─────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_status     VARCHAR(50) DEFAULT 'pending'
  CHECK (event_status IN ('pending', 'approved', 'rejected', 'suspended'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reviewed_by      UUID REFERENCES profiles(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS reviewed_at      TIMESTAMPTZ;

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_roles_user       ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_admin    ON activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created  ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_events_event_status    ON events(event_status);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE admin_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports   ENABLE ROW LEVEL SECURITY;

-- Only admins can read admin_roles
CREATE POLICY "admin_roles_admin_only" ON admin_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can read activity_logs
CREATE POLICY "activity_logs_admin_only" ON activity_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can read/write platform_settings
CREATE POLICY "platform_settings_admin_only" ON platform_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create reports; admins can read/update all
CREATE POLICY "content_reports_insert" ON content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "content_reports_admin_read" ON content_reports
  FOR SELECT USING (
    auth.uid() = reporter_id OR
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "content_reports_admin_update" ON content_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── Default Platform Settings ───────────────────────────────
INSERT INTO platform_settings (key, value, description) VALUES
  ('commission_rate',        '{"percentage": 5}',                          'Platform commission percentage on bookings'),
  ('featured_event_price',   '{"amount": 500, "currency": "SAR"}',         'Cost to feature an event'),
  ('max_tickets_per_booking','{"count": 10}',                              'Maximum tickets per single booking'),
  ('maintenance_mode',       '{"enabled": false}',                         'Put platform in maintenance mode'),
  ('new_registrations',      '{"enabled": true}',                          'Allow new user registrations'),
  ('vendor_auto_approve',    '{"enabled": false}',                         'Auto-approve new vendor registrations'),
  ('event_auto_approve',     '{"enabled": false}',                         'Auto-approve new event submissions'),
  ('support_email',          '{"email": "support@sanatix.net"}',           'Platform support email address'),
  ('supported_currencies',   '{"currencies": ["SAR","AED","KWD","QAR"]}',  'Supported payment currencies')
ON CONFLICT (key) DO NOTHING;
