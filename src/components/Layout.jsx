import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, Activity, Map, GraduationCap, LogOut, BookOpen, BookmarkCheck } from 'lucide-react';
import styles from './Layout.module.css';
import ErrorBoundary from './ErrorBoundary';
import { useAuth } from '../contexts/AuthContext';

const Layout = () => {
    const { user, logout } = useAuth();

    const isTeacher = user?.role === 'teacher';

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <Activity size={32} className={styles.logoIcon} />
                    <div>
                        <h1>FAP NextGen</h1>
                        <span>{isTeacher ? 'Mentor Portal' : 'MBBS Family Adoption'}</span>
                    </div>
                </div>

                <nav className={styles.nav}>
                    {!isTeacher ? (
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
                            <NavLink to="/resources" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <BookmarkCheck size={20} />
                                Resources
                            </NavLink>
                            <NavLink to="/reports" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                                <FileText size={20} />
                                Logbook Reports
                            </NavLink>
                        </>
                    ) : (
                        // Teacher Menu
                        <NavLink to="/teacher-dashboard" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                            <Users size={20} />
                            My Mentees
                        </NavLink>
                    )}

                    <NavLink to="/settings" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                        <Settings size={20} />
                        Settings
                    </NavLink>

                    <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', paddingLeft: '1rem' }}>
                        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}>
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </nav>

                <div className={styles.userProfile}>
                    <div className={styles.avatar} style={{ backgroundColor: isTeacher ? '#FCD34D' : '#E0F2FE', color: isTeacher ? '#92400E' : '#0284C7' }}>
                        {user ? user.name.charAt(0) : 'U'}
                    </div>
                    <div className={styles.userInfo}>
                        <p className={styles.userName}>{user ? user.name : 'User'}</p>
                        <p className={styles.userRole}>{isTeacher ? 'Faculty Mentor' : '1st Year MBBS'}</p>
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
