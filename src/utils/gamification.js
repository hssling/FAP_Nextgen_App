import { Trophy, Star, Target, Users, Zap, Heart, Award, Crown } from 'lucide-react';

export const BADGES = {
    FIRST_STEPS: {
        id: 'first_steps',
        label: 'First Steps',
        description: 'Completed first family visit',
        icon: 'footprints',
        color: '#3B82F6', // Blue
        criteria: (stats) => stats.visits >= 1
    },
    COMMUNITY_HERO: {
        id: 'community_hero',
        label: 'Community Hero',
        description: 'Completed 50 family visits',
        icon: 'heart',
        color: '#EF4444', // Red
        criteria: (stats) => stats.visits >= 50
    },
    DEDICATED_SCHOLAR: {
        id: 'dedicated_scholar',
        label: 'Dedicated Scholar',
        description: 'Submitted 10 reflections',
        icon: 'book',
        color: '#8B5CF6', // Purple
        criteria: (stats) => stats.reflections >= 10
    },
    TOP_PERFORMER: {
        id: 'top_performer',
        label: 'Top Performer',
        description: 'Maintained Grade A average',
        icon: 'star',
        color: '#F59E0B', // Amber
        criteria: (stats) => stats.avgGrade === 'A' || stats.avgGrade === 'A+'
    },
    CONSISTENT_CARE: {
        id: 'consistent_care',
        label: 'Consistent Care',
        description: 'Visited all assigned families',
        icon: 'users',
        color: '#10B981', // Green
        criteria: (stats) => stats.familiesAssigned > 0 && stats.familiesVisited >= stats.familiesAssigned
    }
};

export const getBadgeIcon = (iconName, size = 16, color = 'currentColor') => {
    switch (iconName) {
        case 'footprints': return <Zap size={size} color={color} />;
        case 'heart': return <Heart size={size} color={color} />;
        case 'book': return <Target size={size} color={color} />;
        case 'star': return <Star size={size} color={color} />;
        case 'users': return <Users size={size} color={color} />;
        default: return <Award size={size} color={color} />;
    }
};

export const calculateBadges = (stats) => {
    const earned = [];
    Object.values(BADGES).forEach(badge => {
        if (badge.criteria(stats)) {
            earned.push(badge);
        }
    });
    return earned;
};
