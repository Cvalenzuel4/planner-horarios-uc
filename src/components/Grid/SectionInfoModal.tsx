/**
 * Modal de Información de Sección
 * Muestra información detallada de un ramo/sección al hacer clic en el horario
 */

import {
    SeccionConMask,
    TipoActividad,
    COLORES_ACTIVIDAD,
    NOMBRES_ACTIVIDAD,
    NOMBRES_DIA,
    HORARIOS_MODULOS,
} from '../../types';

interface SectionInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    seccion: SeccionConMask | null;
    tipoActividad?: TipoActividad;
}

export const SectionInfoModal: React.FC<SectionInfoModalProps> = ({
    isOpen,
    onClose,
    seccion,
    tipoActividad = 'catedra',
}) => {
    if (!isOpen || !seccion) return null;

    const colores = COLORES_ACTIVIDAD[tipoActividad];
    const profesor = seccion.metadatos?.profesor;
    const sala = seccion.metadatos?.sala;

    // Agrupar horarios por tipo de actividad
    const horariosPorTipo = new Map<TipoActividad, { dia: string; modulo: number }[]>();
    for (const actividad of seccion.actividades) {
        if (!horariosPorTipo.has(actividad.tipo)) {
            horariosPorTipo.set(actividad.tipo, []);
        }
        for (const bloque of actividad.bloques) {
            horariosPorTipo.get(actividad.tipo)!.push({
                dia: NOMBRES_DIA[bloque.dia],
                modulo: bloque.modulo,
            });
        }
    }

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
                <div className={`px-6 py-4 border-b border-gray-100 ${colores.bg} ${colores.border}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📚</span>
                            <div>
                                <h2 className={`text-xl font-bold ${colores.text}`}>
                                    {seccion.ramoSigla}
                                </h2>
                                <p className={`${colores.text} text-sm opacity-80`}>
                                    Sección {seccion.numero}
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
                    {/* Nombre del ramo */}
                    <h3 className="text-gray-800 font-medium text-lg mb-4">
                        {seccion.ramoNombre}
                    </h3>

                    {/* Información básica */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        {profesor && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <span className="text-gray-500 text-xs block mb-1">👨‍🏫 Profesor</span>
                                <span className="text-gray-800 font-medium">{profesor}</span>
                            </div>
                        )}
                        {sala && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <span className="text-gray-500 text-xs block mb-1">📍 Sala</span>
                                <span className="text-gray-800 font-medium">{sala}</span>
                            </div>
                        )}
                    </div>

                    {/* Horarios por tipo de actividad */}
                    <div className="space-y-3">
                        <h4 className="text-gray-500 text-sm font-medium">Horarios:</h4>
                        {Array.from(horariosPorTipo.entries()).map(([tipo, bloques]) => {
                            const tipoColores = COLORES_ACTIVIDAD[tipo];
                            return (
                                <div
                                    key={tipo}
                                    className={`rounded-lg border ${tipoColores.border} ${tipoColores.bg} p-3`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`${tipoColores.text} font-medium text-sm`}>
                                            {NOMBRES_ACTIVIDAD[tipo]}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {bloques.map((bloque, idx) => (
                                            <span
                                                key={idx}
                                                className={`text-xs px-2 py-1 rounded ${tipoColores.text} bg-gray-100`}
                                            >
                                                {bloque.dia} M{bloque.modulo} ({HORARIOS_MODULOS[bloque.modulo as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8].inicio})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn-primary px-6"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SectionInfoModal;
