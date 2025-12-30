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
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-red-100 bg-red-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl animate-pulse">⚠️</span>
                            <div>
                                <h2 className="text-xl font-bold text-red-700">
                                    Tope Horario Detectado
                                </h2>
                                <p className="text-red-600 text-sm">
                                    {NOMBRES_DIA[dia]} • Módulo {modulo} ({horario.inicio} - {horario.fin})
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p className="text-gray-600 mb-4 text-sm">
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
                                        className={`rounded-xl border-2 ${colores.border} overflow-hidden transition-all hover:scale-[1.01] bg-white`}
                                    >
                                        {/* Ramo header */}
                                        <div className={`px-4 py-3 ${colores.bg}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-bold text-lg ${colores.text}`}>
                                                        {bloque.seccion.ramoSigla}
                                                    </span>
                                                    <span className={`${colores.text} text-sm opacity-80 px-2 py-0.5 rounded-full bg-white/50`}>
                                                        Sección {bloque.seccion.numero}
                                                    </span>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full ${colores.text} bg-white/50 font-medium`}>
                                                    {NOMBRES_ACTIVIDAD[bloque.tipo]}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Detalles */}
                                        <div className="px-4 py-3 bg-gray-50">
                                            <p className="text-gray-800 font-medium truncate">
                                                {bloque.seccion.ramoNombre}
                                            </p>

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                                                {profesor && (
                                                    <span className="text-gray-600 flex items-center gap-1">
                                                        <span className="text-gray-400">👨‍🏫</span>
                                                        {profesor}
                                                    </span>
                                                )}
                                                {sala && (
                                                    <span className="text-gray-600 flex items-center gap-1">
                                                        <span className="text-gray-400">📍</span>
                                                        {sala}
                                                    </span>
                                                )}
                                                {!profesor && !sala && (
                                                    <span className="text-gray-400 text-xs italic">
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
                    <div className="mt-5 p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-red-700 text-sm text-center">
                            <strong>{bloquesEnConflicto.length} actividades</strong> compitiendo por el mismo bloque horario.
                            Debes elegir una o modificar tu selección.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
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
