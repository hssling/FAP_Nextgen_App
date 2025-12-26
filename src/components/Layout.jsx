import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, Activity, Map, GraduationCap, LogOut, BookOpen, BookmarkCheck, Target, Calculator } from 'lucide-react';
import styles from './Layout.module.css';
import ErrorBoundary from './ErrorBoundary';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
    const { profile, signOut } = useAuth();

    const isTeacher = profile?.role === 'teacher';
    const isAdmin = profile?.role === 'admin';

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const getRoleDisplay = () => {
        if (isAdmin) return 'Administrator';
        if (isTeacher) return 'Faculty Mentor';
        return profile?.year ? `Year ${profile.year} MBBS` : 'MBBS Student';
    };

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <Activity size={32} className={styles.logoIcon} />
                    <div>
                        <h1>FAP NextGen</h1>
                        <span>{isTeacher ? 'Mentor Portal' : isAdmin ? 'Admin Portal' : 'MBBS Family Adoption'}</span>
                    </div>
                </div>

                <nav className={styles.nav}>
                    {!isTeacher && !isAdmin ? (
                        <>
                            <NavLink to="/" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <LayoutDashboard size={20} />
                                Dashboard
                            </NavLink>
                            <NavLink to="/families" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <Users size={20} />
                                My Families
                            </NavLink>
                            <NavLink to="/community" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <Map size={20} />
                                Community
                            </NavLink>
                            <NavLink to="/reflections" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <BookOpen size={20} />
                                Reflections
                            </NavLink>
                            <NavLink to="/learning-objectives" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <Target size={20} />
                                Learning Objectives
                            </NavLink>
                            <NavLink to="/tools" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <Calculator size={20} />
                                Tools & Calculators
                            </NavLink>
                            <NavLink to="/resources" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <BookmarkCheck size={20} />
                                Resources
                            </NavLink>
                            <NavLink to="/reports" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <FileText size={20} />
                                Logbook Reports
                            </NavLink>
                        </>
                    ) : isTeacher ? (
                        // Teacher Menu
                        <NavLink to="/teacher-dashboard" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                            <Users size={20} />
                            My Mentees
                        </NavLink>
                    ) : (
                        // Admin Menu
                        <>
                            <NavLink to="/admin-dashboard" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <GraduationCap size={20} />
                                Admin Dashboard
                            </NavLink>
                            <NavLink to="/admin-dashboard/assignments" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <Users size={20} />
                                Assign Students
                            </NavLink>
                        </>
                    )}

                    <NavLink
                        to={isTeacher ? '/teacher-dashboard/settings' : isAdmin ? '/admin-dashboard/settings' : '/settings'}
                        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                    >
                        <Settings size={20} />
                        Settings
                    </NavLink>

                    <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', paddingLeft: '1rem' }}>
                        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </nav>

                <div className={styles.userProfile}>
                    <div className={styles.avatar} style={{ backgroundColor: isTeacher ? '#FCD34D' : isAdmin ? '#C084FC' : '#E0F2FE', color: isTeacher ? '#92400E' : isAdmin ? '#581C87' : '#0284C7' }}>
                        {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
                    </div>
                    <div className={styles.userInfo}>
                        <p className={styles.userName}>{profile?.full_name || profile?.username || 'User'}</p>
                        <p className={styles.userRole}>{getRoleDisplay()}</p>
                    </div>
                </div>
            </aside>

            <main className={styles.main}>
                <div className={styles.contentContainer}>
                    <ErrorBoundary>
                        <Outlet />
                    </ErrorBoundary>
                </div>
            </main>
        </div>
    );
};

export default Layout;
