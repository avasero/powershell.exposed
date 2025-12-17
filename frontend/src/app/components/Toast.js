"use client";
import { useState, useEffect } from 'react';

/**
 * Toast notification component - displays messages in the bottom-right corner
 * Variants: info (blue), success (green), error (red)
 */
export default function Toast({
    message,
    variant = 'info',
    duration = 5000,
    onClose,
    show = true
}) {
    const [isVisible, setIsVisible] = useState(show);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        setIsVisible(show);
        if (show && duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsExiting(false);
            if (onClose) onClose();
        }, 300);
    };

    if (!isVisible || !message) return null;

    const variantStyles = {
        info: {
            bg: 'bg-blue-900/90',
            border: 'border-blue-500/50',
            text: 'text-blue-300',
            icon: ''
        },
        success: {
            bg: 'bg-green-900/90',
            border: 'border-green-500/50',
            text: 'text-green-300',
            icon: '✓'
        },
        error: {
            bg: 'bg-red-900/90',
            border: 'border-red-500/50',
            text: 'text-red-300',
            icon: '✕'
        }
    };

    const style = variantStyles[variant] || variantStyles.info;

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 max-w-sm transition-all duration-300 ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
                }`}
        >
            <div className={`${style.bg} ${style.border} border rounded-lg shadow-lg backdrop-blur-sm p-4 flex items-start gap-3`}>
                <span className={`${style.text} text-lg flex-shrink-0 mt-0.5`}>{style.icon}</span>
                <div className="flex-1">
                    <p className={`${style.text} font-mono text-sm`}>{message}</p>
                </div>
                <button
                    onClick={handleClose}
                    className={`${style.text} hover:opacity-80 transition-opacity flex-shrink-0 ml-2`}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
