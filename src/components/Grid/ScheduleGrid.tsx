/**
 * Componente Grid del Horario Semanal
 * Visualiza los bloques horarios de Lunes a Sábado, módulos 1-8
 */

import { Fragment, useState } from 'react';
import {
    DIAS,
    MODULOS,
    NOMBRES_DIA,
    HORARIOS_MODULOS,
    ALMUERZO,
    Dia,
    Modulo,
    SeccionConMask,
    TipoActividad,
    COLORES_ACTIVIDAD,
    NOMBRES_ACTIVIDAD,
} from '../../types';
import { ConflictDetailModal } from './ConflictDetailModal';
import { SectionInfoModal } from './SectionInfoModal';


interface BloqueRenderizado {
    seccion: SeccionConMask;
    tipo: TipoActividad;
}

interface ConflictModalState {
    isOpen: boolean;
    dia: Dia;
    modulo: Modulo;
    bloques: BloqueRenderizado[];
}

interface ScheduleGridProps {
    seccionesSeleccionadas: SeccionConMask[];
    onBloqueClick?: (dia: Dia, modulo: Modulo, secciones: SeccionConMask[]) => void;
    previewSecciones?: SeccionConMask[];
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
    seccionesSeleccionadas,
    onBloqueClick,
    previewSecciones = [],
}) => {
    // Estado para el modal de conflictos
    const [conflictModal, setConflictModal] = useState<ConflictModalState>({
        isOpen: false,
        dia: 'L',
        modulo: 1,
        bloques: [],
    });

    // Estado para el modal de información de sección
    const [sectionInfoModal, setSectionInfoModal] = useState<{
        isOpen: boolean;
        seccion: SeccionConMask | null;
        tipoActividad: TipoActividad;
    }>({
        isOpen: false,
        seccion: null,
        tipoActividad: 'catedra',
    });

    const handleConflictClick = (dia: Dia, modulo: Modulo, bloques: BloqueRenderizado[]) => {
        setConflictModal({
            isOpen: true,
            dia,
            modulo,
            bloques,
        });
    };

    const closeConflictModal = () => {
        setConflictModal(prev => ({ ...prev, isOpen: false }));
    };

    // Handler para mostrar info de sección al hacer click
    const handleSectionClick = (seccion: SeccionConMask, tipo: TipoActividad) => {
        setSectionInfoModal({
            isOpen: true,
            seccion,
            tipoActividad: tipo,
        });
    };

    const closeSectionInfoModal = () => {
        setSectionInfoModal(prev => ({ ...prev, isOpen: false }));
    };
    // Combinar secciones seleccionadas con preview
    const todasLasSecciones = [...seccionesSeleccionadas, ...previewSecciones];

    // Construir mapa de bloques ocupados
    const mapaBloquesRaw: Record<string, BloqueRenderizado[]> = {};

    for (const seccion of todasLasSecciones) {
        for (const actividad of seccion.actividades) {
            for (const bloque of actividad.bloques) {
                const key = `${bloque.dia}-${bloque.modulo}`;
                if (!mapaBloquesRaw[key]) {
                    mapaBloquesRaw[key] = [];
                }
                mapaBloquesRaw[key].push({
                    seccion,
                    tipo: actividad.tipo,
                });
            }
        }
    }



    const renderBloque = (dia: Dia, modulo: Modulo) => {
        const key = `${dia}-${modulo}`;
        const bloques = mapaBloquesRaw[key] || [];
        const tieneConflicto = bloques.length > 1;

        if (bloques.length === 0) {
            return (
                <div
                    className="grid-cell bg-white/5 hover:bg-white/10 cursor-pointer"
                    onClick={() => onBloqueClick?.(dia, modulo, [])}
                />
            );
        }

        // Si hay conflicto, mostrar indicador especial con click para ver detalles
        if (tieneConflicto) {
            return (
                <div
                    className="grid-cell animate-conflict bg-red-500/20 cursor-pointer hover:bg-red-500/30 transition-colors"
                    onClick={() => handleConflictClick(dia, modulo, bloques)}
                    title="Click para ver detalles del conflicto"
                >
                    <div className="absolute inset-1 flex flex-col items-center justify-center text-center">
                        <span className="text-red-400 font-bold text-xs">⚠️ TOPE</span>
                        <span className="text-red-300 text-[10px]">
                            {bloques.length} actividades
                        </span>
                        <span className="text-red-400/60 text-[8px] mt-0.5">
                            Click para detalles
                        </span>
                    </div>
                </div>
            );
        }

        // Bloque normal (una sola sección)
        const { seccion, tipo } = bloques[0];
        const colores = COLORES_ACTIVIDAD[tipo];
        const isPreview = previewSecciones.some(s => s.id === seccion.id);

        return (
            <div
                className={`grid-cell ${isPreview ? 'opacity-60' : ''} cursor-pointer`}
                onClick={() => handleSectionClick(seccion, tipo)}
            >
                <div
                    className={`schedule-block ${colores.bg} ${colores.text} ${colores.border} border-2`}
                    title={`${seccion.ramoNombre} - Sección ${seccion.numero}\n${NOMBRES_ACTIVIDAD[tipo]}\nClick para más info`}
                >
                    <span className="font-bold truncate max-w-full px-1">{seccion.ramoSigla}</span>
                    <span className="text-[10px] opacity-80">S{seccion.numero}</span>
                    <span className="text-[9px] opacity-70">{NOMBRES_ACTIVIDAD[tipo]}</span>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="w-full overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Header con días */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {/* Esquina vacía */}
                        <div className="grid-cell-header bg-transparent" />
                        {/* Nombres de días */}
                        {DIAS.map((dia) => (
                            <div key={dia} className="grid-cell-header glass-panel">
                                <span className="text-white font-bold">{dia}</span>
                                <span className="text-white/60 text-xs block">{NOMBRES_DIA[dia]}</span>
                            </div>
                        ))}
                    </div>

                    {/* Módulos 1-4 (mañana) */}
                    {MODULOS.slice(0, 4).map((modulo) => (
                        <div key={modulo} className="grid grid-cols-7 gap-1 mb-1">
                            {/* Etiqueta del módulo */}
                            <div className="grid-cell-header glass-panel flex flex-col justify-center">
                                <span className="text-white font-bold">M{modulo}</span>
                                <span className="text-white/60 text-[10px]">
                                    {HORARIOS_MODULOS[modulo].inicio} - {HORARIOS_MODULOS[modulo].fin}
                                </span>
                            </div>
                            {/* Celdas de cada día */}
                            {DIAS.map((dia) => (
                                <Fragment key={`${dia}-${modulo}`}>
                                    {renderBloque(dia, modulo)}
                                </Fragment>
                            ))}
                        </div>
                    ))}

                    {/* Separador de almuerzo */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        <div className="col-span-7 py-2 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-sm">
                                <span>🍽️</span>
                                <span>ALMUERZO</span>
                                <span className="text-xs opacity-70">
                                    {ALMUERZO.inicio} - {ALMUERZO.fin}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Módulos 5-8 (tarde) */}
                    {MODULOS.slice(4).map((modulo) => (
                        <div key={modulo} className="grid grid-cols-7 gap-1 mb-1">
                            {/* Etiqueta del módulo */}
                            <div className="grid-cell-header glass-panel flex flex-col justify-center">
                                <span className="text-white font-bold">M{modulo}</span>
                                <span className="text-white/60 text-[10px]">
                                    {HORARIOS_MODULOS[modulo].inicio} - {HORARIOS_MODULOS[modulo].fin}
                                </span>
                            </div>
                            {/* Celdas de cada día */}
                            {DIAS.map((dia) => (
                                <Fragment key={`${dia}-${modulo}`}>
                                    {renderBloque(dia, modulo)}
                                </Fragment>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de detalles de conflicto */}
            <ConflictDetailModal
                isOpen={conflictModal.isOpen}
                onClose={closeConflictModal}
                dia={conflictModal.dia}
                modulo={conflictModal.modulo}
                bloquesEnConflicto={conflictModal.bloques}
            />

            {/* Modal de información de sección */}
            <SectionInfoModal
                isOpen={sectionInfoModal.isOpen}
                onClose={closeSectionInfoModal}
                seccion={sectionInfoModal.seccion}
                tipoActividad={sectionInfoModal.tipoActividad}
            />
        </>
    );
};

export default ScheduleGrid;
