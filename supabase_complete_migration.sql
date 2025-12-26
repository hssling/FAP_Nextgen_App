-- ============================================
-- 1. Villages (Community Profile)
-- ============================================
CREATE TABLE IF NOT EXISTS villages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES families(student_id) DEFAULT auth.uid(), -- Link to student
  village_name text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb, -- Stores full form data (population, resources, etc.)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student manages own village"
ON villages FOR ALL
USING (student_id = auth.uid());

CREATE POLICY "Teachers view student villages"
ON villages FOR SELECT
USING (
  student_id IN (
    SELECT student_id FROM teacher_student_mappings
    WHERE teacher_id = auth.uid() AND is_active = true
  )
);

-- ============================================
-- 2. Family Visits (Logbook)
-- ============================================
CREATE TABLE IF NOT EXISTS family_visits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id),
  visit_date date NOT NULL,
  notes text,
  activity_type text, -- e.g., "Routine", "Medical Camp", "Survey"
  outcome text,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE family_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student manages visits"
ON family_visits FOR ALL
USING (family_id IN (SELECT id FROM families WHERE student_id = auth.uid()));

CREATE POLICY "Teachers view visits"
ON family_visits FOR SELECT
USING (family_id IN (
  SELECT id FROM families WHERE student_id IN (
    SELECT student_id FROM teacher_student_mappings
    WHERE teacher_id = auth.uid()
  )
));

-- ============================================
-- 3. Health Measurements (For Trajectories)
-- ============================================
-- Stores specific data points like BP, Weight, etc. linked to a member and time.
CREATE TABLE IF NOT EXISTS health_measurements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id uuid REFERENCES family_members(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES family_visits(id) ON DELETE CASCADE,
  record_date date NOT NULL,
  category text, -- 'Start', 'Vitals', 'Lab', 'Follow-up'
  metric text NOT NULL, -- 'bmi', 'systolic_bp', 'diastolic_bp', 'weight', 'blood_sugar'
  value numeric NOT NULL,
  unit text,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE health_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student manages measurements"
ON health_measurements FOR ALL
USING (
  member_id IN (
      SELECT id FROM family_members WHERE family_id IN (
          SELECT id FROM families WHERE student_id = auth.uid()
      )
  )
);

CREATE POLICY "Teachers view measurements"
ON health_measurements FOR SELECT
USING (
  member_id IN (
      SELECT id FROM family_members WHERE family_id IN (
          SELECT id FROM families WHERE student_id IN (
             SELECT student_id FROM teacher_student_mappings WHERE teacher_id = auth.uid()
          )
      )
  )
);
