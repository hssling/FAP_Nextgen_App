import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, BookOpen, CheckCircle } from 'lucide-react';

const AdminDashboard = () => {
    const { profile } = useAuth();

    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                Admin Dashboard
            </h1>
            <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
                Welcome, {profile?.full_name || 'Administrator'}!
            </p>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
            }}>
                <div className="card" style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)',
                    border: '1px solid #93C5FD'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: '#3B82F6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <GraduationCap size={24} color="white" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: '#1E40AF', marginBottom: '0.25rem' }}>
                                Total Students
                            </p>
                            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#1E3A8A' }}>
                                0
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card" style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                    border: '1px solid #FCD34D'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: '#F59E0B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <BookOpen size={24} color="white" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: '#92400E', marginBottom: '0.25rem' }}>
                                Total Teachers
                            </p>
                            <p style={{ fontSize: '2rem', fontWeight: '700', color: '#78350F' }}>
                                0
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card" style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                    border: '1px solid #6EE7B7'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: '#10B981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <CheckCircle size={24} color="white" />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: '#065F46', marginBottom: '0.25rem' }}>
                                System Status
                            </p>
                            <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#064E3B' }}>
                                Online
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Message */}
            <div className="card" style={{
                padding: '2rem',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                border: '2px solid #86EFAC'
            }}>
                <CheckCircle size={64} color="#16A34A" style={{ margin: '0 auto 1rem' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#166534', marginBottom: '0.5rem' }}>
                    🎉 Authentication System Working!
                </h2>
                <p style={{ color: '#15803D', fontSize: '1.125rem', marginBottom: '1rem' }}>
                    You have successfully logged in as an administrator.
                </p>
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    marginTop: '1.5rem'
                }}>
                    <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                        <strong>User ID:</strong> {profile?.id}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                        <strong>Username:</strong> {profile?.username}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                        <strong>Role:</strong> {profile?.role}
                    </p>
                </div>
                <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#15803D' }}>
                    The authentication system is now fully functional. You can add user management features next.
                </p>
            </div>
        </div>
    );
};

export default AdminDashboard;
