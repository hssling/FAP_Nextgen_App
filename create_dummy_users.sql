-- ============================================
-- DUMMY USERS FOR TESTING
-- Run this script to create 5 students and 2 teachers
-- ============================================

-- IMPORTANT: First create these users in Supabase Auth Dashboard
-- Then replace the UUIDs below with the actual User IDs

-- ============================================
-- STEP 1: CREATE USERS IN SUPABASE AUTH
-- ============================================

/*
Go to Supabase Dashboard → Authentication → Users → Add User

Create these 7 users:

STUDENTS (Password for all: Student@123):
1. student1@fap.edu
2. student2@fap.edu
3. student3@fap.edu
4. student4@fap.edu
5. student5@fap.edu

TEACHERS (Password for all: Teacher@123):
1. teacher1@fap.edu
2. teacher2@fap.edu

✅ Check "Auto Confirm User" for each
📋 Copy each User ID after creation
*/

-- ============================================
-- STEP 2: INSERT PROFILES (Replace UUIDs)
-- ============================================

-- Students
INSERT INTO profiles (id, username, full_name, role, year, registration_number, is_active)
VALUES 
  ('STUDENT1_UUID', 'student1', 'Rahul Kumar', 'student', 1, '2024MBBS001', true),
  ('STUDENT2_UUID', 'student2', 'Priya Sharma', 'student', 1, '2024MBBS002', true),
  ('STUDENT3_UUID', 'student3', 'Amit Patel', 'student', 2, '2023MBBS045', true),
  ('STUDENT4_UUID', 'student4', 'Sneha Reddy', 'student', 2, '2023MBBS046', true),
  ('STUDENT5_UUID', 'student5', 'Arjun Singh', 'student', 3, '2022MBBS089', true);

-- Teachers
INSERT INTO profiles (id, username, full_name, role, department, employee_id, is_active)
VALUES 
  ('TEACHER1_UUID', 'teacher1', 'Dr. Sharma', 'teacher', 'Community Medicine', 'EMP001', true),
  ('TEACHER2_UUID', 'teacher2', 'Dr. Verma', 'teacher', 'Community Medicine', 'EMP002', true);

-- ============================================
-- STEP 3: ASSIGN STUDENTS TO TEACHERS
-- ============================================

-- Dr. Sharma gets 3 students (Rahul, Priya, Arjun)
INSERT INTO teacher_student_mappings (teacher_id, student_id, assigned_by, is_active, notes)
VALUES 
  ('TEACHER1_UUID', 'STUDENT1_UUID', 'ADMIN_UUID', true, 'Year 1 mentorship'),
  ('TEACHER1_UUID', 'STUDENT2_UUID', 'ADMIN_UUID', true, 'Year 1 mentorship'),
  ('TEACHER1_UUID', 'STUDENT5_UUID', 'ADMIN_UUID', true, 'Year 3 mentorship');

-- Dr. Verma gets 2 students (Amit, Sneha)
INSERT INTO teacher_student_mappings (teacher_id, student_id, assigned_by, is_active, notes)
VALUES 
  ('TEACHER2_UUID', 'STUDENT3_UUID', 'ADMIN_UUID', true, 'Year 2 mentorship'),
  ('TEACHER2_UUID', 'STUDENT4_UUID', 'ADMIN_UUID', true, 'Year 2 mentorship');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all users
SELECT username, full_name, role, year, department, is_active
FROM profiles
WHERE role IN ('student', 'teacher')
ORDER BY role, username;

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

-- ============================================
-- QUICK REFERENCE - LOGIN CREDENTIALS
-- ============================================

/*
STUDENTS (All use password: Student@123):
- Username: student1 | Name: Rahul Kumar    | Year: 1 | Mentor: Dr. Sharma
- Username: student2 | Name: Priya Sharma   | Year: 1 | Mentor: Dr. Sharma
- Username: student3 | Name: Amit Patel     | Year: 2 | Mentor: Dr. Verma
- Username: student4 | Name: Sneha Reddy    | Year: 2 | Mentor: Dr. Verma
- Username: student5 | Name: Arjun Singh    | Year: 3 | Mentor: Dr. Sharma

TEACHERS (All use password: Teacher@123):
- Username: teacher1 | Name: Dr. Sharma | Students: 3 (Rahul, Priya, Arjun)
- Username: teacher2 | Name: Dr. Verma  | Students: 2 (Amit, Sneha)

ADMIN:
- Username: admin | Password: Sidda100
*/

-- ============================================
-- ALTERNATIVE: Use Self-Registration
-- ============================================

/*
Instead of manual creation, users can register themselves at:
http://localhost:5173/register

Just make sure to:
1. Disable email confirmation in Supabase
2. Disable RLS on profiles table
3. Users can register and login immediately
*/
