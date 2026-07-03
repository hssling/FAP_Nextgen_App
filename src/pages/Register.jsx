import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Activity, User, Lock, Mail, AlertCircle, Eye, EyeOff, GraduationCap, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import ConsentNoticeModal from '../components/ConsentNoticeModal';
import { CONSENT_NOTICE, recordConsentAcceptance } from '../services/consentService';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
        fullName: '',
        role: 'student',
        yearOfJoining: `${new Date().getFullYear()}`,
        registrationNumber: '',
        department: '',
        employeeId: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [consentAccepted, setConsentAccepted] = useState(false);
    const [consentModalOpen, setConsentModalOpen] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Validation
            if (formData.password !== formData.confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (formData.password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            if (!formData.username || !formData.fullName || !formData.email) {
                throw new Error('Please fill in all required fields');
            }

            if (formData.role === 'student' && !formData.registrationNumber) {
                throw new Error('Registration number is required for students');
            }

            if (formData.role === 'student') {
                const joiningYear = parseInt(formData.yearOfJoining, 10);
                const currentYear = new Date().getFullYear();
                if (Number.isNaN(joiningYear) || joiningYear < 2000 || joiningYear > currentYear + 1) {
                    throw new Error(`Year of joining must be between 2000 and ${currentYear + 1}`);
                }
            }

            if (formData.role === 'teacher' && (!formData.department || !formData.employeeId)) {
                throw new Error('Department and Employee ID are required for teachers');
            }

            if (!consentAccepted) {
                setConsentModalOpen(true);
                throw new Error('Please review and accept the FAP NextGen digital consent and privacy notice before creating an account.');
            }

            // Step 1: Create user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    emailRedirectTo: window.location.origin,
                    data: {
                        username: formData.username.toLowerCase(),
                        full_name: formData.fullName,
                        role: formData.role
                    }
                }
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error('Failed to create user account');
            }

            // Step 2: Create profile in database
            const profileData = {
                id: authData.user.id,
                username: formData.username.toLowerCase(),
                full_name: formData.fullName,
                email: formData.email, // Add email to profile
                role: formData.role,
                is_active: true
            };

            // Add role-specific fields
            if (formData.role === 'student') {
                const joiningYear = parseInt(formData.yearOfJoining, 10);
                const currentStudyYear = Math.min(3, Math.max(1, new Date().getFullYear() - joiningYear + 1));
                profileData.year_of_joining = joiningYear;
                profileData.year = currentStudyYear;
                profileData.registration_number = formData.registrationNumber;
            } else if (formData.role === 'teacher') {
                profileData.department = formData.department;
                profileData.employee_id = formData.employeeId;
            }

            const { error: profileError } = await supabase
                .from('profiles')
                // The database signup trigger creates a minimal profile first.
                // Merge the complete registration data into that row instead of
                // attempting a second insert with the same primary key.
                .upsert([profileData], { onConflict: 'id' });

            if (profileError) {
                console.error('Profile upsert error:', profileError);
                if (profileError.code === '23505') {
                    throw new Error('Username, registration number, or employee ID is already registered.');
                }
                throw new Error('Failed to create profile. Please contact administrator.');
            }

            try {
                await recordConsentAcceptance(supabase, {
                    userId: authData.user.id,
                    source: 'signup',
                    metadata: {
                        role: formData.role,
                        username: formData.username.toLowerCase(),
                        consent_title: CONSENT_NOTICE.title,
                    },
                });
            } catch (consentError) {
                console.warn('Profile created, but consent ledger write failed. Check compliance_consent_acceptance.sql migration.', consentError);
                alert('Registration succeeded, but the digital consent ledger could not be updated. Please contact the administrator to confirm the consent database patch is applied.');
            }

            // Success! Redirect to login
            alert('Registration successful! Please login with your credentials.');
            navigate('/login');

        } catch (error) {
            console.error('Registration error:', error);
            setError(error.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
            padding: '2rem'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    padding: '2.5rem',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        style={{
                            width: '80px',
                            height: '80px',
                            margin: '0 auto 1rem',
                            background: 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Activity size={40} color="white" />
                    </motion.div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1F2937' }}>
                        Create Account
                    </h1>
                    <p style={{ color: '#6B7280' }}>
                        Join FAP NextGen - MBBS Family Adoption Program
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{
                            padding: '1rem',
                            backgroundColor: '#FEE2E2',
                            border: '1px solid #EF4444',
                            borderRadius: '8px',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}
                    >
                        <AlertCircle size={20} color="#DC2626" />
                        <span style={{ color: '#DC2626', fontSize: '0.875rem' }}>{error}</span>
                    </motion.div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSubmit}>
                    {/* Role Selection */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            I am a *
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'student' })}
                                style={{
                                    padding: '1rem',
                                    border: formData.role === 'student' ? '2px solid #0F766E' : '2px solid #E5E7EB',
                                    borderRadius: '8px',
                                    backgroundColor: formData.role === 'student' ? '#F0FDFA' : 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <GraduationCap size={32} color={formData.role === 'student' ? '#0F766E' : '#6B7280'} />
                                <span style={{ fontWeight: '600', color: formData.role === 'student' ? '#0F766E' : '#6B7280' }}>
                                    Student
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'teacher' })}
                                style={{
                                    padding: '1rem',
                                    border: formData.role === 'teacher' ? '2px solid #0F766E' : '2px solid #E5E7EB',
                                    borderRadius: '8px',
                                    backgroundColor: formData.role === 'teacher' ? '#F0FDFA' : 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <BookOpen size={32} color={formData.role === 'teacher' ? '#0F766E' : '#6B7280'} />
                                <span style={{ fontWeight: '600', color: formData.role === 'teacher' ? '#0F766E' : '#6B7280' }}>
                                    Teacher
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Full Name */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Full Name *
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9CA3AF'
                            }} />
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem 0.875rem 3rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* Username */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Username *
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9CA3AF'
                            }} />
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Choose a username"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem 0.875rem 3rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                            This will be used for login
                        </p>
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Email Address *
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={20} style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9CA3AF'
                            }} />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="your.email@college.edu"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem 0.875rem 3rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* Role-specific fields */}
                    {formData.role === 'student' && (
                        <>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                    Year of Joining *
                                </label>
                                <input
                                    type="number"
                                    name="yearOfJoining"
                                    value={formData.yearOfJoining}
                                    onChange={handleChange}
                                    required
                                    min="2000"
                                    max={new Date().getFullYear() + 1}
                                    placeholder="e.g., 2025"
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                    Registration Number *
                                </label>
                                <input
                                    type="text"
                                    name="registrationNumber"
                                    value={formData.registrationNumber}
                                    onChange={handleChange}
                                    placeholder="e.g., 2024MBBS001"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {formData.role === 'teacher' && (
                        <>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                    Department *
                                </label>
                                <input
                                    type="text"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    placeholder="e.g., Community Medicine"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                    Employee ID *
                                </label>
                                <input
                                    type="text"
                                    name="employeeId"
                                    value={formData.employeeId}
                                    onChange={handleChange}
                                    placeholder="e.g., EMP001"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        border: '1px solid #D1D5DB',
                                        borderRadius: '8px',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {/* Password */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Password *
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9CA3AF'
                            }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Create a password"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 3rem 0.875rem 3rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '1rem'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            >
                                {showPassword ? <EyeOff size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                            At least 6 characters
                        </p>
                    </div>

                    {/* Confirm Password */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Confirm Password *
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{
                                position: 'absolute',
                                left: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#9CA3AF'
                            }} />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm your password"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 3rem 0.875rem 3rem',
                                    border: '1px solid #D1D5DB',
                                    borderRadius: '8px',
                                    fontSize: '1rem'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            >
                                {showConfirmPassword ? <EyeOff size={20} color="#9CA3AF" /> : <Eye size={20} color="#9CA3AF" />}
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            border: consentAccepted ? '1px solid #99F6E4' : '1px solid #FCD34D',
                            borderRadius: '10px',
                            background: consentAccepted ? '#F0FDFA' : '#FFFBEB'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#111827' }}>
                                    Digital consent, privacy and responsible use
                                </h3>
                                <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.45 }}>
                                    Required before account creation for DPDP-aligned data processing, health-data confidentiality and AI-support disclosure.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setConsentModalOpen(true)}
                                style={{ color: '#0F766E', borderColor: '#99F6E4' }}
                            >
                                {consentAccepted ? 'Review accepted notice' : 'Review and accept'}
                            </button>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginTop: '0.9rem', fontSize: '0.86rem', color: '#374151' }}>
                            <input
                                type="checkbox"
                                checked={consentAccepted}
                                onChange={(e) => {
                                    if (e.target.checked) setConsentModalOpen(true);
                                    else setConsentAccepted(false);
                                }}
                                style={{ marginTop: '0.2rem' }}
                            />
                            <span>
                                {consentAccepted
                                    ? `Accepted for version ${CONSENT_NOTICE.version}.`
                                    : 'I will review the notice and accept before creating my account.'}
                            </span>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #0F766E 0%, #0EA5E9 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginBottom: '1rem'
                        }}
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    {/* Login Link */}
                    <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.875rem' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#0F766E', fontWeight: '600', textDecoration: 'none' }}>
                            Sign In
                        </Link>
                    </p>
                </form>
            </motion.div>
            <ConsentNoticeModal
                open={consentModalOpen}
                onClose={() => setConsentModalOpen(false)}
                onAccept={() => {
                    setConsentAccepted(true);
                    setConsentModalOpen(false);
                    setError('');
                }}
            />
        </div>
    );
};

export default Register;
