-- ============================================
-- FAP NextGen - Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. FAMILIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS families (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  head_name text NOT NULL,
  village text,
  members_count integer DEFAULT 1,
  address text,
  phone text,
  data jsonb DEFAULT '{}'::jsonb, -- Stores additional family data
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for families
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own families" ON families
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers view student families" ON families
  FOR SELECT USING (
    student_id IN (
      SELECT student_id FROM teacher_student_mappings
      WHERE teacher_id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 2. FAMILY MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  age integer,
  gender text,
  relation text,
  occupation text,
  education text,
  health_issues text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS for family_members
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage family members" ON family_members
  FOR ALL USING (
    family_id IN (SELECT id FROM families WHERE student_id = auth.uid())
  );

CREATE POLICY "Teachers view family members" ON family_members
  FOR SELECT USING (
    family_id IN (
      SELECT id FROM families WHERE student_id IN (
        SELECT student_id FROM teacher_student_mappings
        WHERE teacher_id = auth.uid()
      )
    )
  );

-- ============================================
-- 3. VILLAGES TABLE (Community Profile)
-- ============================================
CREATE TABLE IF NOT EXISTS villages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  village_name text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for villages
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student manages own village" ON villages;
CREATE POLICY "Student manages own village" ON villages
  FOR ALL USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers view student villages" ON villages;
CREATE POLICY "Teachers view student villages" ON villages
  FOR SELECT USING (
    student_id IN (
      SELECT student_id FROM teacher_student_mappings
      WHERE teacher_id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 4. FAMILY VISITS (Logbook)
-- ============================================
CREATE TABLE IF NOT EXISTS family_visits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id),
  visit_date date NOT NULL,
  notes text,
  activity_type text,
  outcome text,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS for family_visits
ALTER TABLE family_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student manages visits" ON family_visits;
CREATE POLICY "Student manages visits" ON family_visits
  FOR ALL USING (family_id IN (SELECT id FROM families WHERE student_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers view visits" ON family_visits;
CREATE POLICY "Teachers view visits" ON family_visits
  FOR SELECT USING (
    family_id IN (
      SELECT id FROM families WHERE student_id IN (
        SELECT student_id FROM teacher_student_mappings
        WHERE teacher_id = auth.uid()
      )
    )
  );

-- ============================================
-- 5. HEALTH MEASUREMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS health_measurements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES family_visits(id) ON DELETE CASCADE,
  record_date date NOT NULL,
  category text,
  metric text NOT NULL,
  value numeric NOT NULL,
  unit text,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS for health_measurements
ALTER TABLE health_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student manages measurements" ON health_measurements;
CREATE POLICY "Student manages measurements" ON health_measurements
  FOR ALL USING (
    member_id IN (
      SELECT id FROM family_members WHERE family_id IN (
        SELECT id FROM families WHERE student_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Teachers view measurements" ON health_measurements;
CREATE POLICY "Teachers view measurements" ON health_measurements
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM family_members WHERE family_id IN (
        SELECT id FROM families WHERE student_id IN (
          SELECT student_id FROM teacher_student_mappings WHERE teacher_id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- 6. REFLECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reflections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id uuid REFERENCES families(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  tags text[],
  reflection_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for reflections
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own reflections" ON reflections;
CREATE POLICY "Students manage own reflections" ON reflections
  FOR ALL USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers view student reflections" ON reflections;
CREATE POLICY "Teachers view student reflections" ON reflections
  FOR SELECT USING (
    student_id IN (
      SELECT student_id FROM teacher_student_mappings
      WHERE teacher_id = auth.uid()
    )
  );

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Database schema created successfully!';
  RAISE NOTICE 'Tables created: families, family_members, villages, family_visits, health_measurements, reflections';
END $$;
