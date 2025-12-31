import { useState } from 'react';
import { Ramo } from '../types';
import { createSnapshotFromState, encodeSharedSnapshot } from '../domain/share';

interface ShareButtonProps {
    ramos: Ramo[];
    selectedIds: Set<string>;
}

export const ShareButton = ({ ramos, selectedIds }: ShareButtonProps) => {
    const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

    const handleShare = async () => {
        if (selectedIds.size === 0) {
            // Feedback opcional si no hay nada que compartir
        }

        try {
            setStatus('copying');

            // 1. Crear snapshot optimizado
            const snapshot = createSnapshotFromState(ramos, Array.from(selectedIds));

            // 2. Codificar
            const encoded = encodeSharedSnapshot(snapshot);

            // 3. Construir URL
            const shareUrl = `${window.location.origin}${window.location.pathname}#s=${encoded}`;

            // 4. Copiar al clipboard
            await navigator.clipboard.writeText(shareUrl);

            setStatus('copied');

            // Reset status después de 2s
            setTimeout(() => setStatus('idle'), 2000);
        } catch (err) {
            console.error('Error al compartir:', err);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <button
            onClick={handleShare}
            disabled={status === 'copying'}
            className={`
                btn-secondary text-xs md:text-sm px-2 md:px-3 flex items-center justify-center transition-all bg-white
                ${status === 'copied' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : ''}
                ${status === 'error' ? 'bg-red-50 text-red-700 border-red-200' : ''}
            `}
            title="Copiar link para compartir este horario"
            aria-label="Compartir horario"
        >
            {status === 'idle' && (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-600"
                >
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
            )}

            {status === 'copying' && (
                <span className="animate-spin text-lg">⌛</span>
            )}

            {status === 'copied' && (
                <span className="font-bold text-green-600 text-lg">✓</span>
            )}

            {status === 'error' && (
                <span className="text-lg">⚠️</span>
            )}
        </button>
    );
};
