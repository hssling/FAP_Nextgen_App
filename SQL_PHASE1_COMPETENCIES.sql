-- ============================================
-- Phase 1.3: Competency Tracking Schema
-- Mapping student activities to NMC-CBME Competencies
-- ============================================

-- 1. Create Student Competencies Track Table
CREATE TABLE IF NOT EXISTS student_competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    competency_code TEXT NOT NULL, -- e.g., 'CM 1.1', 'AETCOM 1.1'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'achieved', 'verified')),
    evidence_type TEXT, -- 'visit', 'reflection', 'assessment'
    evidence_id UUID,   -- ID from family_visits, reflections, etc.
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, competency_code)
);

-- 2. Enable RLS
ALTER TABLE student_competencies ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Students can view own competency progress" ON student_competencies
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view student competency progress" ON student_competencies
    FOR SELECT USING (
        student_id IN (
            SELECT student_id FROM teacher_student_mappings
            WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "Teachers can update (verify) student competencies" ON student_competencies
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT teacher_id FROM teacher_student_mappings
            WHERE student_id = student_competencies.student_id
        )
    );

-- 4. Initial Trigger for Automatic Updates (Optional, but good for real-time)
-- We'll handle most of this in the app layer for flexibility, 
-- but we could add a trigger here if we wanted strictly server-side mapping.

COMMENT ON TABLE student_competencies IS 'Tracks student progress against NMC CBME competencies for the FAP program';
