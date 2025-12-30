/**
 * Componente para mostrar información de un curso y sus secciones
 */

import { CursoAPI, convertirCursoAPIaSeccion, extraerCursoInfo } from '../../services';
import { SeccionConMask } from '../../types';
import { prepararRamo } from '../../core/bitmask';

interface CourseCardProps {
    curso: CursoAPI;
    seccionesSeleccionadasIds: Set<string>;
    onToggleSeccion: (seccion: SeccionConMask) => void;
}

export function CourseCard({ curso, seccionesSeleccionadasIds, onToggleSeccion }: CourseCardProps) {
    const info = extraerCursoInfo(curso);
    const seccionId = `${curso.sigla}-${curso.seccion}`;
    const estaSeleccionada = seccionesSeleccionadasIds.has(seccionId);

    const handleToggle = () => {
        // Convertir al vuelo para agregar
        const seccion = convertirCursoAPIaSeccion(curso);
        // Necesitamos preparar el ramo completo para que la seccion tenga la mask correcta
        // Esto es un poco hacky pero funciona: creamos un ramo temporal con solo esta sección
        const ramoTemp = {
            sigla: curso.sigla,
            nombre: curso.nombre,
            secciones: [seccion]
        };
        const [seccionPreparada] = prepararRamo(ramoTemp);
        onToggleSeccion(seccionPreparada);
    };

    // Determinar color de vacantes
    const getVacantesColor = () => {
        if (info.vacantesDisponibles === 0) return 'text-red-400';
        if (info.vacantesDisponibles < 5) return 'text-amber-400';
        return 'text-emerald-400';
    };

    return (
        <div className={`glass-panel p-4 transition-all duration-200 ${estaSeleccionada ? 'border-indigo-500/50 bg-indigo-500/10' : 'hover:bg-white/5'}`}>
            <div className="flex flex-col md:flex-row gap-4 justify-between">

                {/* Info Principal */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-xl font-bold text-white">{info.sigla}-{info.seccion}</span>
                        <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-medium text-white/80">NRC: {info.nrc}</span>
                        {info.requiereLaboratorio && (
                            <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded text-xs border border-sky-500/30">
                                Requiere Lab
                            </span>
                        )}
                    </div>

                    <h3 className="text-lg font-medium text-indigo-300 truncate mb-2">{info.nombre}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-white/70">
                        <div className="flex items-center gap-2">
                            <span className="w-4 text-center">👨‍🏫</span>
                            <span className="truncate" title={info.profesor}>{info.profesor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-4 text-center">📍</span>
                            <span className="truncate">{info.campus}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-4 text-center">⭐</span>
                            <span>{info.creditos} Créditos</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-4 text-center">👥</span>
                            <span>
                                Vacantes: <span className={getVacantesColor()}>{info.vacantesDisponibles}</span> / {info.vacantesTotales}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Horarios y Botón */}
                <div className="flex flex-col gap-3 md:items-end justify-between flex-shrink-0">
                    <div className="flex flex-col gap-1 text-xs sm:text-sm">
                        {curso.horarios.map((h, i) => (
                            <div key={i} className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded">
                                <span className={`w-2 h-2 rounded-full ${h.tipo === 'CLAS' ? 'bg-catedra' :
                                    h.tipo === 'AYU' ? 'bg-ayudantia' :
                                        h.tipo === 'LAB' ? 'bg-laboratorio' :
                                            h.tipo === 'TAL' ? 'bg-taller' :
                                                h.tipo === 'TER' ? 'bg-terreno' :
                                                    h.tipo === 'PRA' ? 'bg-practica' : 'bg-otro'}`} />
                                <span className="font-medium w-8">{h.tipo}</span>
                                <span className="text-white/80 w-16">{h.dia}</span>
                                <span className="text-white font-mono">{h.modulos.join(',')}</span>
                                {h.sala && <span className="text-white/50 ml-2">({h.sala})</span>}
                            </div>
                        ))}
                        {curso.horarios.length === 0 && (
                            <div className="text-white/50 italic px-2">Sin horario asignado</div>
                        )}
                    </div>

                    <button
                        onClick={handleToggle}
                        className={`w-full md:w-auto px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${estaSeleccionada
                            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/25'
                            }`}
                    >
                        {estaSeleccionada ? (
                            <>
                                <span>🗑️</span> Quitar
                            </>
                        ) : (
                            <>
                                <span>➕</span> Agregar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
