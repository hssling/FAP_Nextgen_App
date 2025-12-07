import React from 'react';

const DebugEnv = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const mode = import.meta.env.MODE;

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
                    {url && <p style={{ fontSize: '0.8rem', color: '#666' }}>Example: {url.substring(0, 15)}...</p>}
                </div>

                <hr style={{ margin: '1rem 0' }} />

                <div>
                    <p><strong>VITE_SUPABASE_ANON_KEY:</strong></p>
                    <p style={{ color: key ? 'green' : 'red', fontWeight: 'bold' }}>
                        {key ? '✅ DETECTED' : '❌ MISSING'}
                    </p>
                    {key && <p style={{ fontSize: '0.8rem', color: '#666' }}>Length: {key.length} characters</p>}
                </div>
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#FEF3C7', borderRadius: '8px', border: '1px solid #D97706' }}>
                <h3 style={{ marginTop: 0, color: '#B45309' }}> Troubleshooting Guide</h3>
                <ul style={{ paddingLeft: '1.5rem', color: '#92400E' }}>
                    <li style={{ marginBottom: '0.5rem' }}>If status is <strong>❌ MISSING</strong>, go to Vercel Dashboard &gt; Settings &gt; Environment Variables.</li>
                    <li style={{ marginBottom: '0.5rem' }}>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.</li>
                    <li><strong>IMPORTANT:</strong> Go to Deployments &gt; Redeploy to apply changes.</li>
                </ul>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <a href="/" style={{ color: '#0F766E' }}>← Back to Home</a>
            </div>
        </div>
    );
};

export default DebugEnv;
