/**
 * Modal de Información de Sección
 * Muestra información detallada de un ramo/sección al hacer clic en el horario
 */

import { useState, useEffect } from 'react';
import {
    SeccionConMask,
    TipoActividad,
    COLORES_ACTIVIDAD,
    NOMBRES_ACTIVIDAD,
    NOMBRES_DIA,
    HORARIOS_MODULOS,
} from '../../types';
import { VacanteAPI } from '../../services/api.types';
import { obtenerVacantes } from '../../services/buscacursos.service';

/** Mapeo de abreviaturas a nombres completos de campus */
const CAMPUS_FULL_NAMES: Record<string, string> = {
    'SJ': 'San Joaquín',
    'CC': 'Casa Central',
    'LC': 'Lo Contador',
    'CO': 'Oriente',
    'CV': 'Villarica',
    'CE': 'Campus Externo',
};

/** Obtiene el nombre completo del campus desde su abreviatura */
function getCampusFullName(abbreviation: string): string {
    return CAMPUS_FULL_NAMES[abbreviation] || abbreviation;
}

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
    const [vacantes, setVacantes] = useState<VacanteAPI[]>([]);
    const [loadingVacantes, setLoadingVacantes] = useState(false);

    useEffect(() => {
        if (isOpen && seccion?.nrc) {
            setLoadingVacantes(true);
            setVacantes([]);
            // Asumimos semestre actual definido en servicio
            obtenerVacantes(seccion.nrc)
                .then(result => {
                    if (result.success) {
                        setVacantes(result.vacantes);
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoadingVacantes(false));
        } else {
            setVacantes([]);
        }
    }, [isOpen, seccion]);

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
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-800 ${colores.bg} ${colores.border}`}>
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
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-2 hover:bg-white/20 rounded-lg"
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
                    <h3 className="text-gray-800 dark:text-gray-100 font-medium text-lg mb-4">
                        {seccion.ramoNombre}
                    </h3>

                    {/* Información básica */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        {profesor && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                                <span className="text-gray-500 dark:text-gray-400 text-xs block mb-1">👨‍🏫 Profesor</span>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">{profesor}</span>
                            </div>
                        )}
                        {sala && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                                <span className="text-gray-500 dark:text-gray-400 text-xs block mb-1">📍 Sala</span>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">{sala}</span>
                            </div>
                        )}
                        {seccion.metadatos?.campus && (
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                                <span className="text-gray-500 dark:text-gray-400 text-xs block mb-1">🏛️ Campus</span>
                                <span className="text-gray-800 dark:text-gray-200 font-medium">{getCampusFullName(seccion.metadatos.campus)}</span>
                            </div>
                        )}
                    </div>

                    {/* Vacantes */}
                    {(loadingVacantes || vacantes.length > 0) && (
                        <div className="mb-5">
                            <h4 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">Vacantes:</h4>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                                {loadingVacantes ? (
                                    <div className="p-4 text-center text-gray-400 text-sm">
                                        Cargando disponibilidad...
                                    </div>
                                ) : (
                                    (() => {
                                        // Check if any vacancy has periodo_admision
                                        const hasAdmision = vacantes.some(v => v.periodo_admision && v.periodo_admision.trim() !== '');
                                        return (
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium h-2">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-normal">Escuela/Reserva</th>
                                                        {hasAdmision && <th className="px-3 py-2 text-center font-normal">Admisión</th>}
                                                        <th className="px-3 py-2 text-center font-normal">Disp.</th>
                                                        <th className="px-3 py-2 text-center font-normal">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {vacantes.map((v, i) => (
                                                        <tr key={i} className="hover:bg-white/50 dark:hover:bg-white/5">
                                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                                                {v.escuela || v.programa || v.concentracion || v.categoria || 'General'}
                                                            </td>
                                                            {hasAdmision && (
                                                                <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">
                                                                    {v.periodo_admision || '—'}
                                                                </td>
                                                            )}
                                                            <td className={`px-3 py-2 text-center font-medium ${v.disponibles > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                                {v.disponibles}
                                                            </td>
                                                            <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">
                                                                {v.ofrecidas}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    )}

                    {/* Horarios por tipo de actividad */}
                    <div className="space-y-3">
                        <h4 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Horarios:</h4>
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
                                                className={`text-xs px-2 py-1 rounded ${tipoColores.text} bg-gray-100 dark:bg-black/20`}
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
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                    {/* Quick access links */}
                    <div className="flex gap-2">
                        <a
                            href={`https://catalogo.uc.cl/index.php?tmpl=component&option=com_catalogo&view=requisitos&sigla=${seccion.ramoSigla}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-colors flex items-center gap-1.5"
                        >
                            📋 Requisitos
                        </a>
                        <a
                            href={`https://catalogo.uc.cl/index.php?tmpl=component&option=com_catalogo&view=programa&sigla=${seccion.ramoSigla}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-colors flex items-center gap-1.5"
                        >
                            📄 Programa
                        </a>
                    </div>
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
