import React from 'react';

const PlaceholderPage = ({ title }) => (
    <div>
        <header className="page-header">
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">This feature is coming soon.</p>
        </header>
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Under Development
        </div>
    </div>
);

export default PlaceholderPage;
