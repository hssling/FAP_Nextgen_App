import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ variant = 'inline', size = 24, text = 'Loading...' }) => {
    // Spinner animation definition
    const spinTransition = {
        repeat: Infinity,
        ease: "linear",
        duration: 0.8
    };

    if (variant === 'full-screen') {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
            }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={spinTransition}
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
                        border: '4px solid #E5E7EB',
                        borderTopColor: '#0F766E' // Primary teal color
                    }}
                />
                {text && (
                    <p style={{
                        marginTop: '1rem',
                        color: '#374151',
                        fontWeight: 500,
                        fontSize: '1.125rem'
                    }}>
                        {text}
                    </p>
                )}
            </div>
        );
    }

    // Inline variant (default)
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={spinTransition}
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'currentColor' // Inherit color from parent
                }}
            />
        </div>
    );
};

export default LoadingSpinner;
