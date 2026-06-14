-- Phase 4: notifications table for layered review surface (Q12–Q13)

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  ref_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_unread_idx ON notifications (user_id, read) WHERE read = false;
CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_ref_id_idx ON notifications (user_id, ref_id) WHERE ref_id IS NOT NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_own" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (auth.uid() = user_id);
