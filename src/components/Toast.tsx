'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="toast-container">
            <div className={`toast ${type}`}>
                <div className="toast-icon">
                    {type === 'success' ? (
                        <CheckCircle2 className="w-6 h-6" />
                    ) : (
                        <AlertCircle className="w-6 h-6" />
                    )}
                </div>
                <div className="toast-message">{message}</div>
                <button onClick={onClose} className="text-text-light hover:text-text-dark transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
