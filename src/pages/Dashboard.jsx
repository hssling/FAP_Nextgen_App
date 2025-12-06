import React, { useEffect, useState } from 'react';
import { Users, Calendar, AlertCircle, TrendingUp, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { getFamilies, getMembers } from '../services/db';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, trend, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay, duration: 0.4 }}
        className="card"
        style={{ padding: '1.5rem' }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>{title}</p>
                <h3 style={{ fontSize: '1.75rem', fontWeight: '700', marginTop: '0.25rem' }}>{value}</h3>
            </div>
            <div style={{
                backgroundColor: color + '20',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                color: color
            }}>
                <Icon size={24} />
            </div>
        </div>
        {trend && (
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#10B981' }}>
                <TrendingUp size={16} />
                <span>{trend}</span>
            </div>
        )}
    </motion.div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        families: 0,
        members: 0,
        activeProblems: 0,
        recentActivity: []
    });

    useEffect(() => {
        const loadStats = async () => {
            const families = await getFamilies();
            let allMembers = [];
            let problemCount = 0;

            for (const fam of families) {
                const members = await getMembers(fam.id);
                allMembers = [...allMembers, ...members];
                members.forEach(m => {
                    if (m.problems) problemCount += m.problems.length;
                });
            }

            setStats({
                families: families.length,
                members: allMembers.length,
                activeProblems: problemCount,
                recentActivity: families.slice(0, 3).map(f => ({
                    title: `Family Added: ${f.headName}`,
                    date: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : 'Recently'
                }))
            });
        };
        loadStats();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    };

    return (
        <div>
            <header className="page-header">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="page-title"
                >
                    Welcome back, Student
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="page-subtitle"
                >
                    Here's what's happening with your adopted families today.
                </motion.p>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2.5rem'
            }}>
                <StatCard
                    title="Adopted Families"
                    value={stats.families}
                    icon={Users}
                    color="#0F766E"
                    trend="On track (Goal: 3)"
                    delay={0.1}
                />
                <StatCard
                    title="Total Population"
                    value={stats.members}
                    icon={Activity}
                    color="#0EA5E9"
                    trend="In coverage area"
                    delay={0.2}
                />
                <StatCard
                    title="Health Issues"
                    value={stats.activeProblems}
                    icon={AlertCircle}
                    color="#F43F5E"
                    trend="Identified so far"
                    delay={0.3}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="card"
                    style={{ padding: '1.5rem' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Recent Activity</h2>
                        <Link to="/families" className="btn btn-outline" style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem', textDecoration: 'none' }}>View All</Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {stats.recentActivity.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                                <p>No activity yet. Start by adopting a family.</p>
                                <Link to="/families" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go to Families</Link>
                            </div>
                        ) : (
                            stats.recentActivity.map((act, i) => (
                                <div key={i} style={{
                                    padding: '1rem',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    gap: '1rem'
                                }}>
                                    <div style={{
                                        width: '4px',
                                        backgroundColor: 'var(--color-primary)',
                                        borderRadius: '2px'
                                    }} />
                                    <div>
                                        <h4 style={{ fontWeight: '600' }}>{act.title}</h4>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>System Log</p>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{act.date}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="card"
                    style={{ padding: '1.5rem' }}
                >
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Quick Actions</h2>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                    >
                        <Link to="/community" style={{ textDecoration: 'none' }}>
                            <motion.div
                                variants={itemVariants}
                                whileHover={{ scale: 1.02, x: 5 }}
                                style={{
                                    backgroundColor: '#F0FDFA',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    borderLeft: '4px solid var(--color-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                <h4 style={{ fontWeight: '600', color: 'var(--color-primary-dark)' }}>Update Village Profile</h4>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>Log community resources</p>
                            </motion.div>
                        </Link>
                        <Link to="/reports" style={{ textDecoration: 'none' }}>
                            <motion.div
                                variants={itemVariants}
                                whileHover={{ scale: 1.02, x: 5 }}
                                style={{
                                    backgroundColor: '#FFF7ED',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    borderLeft: '4px solid #F97316',
                                    cursor: 'pointer'
                                }}
                            >
                                <h4 style={{ fontWeight: '600', color: '#C2410C' }}>View Reports</h4>
                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>Check demographics</p>
                            </motion.div>
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
