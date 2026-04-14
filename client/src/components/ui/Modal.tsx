import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly title?: string;
    readonly children: React.ReactNode;
    readonly className?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            dialog.showModal();
        } else {
            dialog.close();
        }
    }, [isOpen]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handleCancel = (e: Event) => {
            e.preventDefault();
            onClose();
        };

        dialog.addEventListener('cancel', handleCancel);
        return () => dialog.removeEventListener('cancel', handleCancel);
    }, [onClose]);

    return (
        <dialog
            ref={dialogRef}
            className={cn("bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden backdrop:bg-black backdrop:bg-opacity-50 animate-fade-in p-0 border-none", className)}
            aria-labelledby="modal-title"
        >
            {title && (
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 id="modal-title" className="text-lg font-semibold text-gray-900">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}
            {!title && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 p-1 rounded-full hover:bg-slate-100 transition-all"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
            <div className="p-6">{children}</div>
        </dialog>
    );
};

export default Modal;
