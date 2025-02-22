import { Space_Mono } from 'next/font/google';
import { useEffect, useState } from 'react';

const spaceMono = Space_Mono({
    weight: '400',
    subsets: ['latin'],
});

export interface LoadingState {
    dataLoading: boolean;
    graphModuleLoading: boolean;
    graphInitializing: boolean;
}

interface LoadingOverlayProps {
    loadingState: LoadingState;
}

const LoadingDots = () => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return dots;
};

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ loadingState }) => {
    const isLoading = Object.values(loadingState).some(state => state);
    
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] text-gray-200 z-50">
            <div className={`text-xl ${spaceMono.className}`}>
                Loading Graph<LoadingDots />
            </div>
        </div>
    );
}; 