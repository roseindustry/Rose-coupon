// src/utils/toast.js
import Toastify from 'toastify-js';

export function showToast(message, type = 'default', options = {}) {
    // Define background colors for different types
    const backgrounds = {
        success: 'linear-gradient(to right, #00b09b, #96c93d)',
        error: 'linear-gradient(to right, #ff5f6d, #ffc371)',
        warning: 'linear-gradient(to right, #f7b733, #fc4a1a)',
        default: 'linear-gradient(to right, #00b09b, #96c93d)'
    };

    const defaultOptions = {
        text: message,
        duration: 3000,
        close: true,
        gravity: 'top',
        position: 'right',
        stopOnFocus: true,
        style: {
            background: backgrounds[type] || backgrounds.default,
            borderRadius: '4px',
            boxShadow: '0 3px 6px rgba(0,0,0,0.16)',
            fontSize: '14px',
            padding: '12px 24px'
        },
    };

    // Merge default options with user-provided options
    const finalOptions = {
        ...defaultOptions,
        ...options,
        style: {
            ...defaultOptions.style,
            ...options.style, // Allow overriding style properties
        },
    };

    Toastify(finalOptions).showToast();
}

// Helper functions for common toast types
export const toast = {
    success(message, options = {}) {
        showToast(message, 'success', options);
    },

    error(message, options = {}) {
        showToast(message, 'error', options);
    },

    warning(message, options = {}) {
        showToast(message, 'warning', options);
    },

    show(message, options = {}) {
        showToast(message, 'default', options);
    }
};