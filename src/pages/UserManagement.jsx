import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Search, UserCheck, UserX, Key, Shield, RefreshCw, Filter } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setMessage({ type: 'error', text: 'Failed to load users.' });
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (userId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
            setMessage({ type: 'success', text: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully.` });

            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Error updating status:', error);
            setMessage({ type: 'error', text: 'Failed to update user status.' });
        }
    };

    const handlePasswordReset = async (email) => {
        if (!email) {
            setMessage({ type: 'error', text: 'User has no email linked.' });
            return;
        }

        if (!confirm(`Send password reset email to ${email}?`)) return;

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;
            setMessage({ type: 'success', text: `Password reset email sent to ${email}.` });
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        } catch (error) {
            console.error('Reset error:', error);
            setMessage({ type: 'error', text: 'Failed to send reset email: ' + error.message });
        }
    };

    // Filtering
    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' ? user.is_active : !user.is_active);

        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Manage registered users, approvals, and access control</p>
                </div>
                <button onClick={fetchUsers} className="btn btn-outline">
                    <RefreshCw size={18} /> Refresh
                </button>
            </div>

            {/* Controls */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        <input
                            type="text"
                            placeholder="Search name, email, username..."
                            className="form-control"
                            style={{ paddingLeft: '2.5rem' }}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <select
                            className="form-control"
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                        >
                            <option value="all">All Roles</option>
                            <option value="student">Students</option>
                            <option value="teacher">Teachers</option>
                            <option value="admin">Admins</option>
                        </select>

                        <select
                            className="form-control"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive / Pending</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Feedback Message */}
            {message.text && (
                <div style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.5rem',
                    backgroundColor: message.type === 'error' ? '#FEE2E2' : '#D1FAE5',
                    color: message.type === 'error' ? '#991B1B' : '#065F46',
                    border: `1px solid ${message.type === 'error' ? '#EF4444' : '#10B981'}`
                }}>
                    {message.text}
                </div>
            )}

            {/* Users Table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border)' }}>
                            <tr>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>User Info</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>Role</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>Details</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>Status</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.875rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading users...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No users found matching your filters.</td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '600' }}>{user.full_name}</div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{user.email || 'No Email'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>@{user.username}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                textTransform: 'capitalize',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '99px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                backgroundColor: user.role === 'admin' ? '#EDE9FE' : (user.role === 'teacher' ? '#E0F2FE' : '#ECFDF5'),
                                                color: user.role === 'admin' ? '#7C3AED' : (user.role === 'teacher' ? '#0284C7' : '#059669')
                                            }}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                            {user.department && <div>Dept: {user.department}</div>}
                                            {user.year && <div>Year: {user.year}</div>}
                                            {user.registration_number && <div>Reg: {user.registration_number}</div>}
                                            {user.employee_id && <div>ID: {user.employee_id}</div>}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {user.is_active ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#059669', fontSize: '0.875rem' }}>
                                                    <UserCheck size={16} /> Active
                                                </span>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#DC2626', fontSize: '0.875rem' }}>
                                                    <UserX size={16} /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => toggleStatus(user.id, user.is_active)}
                                                    title={user.is_active ? "Deactivate User" : "Activate User"}
                                                    style={{
                                                        padding: '0.5rem',
                                                        borderRadius: '0.5rem',
                                                        border: '1px solid var(--color-border)',
                                                        cursor: 'pointer',
                                                        background: 'white',
                                                        color: user.is_active ? '#DC2626' : '#059669'
                                                    }}
                                                >
                                                    {user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                                                </button>

                                                <button
                                                    onClick={() => handlePasswordReset(user.email)}
                                                    title="Send Password Reset Email"
                                                    style={{
                                                        padding: '0.5rem',
                                                        borderRadius: '0.5rem',
                                                        border: '1px solid var(--color-border)',
                                                        cursor: 'pointer',
                                                        background: 'white',
                                                        color: '#D97706'
                                                    }}
                                                >
                                                    <Key size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
