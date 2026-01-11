import React from 'react';
import { getBadgeIcon } from '../../utils/gamification';

const BadgeDisplay = ({ badges, size = 'md' }) => {
    if (!badges || badges.length === 0) return null;

    const sizeMap = {
        sm: { icon: 14, container: '24px', fontSize: '0.7rem' },
        md: { icon: 18, container: '32px', fontSize: '0.8rem' },
        lg: { icon: 24, container: '48px', fontSize: '1rem' }
    };

    const dims = sizeMap[size] || sizeMap.md;

    return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {badges.map(badge => (
                <div
                    key={badge.id}
                    title={`${badge.label}: ${badge.description}`}
                    style={{
                        width: dims.container,
                        height: dims.container,
                        borderRadius: '50%',
                        backgroundColor: `${badge.color}20`, // 20% opacity
                        border: `1px solid ${badge.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'help'
                    }}
                >
                    {getBadgeIcon(badge.icon, dims.icon, badge.color)}
                </div>
            ))}
        </div>
    );
};

export default BadgeDisplay;
