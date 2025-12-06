import React, { useState } from 'react';

const DynamicForm = ({ schema, onSubmit, onCancel, initialData = {} }) => {
    const [formData, setFormData] = useState(initialData);

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    if (!schema || !schema.fields) {
        return <div>Loading form...</div>;
    }

    return (
        <form onSubmit={handleSubmit}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
                {schema.title}
            </h3>

            <div style={{ display: 'grid', gap: '1.25rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '1rem' }}>
                {schema.fields.map(field => (
                    <div key={field.key}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                            {field.label} {field.required && <span style={{ color: 'red' }}>*</span>}
                        </label>

                        {field.type === 'text' && (
                            <input
                                type="text"
                                required={field.required}
                                placeholder={field.placeholder || ''}
                                value={formData[field.key] || ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            />
                        )}

                        {field.type === 'number' && (
                            <input
                                type="number"
                                required={field.required}
                                placeholder={field.placeholder || ''}
                                value={formData[field.key] || ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            />
                        )}

                        {field.type === 'textarea' && (
                            <textarea
                                required={field.required}
                                placeholder={field.placeholder || ''}
                                value={formData[field.key] || ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                rows={3}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontFamily: 'inherit' }}
                            />
                        )}

                        {field.type === 'date' && (
                            <input
                                type="date"
                                required={field.required}
                                value={formData[field.key] || ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
                            />
                        )}

                        {field.type === 'select' && (
                            <select
                                value={formData[field.key] || ''}
                                onChange={e => handleChange(field.key, e.target.value)}
                                required={field.required}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'white' }}
                            >
                                <option value="">Select...</option>
                                {field.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        )}

                        {field.type === 'checkbox' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    checked={!!formData[field.key]}
                                    onChange={e => handleChange(field.key, e.target.checked)}
                                    style={{ width: '1.25rem', height: '1.25rem' }}
                                />
                                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Yes</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
            </div>
        </form>
    );
};

export default DynamicForm;
