import toast from 'react-hot-toast';

/**
 * Centralized toast notification system
 * Provides consistent styling and behavior across the app
 */

export const showToast = {
    success: (message, options = {}) => {
        toast.success(message, {
            duration: 3000,
            position: 'top-right',
            style: {
                background: '#10B981',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
            },
            iconTheme: {
                primary: '#fff',
                secondary: '#10B981',
            },
            ...options,
        });
    },

    error: (message, options = {}) => {
        toast.error(message, {
            duration: 4000,
            position: 'top-right',
            style: {
                background: '#EF4444',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
            },
            iconTheme: {
                primary: '#fff',
                secondary: '#EF4444',
            },
            ...options,
        });
    },

    loading: (message, options = {}) => {
        return toast.loading(message, {
            position: 'top-right',
            style: {
                background: '#3B82F6',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
            },
            ...options,
        });
    },

    promise: (promise, messages) => {
        return toast.promise(
            promise,
            {
                loading: messages.loading || 'Processing...',
                success: messages.success || 'Success!',
                error: messages.error || 'Something went wrong',
            },
            {
                position: 'top-right',
                style: {
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                },
            }
        );
    },

    info: (message, options = {}) => {
        toast(message, {
            duration: 3000,
            position: 'top-right',
            icon: 'ℹ️',
            style: {
                background: '#3B82F6',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
            },
            ...options,
        });
    },

    warning: (message, options = {}) => {
        toast(message, {
            duration: 3500,
            position: 'top-right',
            icon: '⚠️',
            style: {
                background: '#F59E0B',
                color: '#fff',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
            },
            ...options,
        });
    },

    dismiss: (toastId) => {
        if (toastId) {
            toast.dismiss(toastId);
        } else {
            toast.dismiss();
        }
    },
};

export default showToast;
