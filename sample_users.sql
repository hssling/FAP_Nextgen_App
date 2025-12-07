-- ============================================
-- Sample Users Creation Script
-- Run this AFTER creating users in Supabase Auth
-- ============================================

-- INSTRUCTIONS:
-- 1. First, create users in Supabase Dashboard (Authentication → Users)
-- 2. Copy their User IDs
-- 3. Replace the UUIDs below with actual User IDs
-- 4. Run this script

-- ============================================
-- SAMPLE STUDENT 1
-- ============================================
-- Create in Auth first:
-- Email: student1@fap.edu
-- Password: Student@123
-- Then run:
/*
INSERT INTO profiles (id, username, full_name, role, year, registration_number, is_active)
VALUES (
  'REPLACE_WITH_STUDENT1_UUID',
  'student1',
  'Rahul Kumar',
  'student',
  1,
  '2024MBBS001',
  true
);
*/

-- ============================================
-- SAMPLE STUDENT 2
-- ============================================
-- Create in Auth first:
-- Email: student2@fap.edu
-- Password: Student@123
-- Then run:
/*
INSERT INTO profiles (id, username, full_name, role, year, registration_number, is_active)
VALUES (
  'REPLACE_WITH_STUDENT2_UUID',
  'student2',
  'Priya Sharma',
  'student',
  2,
  '2023MBBS045',
  true
);
*/

-- ============================================
-- SAMPLE STUDENT 3
-- ============================================
-- Create in Auth first:
-- Email: student3@fap.edu
-- Password: Student@123
-- Then run:
/*
INSERT INTO profiles (id, username, full_name, role, year, registration_number, is_active)
VALUES (
  'REPLACE_WITH_STUDENT3_UUID',
  'student3',
  'Amit Patel',
  'student',
  1,
  '2024MBBS002',
  true
);
*/

-- ============================================
-- SAMPLE TEACHER 1
-- ============================================
-- Create in Auth first:
-- Email: teacher1@fap.edu
-- Password: Teacher@123
-- Then run:
/*
INSERT INTO profiles (id, username, full_name, role, department, employee_id, is_active)
VALUES (
  'REPLACE_WITH_TEACHER1_UUID',
  'teacher1',
  'Dr. Sharma',
  'teacher',
  'Community Medicine',
  'EMP001',
  true
);
*/

-- ============================================
-- SAMPLE TEACHER 2
-- ============================================
-- Create in Auth first:
-- Email: teacher2@fap.edu
-- Password: Teacher@123
-- Then run:
/*
INSERT INTO profiles (id, username, full_name, role, department, employee_id, is_active)
VALUES (
  'REPLACE_WITH_TEACHER2_UUID',
  'teacher2',
  'Dr. Verma',
  'teacher',
  'Community Medicine',
  'EMP002',
  true
);
*/

-- ============================================
-- ASSIGN STUDENTS TO TEACHERS
-- ============================================
-- After creating all users above, assign students to teachers:
/*
-- Dr. Sharma mentors Rahul and Amit (both Year 1)
INSERT INTO teacher_student_mappings (teacher_id, student_id, assigned_by, is_active, notes)
VALUES 
  (
    'TEACHER1_UUID',
    'STUDENT1_UUID',
    'ADMIN_UUID',
    true,
    'Year 1 mentorship'
  ),
  (
    'TEACHER1_UUID',
    'STUDENT3_UUID',
    'ADMIN_UUID',
    true,
    'Year 1 mentorship'
  );

-- Dr. Verma mentors Priya (Year 2)
INSERT INTO teacher_student_mappings (teacher_id, student_id, assigned_by, is_active, notes)
VALUES 
  (
    'TEACHER2_UUID',
    'STUDENT2_UUID',
    'ADMIN_UUID',
    true,
    'Year 2 mentorship'
  );
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all users
SELECT 
  username,
  full_name,
  role,
  year,
  department,
  is_active
FROM profiles
ORDER BY role, year, full_name;

-- Check teacher-student mappings
SELECT 
  t.full_name as teacher,
  s.full_name as student,
  s.year,
  m.assigned_at,
  m.is_active
FROM teacher_student_mappings m
JOIN profiles t ON m.teacher_id = t.id
JOIN profiles s ON m.student_id = s.id
WHERE m.is_active = true
ORDER BY t.full_name, s.year, s.full_name;

-- Test get_teacher_students function
-- SELECT * FROM get_teacher_students('TEACHER1_UUID');

-- Test get_student_mentor function
-- SELECT * FROM get_student_mentor('STUDENT1_UUID');

-- ============================================
-- QUICK SETUP (ALL AT ONCE)
-- ============================================
-- If you want to create all sample data at once:
-- 1. Create all 5 users in Supabase Auth (admin, 3 students, 2 teachers)
-- 2. Copy all their UUIDs
-- 3. Uncomment and run the block below with actual UUIDs

/*
-- Replace these with actual UUIDs from Supabase Auth
DO $$
DECLARE
  admin_id uuid := 'YOUR_ADMIN_UUID';
  student1_id uuid := 'YOUR_STUDENT1_UUID';
  student2_id uuid := 'YOUR_STUDENT2_UUID';
  student3_id uuid := 'YOUR_STUDENT3_UUID';
  teacher1_id uuid := 'YOUR_TEACHER1_UUID';
  teacher2_id uuid := 'YOUR_TEACHER2_UUID';
BEGIN
  -- Insert students
  INSERT INTO profiles (id, username, full_name, role, year, registration_number, is_active)
  VALUES 
    (student1_id, 'student1', 'Rahul Kumar', 'student', 1, '2024MBBS001', true),
    (student2_id, 'student2', 'Priya Sharma', 'student', 2, '2023MBBS045', true),
    (student3_id, 'student3', 'Amit Patel', 'student', 1, '2024MBBS002', true);

  -- Insert teachers
  INSERT INTO profiles (id, username, full_name, role, department, employee_id, is_active)
  VALUES 
    (teacher1_id, 'teacher1', 'Dr. Sharma', 'teacher', 'Community Medicine', 'EMP001', true),
    (teacher2_id, 'teacher2', 'Dr. Verma', 'teacher', 'Community Medicine', 'EMP002', true);

  -- Assign students to teachers
  INSERT INTO teacher_student_mappings (teacher_id, student_id, assigned_by, is_active, notes)
  VALUES 
    (teacher1_id, student1_id, admin_id, true, 'Year 1 mentorship'),
    (teacher1_id, student3_id, admin_id, true, 'Year 1 mentorship'),
    (teacher2_id, student2_id, admin_id, true, 'Year 2 mentorship');

  RAISE NOTICE 'Sample users created successfully!';
END $$;
*/

-- ============================================
-- CLEANUP (if needed)
-- ============================================
-- To remove all sample data:
/*
DELETE FROM teacher_student_mappings WHERE notes LIKE '%mentorship%';
DELETE FROM profiles WHERE username IN ('student1', 'student2', 'student3', 'teacher1', 'teacher2');
*/
