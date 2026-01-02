/**
 * Modal de Diagnóstico: Sin Resultados
 * 
 * Displays conflict diagnostics when the schedule generator returns 0 combinations.
 * Shows the Top 3 course pairs causing the most conflicts with percentages,
 * peak slots, and example conflicts.
 * 
 * Follows the same visual pattern as ConflictDetailModal.tsx.
 */

import { useState } from 'react';
import { TopPairResult, getDayName } from '../../core/conflictStats';

interface NoResultsDiagnosticModalProps {
    isOpen: boolean;
    onClose: () => void;
    topPairs: TopPairResult[];
}

export const NoResultsDiagnosticModal: React.FC<NoResultsDiagnosticModalProps> = ({
    isOpen,
    onClose,
    topPairs,
}) => {
    // Track which pairs have their example expanded
    const [expandedExamples, setExpandedExamples] = useState<Set<string>>(new Set());

    if (!isOpen || topPairs.length === 0) return null;

    const toggleExample = (pairKey: string) => {
        setExpandedExamples(prev => {
            const next = new Set(prev);
            if (next.has(pairKey)) {
                next.delete(pairKey);
            } else {
                next.add(pairKey);
            }
            return next;
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📊</span>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                    Sin combinaciones posibles
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    Conflictos más frecuentes durante la generación
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                        Los siguientes pares de ramos generaron más descartes por topes de horario:
                    </p>

                    <div className="space-y-3">
                        {topPairs.map((pair, index) => {
                            const isExpanded = expandedExamples.has(pair.pairKey);
                            const pctDisplay = pair.pct % 1 === 0
                                ? pair.pct.toFixed(0)
                                : pair.pct.toFixed(1);

                            return (
                                <div
                                    key={pair.pairKey}
                                    className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm"
                                >
                                    {/* Pair Info */}
                                    <div className="p-3 bg-gray-50/50 dark:bg-gray-900/40">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold">
                                                    {index + 1}
                                                </span>
                                                <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                                    {pair.siglaA} <span className="text-gray-400">↔</span> {pair.siglaB}
                                                </span>
                                            </div>
                                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                                {pctDisplay}%
                                            </span>
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-8">
                                            Peak: {getDayName(pair.peakDay)} · M{pair.peakModule}
                                        </div>
                                    </div>

                                    {/* Example Toggle */}
                                    {pair.example && (
                                        <div className="border-t border-gray-100 dark:border-gray-700">
                                            <button
                                                onClick={() => toggleExample(pair.pairKey)}
                                                className="w-full px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <svg
                                                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                                {isExpanded ? 'Ocultar ejemplo' : 'Ver ejemplo'}
                                            </button>

                                            {/* Expanded Example */}
                                            {isExpanded && (
                                                <div className="px-3 pb-3 pt-1">
                                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg p-2 text-xs">
                                                        <div className="flex items-center justify-between text-amber-800 dark:text-amber-400">
                                                            <span className="font-medium">
                                                                {pair.example.sectionA} <span className="text-amber-500">vs</span> {pair.example.sectionB}
                                                            </span>
                                                        </div>
                                                        <div className="text-amber-600 dark:text-amber-500/80 mt-1">
                                                            Conflicto: {getDayName(pair.example.day)} · Módulo {pair.example.module}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Info Box */}
                    <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 text-xs">
                            <strong className="text-gray-600 dark:text-gray-300">💡 Sugerencia:</strong>{' '}
                            Considera excluir secciones específicas de los ramos conflictivos
                            o habilitar topes permitidos para actividades como ayudantías.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn-secondary px-6"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoResultsDiagnosticModal;
