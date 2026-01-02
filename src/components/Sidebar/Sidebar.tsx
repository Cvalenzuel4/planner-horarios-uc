/**
 * Sidebar - Panel de control con lista de ramos y secciones
 */

import { useState } from 'react';
import { Ramo, SeccionConMask, COLORES_ACTIVIDAD } from '../../types';
import { prepararRamo, hasConflict, combinarMasks } from '../../core/bitmask';

interface SidebarProps {
    ramos: Ramo[];
    seccionesSeleccionadas: SeccionConMask[];
    onToggleSeccion: (seccion: SeccionConMask) => void;
    onAgregarRamo: () => void;
    onEditarRamo: (ramo: Ramo) => void;
    onEliminarRamo: (sigla: string) => void;
    onAgregarSeccion: (sigla: string) => void;
    onEditarSeccion: (sigla: string, seccionId: string) => void;
    onEliminarSeccion: (sigla: string, seccionId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    ramos,
    seccionesSeleccionadas,
    onToggleSeccion,
    onAgregarRamo,
    onEditarRamo,
    onEliminarRamo,
    onAgregarSeccion,
    onEditarSeccion,
    onEliminarSeccion,
}) => {
    const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
    const [busqueda, setBusqueda] = useState('');

    // Filtrar ramos según la búsqueda por sigla
    const ramosFiltrados = ramos.filter(ramo =>
        ramo.sigla.toLowerCase().includes(busqueda.toLowerCase())
    );

    const toggleExpandido = (sigla: string) => {
        const nuevos = new Set(expandidos);
        if (nuevos.has(sigla)) {
            nuevos.delete(sigla);
        } else {
            nuevos.add(sigla);
        }
        setExpandidos(nuevos);
    };



    // Verificar si una sección tiene conflicto con las seleccionadas
    const tieneConflicto = (seccion: SeccionConMask): boolean => {
        // No contar conflicto consigo misma
        const otrasMasks = seccionesSeleccionadas
            .filter(s => s.id !== seccion.id)
            .map(s => s.mask);
        const maskOtras = combinarMasks(otrasMasks);
        return hasConflict(seccion.mask, maskOtras);
    };

    const estaSeleccionada = (seccionId: string): boolean => {
        return seccionesSeleccionadas.some(s => s.id === seccionId);
    };

    return (
        <aside className="w-[330px] h-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden p-4 m-3">
            {/* Header fijo */}
            <div className="flex-shrink-0">
                {/* Título y botón */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mis Ramos</h2>
                    <button
                        onClick={onAgregarRamo}
                        className="btn-primary text-sm flex items-center gap-1"
                    >
                        <span>+</span>
                        <span>Agregar</span>
                    </button>
                </div>

                {/* Barra de búsqueda */}
                <div className="mb-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por sigla..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="input-styled pl-10"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            🔍
                        </span>
                        {busqueda && (
                            <button
                                onClick={() => setBusqueda('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {busqueda && (
                        <p className="text-xs text-gray-400 mt-1">
                            {ramosFiltrados.length} resultado{ramosFiltrados.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
            </div>

            {/* Lista de ramos con scroll independiente */}
            <div className="flex-1 min-w-0 overflow-y-auto">
                {ramos.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                        <p className="text-4xl mb-2">📚</p>
                        <p>No hay ramos agregados</p>
                        <p className="text-sm mt-1">Haz clic en "Agregar" para comenzar</p>
                    </div>
                ) : ramosFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                        <p className="text-2xl mb-2">🔍</p>
                        <p>No se encontraron ramos</p>
                        <p className="text-sm mt-1">con la sigla "{busqueda}"</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {ramosFiltrados.map((ramo) => {
                            const isExpanded = expandidos.has(ramo.sigla);
                            const seccionesPreparadas = prepararRamo(ramo);

                            return (
                                <div key={ramo.sigla} className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    {/* Header del ramo */}
                                    <div
                                        className="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between"
                                        onClick={() => toggleExpandido(ramo.sigla)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                                    {ramo.sigla}
                                                </span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                                    ({ramo.secciones.length} secciones)
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{ramo.nombre}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditarRamo(ramo);
                                                }}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                                title="Editar ramo"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`¿Eliminar ${ramo.sigla}?`)) {
                                                        onEliminarRamo(ramo.sigla);
                                                    }
                                                }}
                                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                title="Eliminar ramo"
                                            >
                                                🗑️
                                            </button>
                                            <span
                                                className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            >
                                                ▼
                                            </span>
                                        </div>
                                    </div>

                                    {/* Secciones colapsables */}
                                    <div
                                        className={`collapsible-content ${isExpanded ? 'max-h-[280px] overflow-y-auto' : 'max-h-0 overflow-hidden'}`}
                                    >
                                        <div className="px-3 pb-3 space-y-2">
                                            {seccionesPreparadas.length === 0 ? (
                                                <p className="text-sm text-gray-400 text-center py-2">
                                                    Sin secciones
                                                </p>
                                            ) : (
                                                seccionesPreparadas.map((seccion) => {
                                                    const seleccionada = estaSeleccionada(seccion.id);
                                                    const conflicto = seleccionada && tieneConflicto(seccion);

                                                    return (
                                                        <div
                                                            key={seccion.id}
                                                            className={`p-2 rounded-lg transition-colors ${seleccionada
                                                                ? conflicto
                                                                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800'
                                                                    : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-800'
                                                                : 'bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={seleccionada}
                                                                    onChange={() => onToggleSeccion(seccion)}
                                                                    className="checkbox-styled"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                                        Sección {seccion.numero}
                                                                    </span>
                                                                    {seccion.metadatos.profesor && (
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                            {seccion.metadatos.profesor}
                                                                        </p>
                                                                    )}
                                                                    {/* Indicadores de actividades */}
                                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                                        {seccion.actividades.map((act, i) => (
                                                                            <span
                                                                                key={i}
                                                                                className={`badge ${COLORES_ACTIVIDAD[act.tipo].bg} ${COLORES_ACTIVIDAD[act.tipo].text}`}
                                                                            >
                                                                                {act.tipo.charAt(0).toUpperCase()}
                                                                                {act.bloques.length}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => onEditarSeccion(ramo.sigla, seccion.id)}
                                                                        className="p-1 hover:bg-white/10 dark:hover:bg-black/20 rounded text-xs"
                                                                        title="Editar sección"
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (confirm(`¿Eliminar Sección ${seccion.numero}?`)) {
                                                                                onEliminarSeccion(ramo.sigla, seccion.id);
                                                                            }
                                                                        }}
                                                                        className="p-1 hover:bg-red-500/20 rounded text-xs"
                                                                        title="Eliminar sección"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}

                                            {/* Botón agregar sección */}
                                            <button
                                                onClick={() => onAgregarSeccion(ramo.sigla)}
                                                className="w-full py-2 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center gap-1"
                                            >
                                                <span>+</span>
                                                <span>Agregar sección</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
