-- ============================================
-- Family Members Table Setup
-- ============================================

CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  age integer,
  gender text,
  relationship text,
  health_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);

-- Enable RLS
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Students can manage their own family members
CREATE POLICY "Students can manage own family members"
ON family_members FOR ALL
USING (
  family_id IN (
    SELECT id FROM families WHERE student_id = auth.uid()
  )
);

-- 2. Teachers can view family members of their assigned students
CREATE POLICY "Teachers can view assigned students family members"
ON family_members FOR SELECT
USING (
  family_id IN (
    SELECT id FROM families WHERE student_id IN (
      SELECT student_id FROM teacher_student_mappings
      WHERE teacher_id = auth.uid() AND is_active = true
    )
  )
);

-- 3. Admins can view/manage all
CREATE POLICY "Admins can manage all family members"
ON family_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
