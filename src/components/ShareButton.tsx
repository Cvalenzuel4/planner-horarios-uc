import { useState } from 'react';
import { Ramo } from '../types';
import { encodeShared } from '../domain/share';

interface ShareButtonProps {
    ramos: Ramo[];
    selectedIds: Set<string>;
    semestre: string;
}

export const ShareButton = ({ ramos, selectedIds, semestre }: ShareButtonProps) => {
    const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

    const handleShare = async () => {
        try {
            setStatus('copying');

            // 1. Codificar versión minimalista (V1)
            const encoded = encodeShared(semestre, ramos, Array.from(selectedIds));

            // 2. Construir URL
            const shareUrl = `${window.location.origin}${window.location.pathname}#s=${encoded}`;

            // 3. Copiar al clipboard
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
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
            )}

            {status === 'copying' && (
                <span className="animate-spin text-lg">⌛</span>
            )}

            {status === 'copied' && (
                <div className="flex items-center gap-1">
                    <span className="font-bold text-green-600">✓</span>
                    <span className="text-green-700 font-medium hidden sm:inline">Copiado</span>
                </div>
            )}

            {status === 'error' && (
                <span className="text-lg">⚠️</span>
            )}
        </button>
    );
};
