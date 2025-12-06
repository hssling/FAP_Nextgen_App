import React, { useState } from 'react';
import { User, Download, Trash2, Database, Save, Check } from 'lucide-react';
import { getFamilies, getAllMembers, getVillages } from '../services/db';

const Settings = () => {
    const [exporting, setExporting] = useState(false);
    const [studentName, setStudentName] = useState('Student User');
    const [college, setCollege] = useState('Govt. Medical College');
    const [batch, setBatch] = useState('2024-25');
    const [saved, setSaved] = useState(false);

    const handleSaveProfile = () => {
        // In a real app, save to localStorage or DB
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const families = await getFamilies();
            const members = await getAllMembers();
            const villages = await getVillages();

            const data = {
                metadata: {
                    exportedAt: new Date().toISOString(),
                    student: studentName,
                    college: college,
                    appVersion: '1.0.0'
                },
                families,
                members,
                villages
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fap_logbook_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export data.");
        } finally {
            setExporting(false);
        }
    };

    const handleReset = async () => {
        if (confirm("WARNING: This will delete ALL your families, members, and visit logs from this device. This action cannot be undone. Are you sure?")) {
            // Primitive way to clear IDB - deleting the database
            const DB_NAME = 'fap_nextgen_db_v2';
            try {
                // We can't easily delete the DB while connections are open in other hooks.
                // A refresh is usually needed.
                window.indexedDB.deleteDatabase(DB_NAME);
                alert("Database deleted. The page will reload to reset the application state.");
                window.location.reload();
            } catch (e) {
                alert("Error deleting database. Please try clearing browser site data manually.");
            }
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="page-title" style={{ marginBottom: '2rem' }}>Settings</h1>

            {/* Student Profile Section */}
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <User size={20} className="text-primary" /> Student Profile
                </h2>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name</label>
                        <input
                            type="text"
                            className="input"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>College / Institution</label>
                            <input
                                type="text"
                                className="input"
                                value={college}
                                onChange={(e) => setCollege(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Batch / Year</label>
                            <input
                                type="text"
                                className="input"
                                value={batch}
                                onChange={(e) => setBatch(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saved}>
                            {saved ? <><Check size={18} /> Saved</> : <><Save size={18} /> Save Settings</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Management Section */}
            <div className="card" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Database size={20} className="text-secondary" /> Data Management
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Export Logbook Data</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Download all your family records, visits, and assessments as a JSON file.</div>
                    </div>
                    <button className="btn btn-outline" onClick={handleExport} disabled={exporting}>
                        <Download size={18} /> {exporting ? 'Exporting...' : 'Export JSON'}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', marginTop: '1rem', backgroundColor: '#FEF2F2', borderRadius: 'var(--radius-md)', border: '1px solid #FECACA' }}>
                    <div>
                        <div style={{ fontWeight: '600', color: '#991B1B', marginBottom: '0.25rem' }}>Reset Application</div>
                        <div style={{ fontSize: '0.875rem', color: '#B91C1C' }}>Permanently delete all data and start over.</div>
                    </div>
                    <button className="btn" style={{ backgroundColor: '#DC2626', color: 'white', border: 'none' }} onClick={handleReset}>
                        <Trash2 size={18} /> Reset Database
                    </button>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                <p>FAP NextGen v1.0.0 • Built with ❤️ for Medical Students</p>
            </div>
        </div>
    );
};

export default Settings;
