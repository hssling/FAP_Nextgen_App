import React from 'react';
import { motion } from 'framer-motion';
import './LoadingSpinner.css';

/**
 * Reusable loading spinner component
 * Can be used inline or as a full-page overlay
 */
const LoadingSpinner = ({
    size = 'medium',
    overlay = false,
    message = 'Loading...',
    color = 'primary'
}) => {
    const sizes = {
        small: '20px',
        medium: '40px',
        large: '60px'
    };

    const colors = {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        white: '#fff'
    };

    const spinnerStyle = {
        width: sizes[size],
        height: sizes[size],
        border: `3px solid ${colors[color]}20`,
        borderTop: `3px solid ${colors[color]}`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
    };

    const spinner = (
        <div className="loading-spinner-container">
            <div style={spinnerStyle} className="spinner"></div>
            {message && <p className="loading-message">{message}</p>}
        </div>
    );

    if (overlay) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="loading-overlay"
            >
                {spinner}
            </motion.div>
        );
    }

    return spinner;
};

export default LoadingSpinner;
