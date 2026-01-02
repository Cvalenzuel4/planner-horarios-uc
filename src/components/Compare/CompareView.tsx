import React, { useMemo, useState } from 'react';
import { ScheduleSnapshot, getSlotLabel } from '../../domain/snapshots';
import { SeccionConMask } from '../../types';
import { prepararRamo } from '../../core/bitmask';
import { ScheduleGrid } from '../Grid';
import { SlotId } from '../../hooks/useSlots';

interface CompareViewProps {
    slots: Record<SlotId, ScheduleSnapshot | null>;
    onLoadSlot: (slotId: SlotId) => void;
    activeSlot: SlotId;
}

// Helper para reconstruir las secciones desde el snapshot
const reconstructSections = (snapshot: ScheduleSnapshot | null): SeccionConMask[] => {
    if (!snapshot) return [];

    // Set para búsqueda rápida
    const selectedIds = new Set(snapshot.seccionesSeleccionadasIds);
    const result: SeccionConMask[] = [];

    // Necesitamos procesar los ramos del snapshot para obtener sus secciones con máscara
    snapshot.ramos.forEach(ramo => {
        const seccionesPrep = prepararRamo(ramo);
        seccionesPrep.forEach(seccion => {
            if (selectedIds.has(seccion.id)) {
                result.push(seccion);
            }
        });
    });

    return result;
};

export const CompareView: React.FC<CompareViewProps> = ({ slots, onLoadSlot, activeSlot }) => {
    const slotKeys: SlotId[] = ['A', 'B', 'C'];
    const [mobileTab, setMobileTab] = useState<SlotId>(activeSlot);

    // Preparar datos para renderizar
    const columns = useMemo(() => {
        return slotKeys.map(key => {
            const snapshot = slots[key];
            const secciones = reconstructSections(snapshot);
            const isEmpty = !snapshot;

            return {
                key,
                snapshot,
                secciones,
                isEmpty,
                label: getSlotLabel(snapshot, key)
            };
        });
    }, [slots]);

    return (
        <div className="h-full flex flex-col p-4 bg-gray-50/50 dark:bg-black/20 overflow-hidden">
            <h2 className="text-xl font-bold text-[#003366] dark:text-blue-400 mb-4 flex-shrink-0">Comparar Horarios</h2>

            {/* Desktop View: Grid de 3 columnas */}
            <div className="hidden lg:grid grid-cols-3 gap-4 h-full min-h-0">
                {columns.map((col) => (
                    <div key={col.key} className={`flex flex-col h-full rounded-xl border ${col.key === activeSlot ? 'border-blue-300 ring-1 ring-blue-100 dark:border-blue-500/50 dark:ring-blue-900/30' : 'border-gray-200 dark:border-gray-800'} bg-white dark:bg-gray-900 shadow-sm overflow-hidden`}>
                        {/* Header Columna */}
                        <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                            <div>
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 ${col.isEmpty ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'}`}>
                                    {col.key}
                                </span>
                                <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm truncate max-w-[150px]" title={col.label}>
                                    {col.label}
                                </span>
                            </div>

                            {!col.isEmpty && (
                                <button
                                    onClick={() => onLoadSlot(col.key)}
                                    className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded transition-colors shadow-sm"
                                >
                                    Cargar
                                </button>
                            )}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 overflow-auto p-2 relative">
                            {col.isEmpty ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 opacity-60">
                                    <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <p className="text-sm">Vacío</p>
                                </div>
                            ) : (
                                <div className="relative min-h-[400px]">
                                    {/* Usamos ScheduleGrid en modo lectura (sin interacciones complejas) */}
                                    <div className="scale-[0.85] origin-top-left w-[117%] h-[117%] absolute inset-0">
                                        <ScheduleGrid
                                            seccionesSeleccionadas={col.secciones}
                                            previewSecciones={[]}
                                            compact={true} // Prop hipotética para hacer grid más denso si existiera, si no, usa el normal
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Resumen Footer */}
                        {!col.isEmpty && (
                            <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400">
                                <p>{col.secciones.length} secciones</p>
                                <p className="truncate">Actualizado: {new Date(col.snapshot!.timestamp).toLocaleDateString()} {new Date(col.snapshot!.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Mobile View: Tabs + Contenido único */}
            <div className="lg:hidden flex flex-col h-full">
                {/* Tabs Selector */}
                <div className="flex bg-white rounded-lg p-1 border border-gray-200 mb-4 shadow-sm">
                    {columns.map(col => (
                        <button
                            key={col.key}
                            onClick={() => setMobileTab(col.key)}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mobileTab === col.key
                                ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            {col.key} {col.isEmpty ? '' : '•'}
                        </button>
                    ))}
                </div>

                {/* Mobile Content */}
                <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    {(() => {
                        const activeCol = columns.find(c => c.key === mobileTab)!;
                        if (activeCol.isEmpty) {
                            return (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                    <p>Slot {mobileTab} vacío</p>
                                </div>
                            );
                        }
                        return (
                            <>
                                <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                                        {activeCol.label}
                                    </span>
                                    <button
                                        onClick={() => onLoadSlot(activeCol.key)}
                                        className="text-xs btn-primary px-3 py-1"
                                    >
                                        Cargar esta opción
                                    </button>
                                </div>
                                <div className="flex-1 overflow-auto p-2">
                                    <div className="min-h-[500px]">
                                        <ScheduleGrid
                                            seccionesSeleccionadas={activeCol.secciones}
                                            previewSecciones={[]}
                                        />
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};
