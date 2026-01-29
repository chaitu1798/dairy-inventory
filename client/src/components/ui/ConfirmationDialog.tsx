import React from 'react';
import Modal from './Modal';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning';
    isLoading?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    isLoading = false
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="flex items-start space-x-4">
                <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                    {variant === 'danger' ? (
                        <AlertCircle className="w-6 h-6 text-red-600" />
                    ) : (
                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    )}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
                <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    {cancelText}
                </button>
                <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${variant === 'danger'
                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                        : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isLoading ? 'Processing...' : confirmText}
                </button>
            </div>
        </Modal>
    );
};

export default ConfirmationDialog;
