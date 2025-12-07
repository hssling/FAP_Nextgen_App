import React, { useState } from 'react';

const DebugEnv = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const mode = import.meta.env.MODE;

    const [testResult, setTestResult] = useState(null);

    const runTest = async () => {
        setTestResult('Testing connection...');
        try {
            if (!url || !key) throw new Error('Cannot test: Missing variables');

            // Try a simple fetch to the health check endpoint or rest/v1/
            const target = `${url}/rest/v1/profiles?select=count&limit=1`;

            const response = await fetch(target, {
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${key}`
                }
            });

            if (response.ok) {
                setTestResult('✅ SUCCESS: Connection verified! Database is reachable.');
            } else {
                setTestResult(`❌ FAILED: Status ${response.status} - ${response.statusText}`);
            }
        } catch (e) {
            setTestResult('❌ ERROR: ' + e.message);
        }
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>🔍 Environment Diagnosis</h1>

            <div style={{ background: '#f5f5f5', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid #ddd' }}>
                <p><strong>Environment Mode:</strong> {mode}</p>

                <div style={{ marginTop: '1rem' }}>
                    <p><strong>VITE_SUPABASE_URL:</strong></p>
                    <p style={{ color: url ? 'green' : 'red', fontWeight: 'bold' }}>
                        {url ? '✅ DETECTED' : '❌ MISSING'}
                    </p>
                    {url && (
                        <div style={{ fontSize: '0.8rem', color: '#666', background: '#e5e7eb', padding: '0.5rem', borderRadius: '4px', wordBreak: 'break-all' }}>
                            Start: "{url.substring(0, 1)}"<br />
                            End: "{url.substring(url.length - 1)}"<br />
                            Full: {url ? url.substring(0, 15) + '...' : 'N/A'}
                        </div>
                    )}
                </div>

                <hr style={{ margin: '1rem 0' }} />

                <div>
                    <p><strong>VITE_SUPABASE_ANON_KEY:</strong></p>
                    <p style={{ color: key ? 'green' : 'red', fontWeight: 'bold' }}>
                        {key ? '✅ DETECTED' : '❌ MISSING'}
                    </p>
                    {key && <p style={{ fontSize: '0.8rem', color: '#666' }}>Length: {key.length} characters</p>}
                </div>

                <button
                    onClick={runTest}
                    style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        background: '#2563EB',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        width: '100%',
                        fontWeight: 'bold'
                    }}
                >
                    RUN LIVE CONNECTION TEST
                </button>

                {testResult && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#e0e7ff', borderRadius: '4px', border: '1px solid #c7d2fe' }}>
                        <strong>Result:</strong> {testResult}
                    </div>
                )}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#FEF3C7', borderRadius: '8px', border: '1px solid #D97706' }}>
                <h3 style={{ marginTop: 0, color: '#B45309' }}> Troubleshooting Guide</h3>
                <ul style={{ paddingLeft: '1.5rem', color: '#92400E' }}>
                    <li style={{ marginBottom: '0.5rem' }}>If status is <strong>❌ MISSING</strong>, go to Vercel Dashboard &gt; Settings &gt; Environment Variables.</li>
                    <li style={{ marginBottom: '0.5rem' }}>If Connection Fails with <strong>Failed to fetch</strong>, it is likely a CORS issue, Typo in URL, or AdBlocker.</li>
                    <li><strong>IMPORTANT:</strong> Always Redeploy after changing settings.</li>
                </ul>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <a href="/" style={{ color: '#0F766E' }}>← Back to Home</a>
            </div>
        </div>
    );
};

export default DebugEnv;
