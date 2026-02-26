import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
    readonly content: string;
    readonly children?: React.ReactNode;
    readonly position?: 'top' | 'bottom' | 'left' | 'right';
    readonly className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const tooltipId = React.useId();

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

    const show = () => setIsVisible(true);
    const hide = () => setIsVisible(false);

    return (
        <div
            className={`relative inline-flex items-center ${className}`}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
        >
            {children || (
                <button
                    type="button"
                    aria-describedby={tooltipId}
                    className="p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
                >
                    <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
                </button>
            )}

            {isVisible && (
                <div
                    id={tooltipId}
                    role="tooltip"
                    className={`absolute z-50 w-48 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded shadow-lg pointer-events-none ${positionClasses[position]}`}
                >
                    {content}
                    <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} aria-hidden="true" />
                </div>
            )}
        </div>
    );
};

export default Tooltip;
