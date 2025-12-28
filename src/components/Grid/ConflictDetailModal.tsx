/**
 * Modal de Detalle de Conflictos
 * Muestra información detallada cuando hay un tope horario
 */

import { Fragment } from 'react';
import {
    SeccionConMask,
    TipoActividad,
    COLORES_ACTIVIDAD,
    NOMBRES_ACTIVIDAD,
    Dia,
    Modulo,
    NOMBRES_DIA,
    HORARIOS_MODULOS,
} from '../../types';

interface BloqueConflicto {
    seccion: SeccionConMask;
    tipo: TipoActividad;
}

interface ConflictDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    dia: Dia;
    modulo: Modulo;
    bloquesEnConflicto: BloqueConflicto[];
}

export const ConflictDetailModal: React.FC<ConflictDetailModalProps> = ({
    isOpen,
    onClose,
    dia,
    modulo,
    bloquesEnConflicto,
}) => {
    if (!isOpen || bloquesEnConflicto.length < 2) return null;

    const horario = HORARIOS_MODULOS[modulo];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative glass-panel-dark rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 bg-red-500/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl animate-pulse">⚠️</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    Tope Horario Detectado
                                </h2>
                                <p className="text-red-300 text-sm">
                                    {NOMBRES_DIA[dia]} • Módulo {modulo} ({horario.inicio} - {horario.fin})
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p className="text-white/70 mb-4 text-sm">
                        Las siguientes actividades se superponen en el mismo bloque horario:
                    </p>

                    <div className="space-y-3">
                        {bloquesEnConflicto.map((bloque, index) => {
                            const colores = COLORES_ACTIVIDAD[bloque.tipo];
                            const profesor = bloque.seccion.metadatos?.profesor;
                            const sala = bloque.seccion.metadatos?.sala;

                            return (
                                <Fragment key={`${bloque.seccion.id}-${index}`}>
                                    {index > 0 && (
                                        <div className="flex items-center justify-center py-1">
                                            <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                                                <div className="w-16 h-px bg-red-400/30" />
                                                <span>VS</span>
                                                <div className="w-16 h-px bg-red-400/30" />
                                            </div>
                                        </div>
                                    )}
                                    <div
                                        className={`rounded-xl border-2 ${colores.border} overflow-hidden transition-all hover:scale-[1.01]`}
                                    >
                                        {/* Ramo header */}
                                        <div className={`px-4 py-3 ${colores.bg}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-bold text-lg ${colores.text}`}>
                                                        {bloque.seccion.ramoSigla}
                                                    </span>
                                                    <span className={`${colores.text} text-sm opacity-80 px-2 py-0.5 rounded-full bg-black/10`}>
                                                        Sección {bloque.seccion.numero}
                                                    </span>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full ${colores.text} bg-black/10 font-medium`}>
                                                    {NOMBRES_ACTIVIDAD[bloque.tipo]}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Detalles */}
                                        <div className="px-4 py-3 bg-black/20">
                                            <p className="text-white font-medium truncate">
                                                {bloque.seccion.ramoNombre}
                                            </p>

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                                                {profesor && (
                                                    <span className="text-white/70 flex items-center gap-1">
                                                        <span className="text-white/40">👨‍🏫</span>
                                                        {profesor}
                                                    </span>
                                                )}
                                                {sala && (
                                                    <span className="text-white/70 flex items-center gap-1">
                                                        <span className="text-white/40">📍</span>
                                                        {sala}
                                                    </span>
                                                )}
                                                {!profesor && !sala && (
                                                    <span className="text-white/40 text-xs italic">
                                                        Sin metadatos adicionales
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Fragment>
                            );
                        })}
                    </div>

                    {/* Summary */}
                    <div className="mt-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                        <p className="text-red-300 text-sm text-center">
                            <strong>{bloquesEnConflicto.length} actividades</strong> compitiendo por el mismo bloque horario.
                            Debes elegir una o modificar tu selección.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn-primary px-6"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConflictDetailModal;
