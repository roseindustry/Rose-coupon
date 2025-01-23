// src/utils/toastUtils.js
import Toastify from 'toastify-js';

export function showToast(message, options = {}) {
    const defaultOptions = {
        text: message,
        duration: 3000,
        close: true,
        gravity: 'top',
        position: 'right',
        stopOnFocus: true,
        style: {
            background: 'linear-gradient(to right, #00b09b, #96c93d)', // Default background
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