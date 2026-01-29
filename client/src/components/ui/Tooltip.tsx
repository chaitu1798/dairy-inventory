import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
    content: string;
    children?: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent'
    };

    return (
        <div
            className={`relative inline-flex items-center ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children || <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />}

            {isVisible && (
                <div className={`absolute z-50 w-48 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded shadow-lg pointer-events-none ${positionClasses[position]}`}>
                    {content}
                    <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
                </div>
            )}
        </div>
    );
};

export default Tooltip;
