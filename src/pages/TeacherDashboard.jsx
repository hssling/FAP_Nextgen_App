import React, { useState } from 'react';
import { Users, BookOpen, CheckCircle, TrendingUp } from 'lucide-react';

const TeacherDashboard = () => {
    // Mock Data for Assigned Students
    const [students] = useState([
        { id: 101, name: 'Aditya Sharma', roll: '2024-001', families: 3, visits: 12, grade: 'A', pendingReview: false },
        { id: 102, name: 'Priya Patel', roll: '2024-002', families: 2, visits: 8, grade: 'B+', pendingReview: true },
        { id: 103, name: 'Rahul Singh', roll: '2024-003', families: 0, visits: 0, grade: '-', pendingReview: false },
        { id: 104, name: 'Sneha Gupta', roll: '2024-004', families: 3, visits: 15, grade: 'A+', pendingReview: true },
    ]);

    const [selectedStudent, setSelectedStudent] = useState(null);

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">Mentor Dashboard</h1>
                <p className="page-subtitle">Track progress and grade your assigned FAP students.</p>
            </header>

            {!selectedStudent ? (
                // List View
                <div style={{ display: 'grid', gap: '1.5rem' }}>

                    <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', background: '#E0F2FE', borderRadius: '50%', color: '#0284C7' }}><Users size={24} /></div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Assigned Students</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{students.length}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', background: '#FEF9C3', borderRadius: '50%', color: '#CA8A04' }}><BookOpen size={24} /></div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Pending Reviews</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>2</div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Student Name</th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Families Adopted</th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Visits Logged</th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Current Grade</th>
                                    <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: '500' }}>
                                            {s.name} <br />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.roll}</span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>{s.families}/3</td>
                                        <td style={{ padding: '1rem' }}>{s.visits}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '99px', backgroundColor: s.grade === '-' ? '#F1F5F9' : '#DCFCE7', color: s.grade === '-' ? '#64748B' : '#166534', fontSize: '0.875rem', fontWeight: '600' }}>
                                                {s.grade}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <button
                                                className="btn btn-outline"
                                                style={{ fontSize: '0.875rem' }}
                                                onClick={() => setSelectedStudent(s)}
                                            >
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                // Detailed Student Review View
                <div>
                    <button
                        onClick={() => setSelectedStudent(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', marginBottom: '1rem', fontWeight: '500' }}
                    >
                        ← Back to Student List
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Reviewing: {selectedStudent.name}</h2>
                            <p style={{ color: 'var(--color-text-muted)' }}>Roll No: {selectedStudent.roll}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary">Update Grade</button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                        {/* Simulation of student's logbook content */}
                        <div className="card" style={{ padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Recent Logbook Entries</h3>
                            <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', marginBottom: '1rem', borderLeft: '4px solid #3B82F6' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: '600' }}>Antenatal Care Assessment</span>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Yesterday</span>
                                </div>
                                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Identified high-risk anemia in Sharma family. Referred to PHC.</p>
                                <div style={{ marginTop: '0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#DBEAFE', color: '#1E40AF', borderRadius: '4px' }}>Reflective Note Added</span>
                                </div>
                            </div>

                            <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', marginBottom: '1rem', borderLeft: '4px solid #10B981' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: '600' }}>Health Education Session</span>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>2 days ago</span>
                                </div>
                                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Topic: Handwashing techniques. 5 participants.</p>
                            </div>
                        </div>

                        <div className="card" style={{ padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>Assessment & Grading</h3>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Teacher's Remarks</label>
                                <textarea rows={4} className="input" style={{ width: '100%' }} placeholder="Enter feedback for student..."></textarea>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Final Grade</label>
                                <select className="input" style={{ width: '100%' }} defaultValue={selectedStudent.grade}>
                                    <option value="A+">A+ (Outstanding)</option>
                                    <option value="A">A (Very Good)</option>
                                    <option value="B">B (Good)</option>
                                    <option value="C">C (Average)</option>
                                </select>
                            </div>

                            <button className="btn btn-primary" style={{ width: '100%' }}>Submit Evaluation</button>

                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
