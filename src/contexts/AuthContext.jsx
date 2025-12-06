import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate checking persistent login
        const storedUser = localStorage.getItem('fap_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (role) => {
        // Mock Login
        let userData;
        if (role === 'teacher') {
            userData = { id: 't1', name: 'Dr. Professor', role: 'teacher', email: 'prof@medcollege.edu' };
        } else {
            userData = { id: 's1', name: 'Student User', role: 'student', email: 'student@medcollege.edu', batch: '2024-25' };
        }
        setUser(userData);
        localStorage.setItem('fap_user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('fap_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
