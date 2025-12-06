import React, { useState } from 'react';
import { Search, BookOpen, Baby, Syringe, Activity, Heart, Users, AlertCircle, Brain, Apple, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clinicalGuidelines from '../data/resources/clinical_guidelines.json';

const iconMap = {
    'baby': Baby,
    'syringe': Syringe,
    'activity': Activity,
    'heart': Heart,
    'users': Users,
    'alert-circle': AlertCircle,
    'brain': Brain,
    'apple': Apple
};

const Resources = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedResource, setSelectedResource] = useState(null);

    const categories = ['All', ...new Set(clinicalGuidelines.map(r => r.category))];

    const filteredResources = clinicalGuidelines.filter(resource => {
        const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            resource.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || resource.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '2rem' }}
            >
                <h1 className="page-title">Clinical Resources</h1>
                <p className="page-subtitle">Quick reference guides for field practice</p>
            </motion.div>

            {/* Search and Filter */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                style={{ marginBottom: '2rem' }}
            >
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search guidelines..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 3rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-border)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                </div>

                {/* Category Pills */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {categories.map(category => (
                        <motion.button
                            key={category}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedCategory(category)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '999px',
                                border: 'none',
                                background: selectedCategory === category ? 'var(--color-primary)' : '#F1F5F9',
                                color: selectedCategory === category ? 'white' : 'var(--color-text-main)',
                                fontWeight: '500',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            {category}
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Resource Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {filteredResources.map((resource, index) => {
                    const Icon = iconMap[resource.icon] || BookOpen;
                    return (
                        <motion.div
                            key={resource.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -5, boxShadow: 'var(--shadow-lg)' }}
                            className="card"
                            style={{ padding: '1.5rem', cursor: 'pointer' }}
                            onClick={() => setSelectedResource(resource)}
                        >
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '12px',
                                    background: '#F0FDFA',
                                    color: '#0F766E'
                                }}>
                                    <Icon size={24} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                                        {resource.category}
                                    </div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                                        {resource.title}
                                    </h3>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontSize: '0.875rem', fontWeight: '500' }}>
                                View Guidelines <ChevronRight size={16} />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {filteredResources.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}
                >
                    <BookOpen size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p>No resources found matching your search.</p>
                </motion.div>
            )}

            {/* Resource Detail Modal */}
            <AnimatePresence>
                {selectedResource && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(4px)',
                            zIndex: 100,
                            padding: '2rem',
                            overflowY: 'auto'
                        }}
                        onClick={() => setSelectedResource(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="card"
                            style={{
                                maxWidth: '800px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                padding: '2rem'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                                        {selectedResource.category}
                                    </div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                        {selectedResource.title}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setSelectedResource(null)}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '50%',
                                        border: 'none',
                                        background: '#F1F5F9',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content Sections */}
                            <div style={{ display: 'grid', gap: '2rem' }}>
                                {selectedResource.sections.map((section, idx) => (
                                    <div key={idx}>
                                        <h3 style={{
                                            fontSize: '1.125rem',
                                            fontWeight: '600',
                                            marginBottom: '1rem',
                                            paddingBottom: '0.5rem',
                                            borderBottom: '2px solid var(--color-primary)',
                                            color: 'var(--color-primary)'
                                        }}>
                                            {section.heading}
                                        </h3>
                                        <ul style={{
                                            listStyle: 'none',
                                            padding: 0,
                                            display: 'grid',
                                            gap: '0.75rem'
                                        }}>
                                            {section.content.map((item, itemIdx) => (
                                                <li key={itemIdx} style={{
                                                    padding: '0.75rem 1rem',
                                                    background: '#F8FAFC',
                                                    borderRadius: 'var(--radius-md)',
                                                    borderLeft: '3px solid var(--color-secondary)',
                                                    fontSize: '0.95rem',
                                                    lineHeight: '1.6'
                                                }}>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div style={{
                                marginTop: '2rem',
                                paddingTop: '1.5rem',
                                borderTop: '1px solid var(--color-border)',
                                display: 'flex',
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setSelectedResource(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Resources;
