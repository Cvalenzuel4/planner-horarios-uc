/**
 * Generador de Horarios Automático - Modo Interactivo
 * Permite buscar ramos, generar combinaciones y visualizarlas interactivamente
 */

import { useState, useMemo, useEffect } from 'react';
import { Ramo, SeccionConMask, ResultadoGeneracion, PermisosTopeMap } from '../../types';
import { generarHorarios, obtenerInfoCombinacion, TopPairResult } from '../../core';
import { ConflictConfigModal } from './ConflictConfigModal';
import { NoResultsDiagnosticModal } from './NoResultsDiagnosticModal';
import { useCourseGenerator } from '../../hooks';
import { ScheduleGrid } from '../Grid';

interface GeneratorProps {
    ramos: Ramo[];
    onNuevosRamos: (ramos: Ramo[]) => Promise<void>;
    onLimpiarRamos: () => void;
    onEliminarRamos: (siglas: string[]) => Promise<void>;
    onAplicarResultado: (secciones: SeccionConMask[]) => void;
    semestre: string;
    onSemestreChange: (semestre: string) => void;
    // Removed unused preview props
}

export const Generator: React.FC<GeneratorProps> = ({
    ramos: ramosLocales,
    onNuevosRamos,
    onLimpiarRamos,
    onEliminarRamos,
    onAplicarResultado,
    semestre,
    onSemestreChange,
}) => {
    // ---------- Hook para cargar cursos desde API ----------
    const {
        isLoading: loadingAPI,
        loadingProgress,
        error: errorAPI,
        cursosAPI,
        erroresPorSigla,
        fetchAllCourses,
        clearCourses,
        removeCourses,
    } = useCourseGenerator();

    // Limpiar cursos de la API cuando cambia el semestre
    useEffect(() => {
        clearCourses();
    }, [semestre]); // eslint-disable-line react-hooks/exhaustive-deps

    // ---------- Estados para input de siglas ----------
    const [siglasInput, setSiglasInput] = useState('');

    // ---------- Estados de configuración ----------
    const [ramosSeleccionados, setRamosSeleccionados] = useState<Set<string>>(new Set());
    const [seccionesFiltradas, setSeccionesFiltradas] = useState<Map<string, Set<string>>>(new Map());
    const [ramosExpandidos, setRamosExpandidos] = useState<Set<string>>(new Set());
    const [permisosTope, setPermisosTope] = useState<PermisosTopeMap>(new Map());
    const [showConfigModal, setShowConfigModal] = useState(false);

    // ---------- Estados de Resultados y Navegación ----------
    const [resultados, setResultados] = useState<ResultadoGeneracion[]>([]);
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [generando, setGenerando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tiempoGeneracion, setTiempoGeneracion] = useState<number>(0);

    // ---------- Estados de diagnóstico de conflictos ----------
    const [conflictDiagnostic, setConflictDiagnostic] = useState<TopPairResult[] | null>(null);
    const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);

    // ---------- Combinar ramos locales con los de la API ----------
    const ramos = useMemo(() => {
        const ramosMap = new Map<string, Ramo>();
        for (const ramo of ramosLocales) ramosMap.set(ramo.sigla, ramo);
        for (const ramo of cursosAPI) ramosMap.set(ramo.sigla, ramo);
        return Array.from(ramosMap.values());
    }, [ramosLocales, cursosAPI]);

    // ---------- Handler para cargar desde API ----------
    const handleCargarDesdeAPI = async () => {
        const siglas = siglasInput.split(/[,;\s]+/).filter(s => s.trim().length > 0);
        if (siglas.length === 0) {
            setError('Ingresa al menos una sigla (ej: ICS2123, MAT1610)');
            return;
        }

        setResultados([]);
        setActiveIndex(0);

        const nuevosRamos = await fetchAllCourses(siglas, semestre);
        if (nuevosRamos && nuevosRamos.length > 0) {
            await onNuevosRamos(nuevosRamos);
            setRamosSeleccionados(prev => {
                const newSet = new Set(prev);
                nuevosRamos.forEach(r => newSet.add(r.sigla));
                return newSet;
            });
        }
    };

    // ---------- Funciones de selección ----------
    const toggleRamo = (sigla: string) => {
        const nuevos = new Set(ramosSeleccionados);
        if (nuevos.has(sigla)) {
            nuevos.delete(sigla);
            const nuevosFiltros = new Map(seccionesFiltradas);
            nuevosFiltros.delete(sigla);
            setSeccionesFiltradas(nuevosFiltros);
        } else {
            nuevos.add(sigla);
        }
        setRamosSeleccionados(nuevos);
        setResultados([]);
        setActiveIndex(0);
    };

    const toggleExpandirRamo = (sigla: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setRamosExpandidos(prev => {
            const nuevos = new Set(prev);
            nuevos.has(sigla) ? nuevos.delete(sigla) : nuevos.add(sigla);
            return nuevos;
        });
    };

    const toggleSeccion = (sigla: string, seccionId: string) => {
        const nuevosFiltros = new Map(seccionesFiltradas);
        const seccionesActuales = nuevosFiltros.get(sigla) || new Set<string>();
        const nuevasSecciones = new Set(seccionesActuales);

        if (nuevasSecciones.has(seccionId)) {
            nuevasSecciones.delete(seccionId);
        } else {
            nuevasSecciones.add(seccionId);
        }

        nuevosFiltros.set(sigla, nuevasSecciones);
        setSeccionesFiltradas(nuevosFiltros);
        setResultados([]);
        setActiveIndex(0);
    };

    const seleccionarTodasSecciones = (ramo: Ramo) => {
        const nuevosFiltros = new Map(seccionesFiltradas);
        const seccionesActuales = nuevosFiltros.get(ramo.sigla);
        if (seccionesActuales && seccionesActuales.size === ramo.secciones.length) {
            nuevosFiltros.delete(ramo.sigla);
        } else {
            nuevosFiltros.set(ramo.sigla, new Set(ramo.secciones.map(s => s.id)));
        }
        setSeccionesFiltradas(nuevosFiltros);
        setResultados([]);
        setActiveIndex(0);
    };

    const getSeccionesSeleccionadasCount = (ramo: Ramo): string => {
        const filtro = seccionesFiltradas.get(ramo.sigla);
        if (!filtro || filtro.size === 0) return `Todas (${ramo.secciones.length})`;
        return `${filtro.size} de ${ramo.secciones.length}`;
    };

    const isSeccionSeleccionada = (sigla: string, seccionId: string): boolean => {
        const filtro = seccionesFiltradas.get(sigla);
        if (!filtro || filtro.size === 0) return true;
        return filtro.has(seccionId);
    };

    const seleccionarTodos = () => {
        setRamosSeleccionados(new Set(ramos.map(r => r.sigla)));
        setResultados([]);
        setActiveIndex(0);
    };

    const deseleccionarTodos = () => {
        setRamosSeleccionados(new Set());
        setSeccionesFiltradas(new Map());
        setResultados([]);
        setActiveIndex(0);
    };

    // ---------- Generación ----------
    const ramosParaGenerar = useMemo(() => {
        return ramos.filter(r => ramosSeleccionados.has(r.sigla));
    }, [ramos, ramosSeleccionados]);

    const handleGenerar = async () => {
        if (ramosParaGenerar.length === 0) {
            setError('Selecciona al menos un ramo');
            return;
        }

        setGenerando(true);
        setError(null);
        setResultados([]);
        setActiveIndex(0);
        setTiempoGeneracion(0);
        setConflictDiagnostic(null);

        await new Promise(resolve => setTimeout(resolve, 50));

        const inicio = performance.now();

        try {
            const { resultados: results, conflictDiagnostic: diagnostic } = generarHorarios(
                ramosParaGenerar, 500, seccionesFiltradas, permisosTope
            );
            const fin = performance.now();
            setTiempoGeneracion(fin - inicio);

            if (results.length === 0) {
                setError('No se encontraron combinaciones válidas');
                if (diagnostic && diagnostic.length > 0) {
                    setConflictDiagnostic(diagnostic);
                }
            } else {
                setResultados(results);
                setActiveIndex(0);
            }
        } catch (err) {
            setError(`Error durante la generación: ${(err as Error).message}`);
        } finally {
            setGenerando(false);
        }
    };

    const handleNext = () => {
        if (resultados.length === 0) return;
        setActiveIndex(prev => Math.min(prev + 1, resultados.length - 1));
    };

    const handlePrev = () => {
        if (resultados.length === 0) return;
        setActiveIndex(prev => Math.max(prev - 1, 0));
    };

    const handleApplyToPlanner = async () => {
        if (resultados.length === 0) return;
        const seleccion = resultados[activeIndex].secciones;

        if (cursosAPI.length > 0) {
            await onNuevosRamos(cursosAPI);
        }

        onAplicarResultado(seleccion);
    };

    // ---------- Render ----------
    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-white">

            {/* ================= SIDEBAR ================= */}
            <div className="w-full lg:w-[400px] flex-shrink-0 flex flex-col border-r border-gray-200 bg-white h-full overflow-hidden z-10 shadow-sm relative">

                <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-800 mb-1">
                        Generador
                    </h2>
                    <p className="text-gray-500 text-xs">
                        {resultados.length > 0
                            ? `Se encontraron ${resultados.length} combinaciones`
                            : 'Configura y genera tus opciones.'}
                        {tiempoGeneracion > 0 && ` (${tiempoGeneracion.toFixed(0)}ms)`}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50/30">

                    {/* Buscador API */}
                    <div className="p-4 border-b border-gray-100 bg-white">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                            Buscar Ramos desde API
                        </label>
                        <div className="flex flex-col gap-2 mb-2">
                            <input
                                type="text"
                                value={siglasInput}
                                onChange={(e) => setSiglasInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleCargarDesdeAPI()}
                                placeholder="Ej: MAT1610, ICS1513"
                                className="input-styled w-full text-sm py-1.5"
                                disabled={loadingAPI}
                            />
                            <div className="flex gap-2">
                                <select
                                    value={semestre}
                                    onChange={(e) => onSemestreChange(e.target.value)}
                                    className="select-styled text-sm py-1.5 w-32"
                                    disabled={loadingAPI}
                                >
                                    <option value="2026-1">2026-1</option>
                                    <option value="2025-2">2025-2</option>
                                    <option value="2025-1">2025-1</option>
                                </select>
                                <button
                                    onClick={handleCargarDesdeAPI}
                                    disabled={loadingAPI || !siglasInput.trim()}
                                    className="btn-primary px-3 py-1.5 text-sm flex-1 flex justify-center gap-2"
                                >
                                    {loadingAPI ? <span className="loader w-4 h-4" /> : '🔍 Buscar'}
                                </button>
                            </div>
                        </div>

                        {loadingProgress && (
                            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-2 border border-blue-100 flex items-center gap-2">
                                <span className="loader w-3 h-3 border-blue-600" />
                                Buscando {loadingProgress.currentSigla}...
                            </div>
                        )}

                        {Object.keys(erroresPorSigla).length > 0 && (
                            <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700 border border-amber-100">
                                {Object.entries(erroresPorSigla).map(([sigla, msg]) => (
                                    <div key={sigla}>• <b>{sigla}:</b> {msg}</div>
                                ))}
                            </div>
                        )}

                        {cursosAPI.length > 0 && (
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                    ✅ {cursosAPI.length} ramos cargados
                                </span>
                                <button onClick={() => { clearCourses(); onLimpiarRamos(); }} className="text-xs text-gray-400 hover:text-red-500 underline decoration-dotted">
                                    Limpiar API
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Lista Ramos */}
                    <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Mis Ramos ({ramos.length})
                            </label>
                            {ramos.length > 0 && (
                                <div className="text-xs flex items-center gap-3">
                                    <div className="space-x-2 border-r border-gray-200 pr-3">
                                        <button onClick={seleccionarTodos} className="text-blue-600 hover:underline">Todos</button>
                                        <button onClick={deseleccionarTodos} className="text-gray-400 hover:text-gray-600">Ninguno</button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (ramosSeleccionados.size === 0) {
                                                if (confirm('¿Eliminar todos los ramos?')) {
                                                    clearCourses();
                                                    onLimpiarRamos();
                                                }
                                            } else {
                                                if (confirm(`¿Eliminar ${ramosSeleccionados.size} ramos seleccionados?`)) {
                                                    const siglasParaEliminar = Array.from(ramosSeleccionados);

                                                    // 1. Eliminar de la BD / Estado global
                                                    onEliminarRamos(siglasParaEliminar);

                                                    // 2. Limpiar selección local
                                                    const nuevosFiltros = new Map(seccionesFiltradas);
                                                    siglasParaEliminar.forEach(s => nuevosFiltros.delete(s));
                                                    setSeccionesFiltradas(nuevosFiltros);
                                                    setRamosSeleccionados(new Set());

                                                    // 3. Eliminar de la API si existen
                                                    removeCourses(siglasParaEliminar);
                                                }
                                            }
                                        }}
                                        className="text-red-500 hover:text-red-700 flex items-center gap-1"
                                        title={ramosSeleccionados.size > 0 ? "Eliminar seleccionados" : "Eliminar todos"}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            )}
                        </div>

                        {ramos.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm italic border-2 border-dashed border-gray-100 rounded-xl">
                                No hay ramos disponibles.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {ramos.map((ramo) => (
                                    <div key={ramo.sigla} className="border border-gray-100 rounded-lg bg-white shadow-sm overflow-hidden">
                                        <div
                                            className={`p-2.5 flex items-center gap-3 cursor-pointer transition-colors ${ramosSeleccionados.has(ramo.sigla) ? 'bg-blue-50/60' : 'hover:bg-gray-50'}`}
                                            onClick={() => toggleRamo(ramo.sigla)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={ramosSeleccionados.has(ramo.sigla)}
                                                onChange={() => { }}
                                                className="checkbox-styled"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-gray-700 text-sm truncate">{ramo.sigla}</span>
                                                    {ramosSeleccionados.has(ramo.sigla) && ramo.secciones.length > 0 && (
                                                        <button
                                                            onClick={(e) => toggleExpandirRamo(ramo.sigla, e)}
                                                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-black/5"
                                                        >
                                                            <svg className={`w-4 h-4 transition-transform ${ramosExpandidos.has(ramo.sigla) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center text-xs mt-0.5">
                                                    <span className="text-gray-500 truncate max-w-[150px]">{ramo.nombre}</span>
                                                    <span className="text-gray-400 text-[10px]">{getSeccionesSeleccionadasCount(ramo)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Secciones expandibles */}
                                        {ramosSeleccionados.has(ramo.sigla) && ramosExpandidos.has(ramo.sigla) && (
                                            <div className="bg-gray-50 p-2 border-t border-gray-100 space-y-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Secciones</span>
                                                    <button onClick={() => seleccionarTodasSecciones(ramo)} className="text-[10px] text-blue-500 hover:text-blue-700">
                                                        Todas/Ninguna
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 gap-1">
                                                    {ramo.secciones.map(sec => (
                                                        <label key={sec.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-white text-xs border border-transparent hover:border-gray-100 transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSeccionSeleccionada(ramo.sigla, sec.id)}
                                                                onChange={() => toggleSeccion(ramo.sigla, sec.id)}
                                                                className="checkbox-styled w-3.5 h-3.5 flex-shrink-0"
                                                            />
                                                            <span className={`truncate ${!isSeccionSeleccionada(ramo.sigla, sec.id) ? 'text-gray-400' : 'text-gray-700'}`}>
                                                                Sec {sec.numero} {sec.metadatos?.profesor && <span className="text-gray-500 ml-1">({sec.metadatos.profesor})</span>}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* LISTA RESULTADOS SIDEBAR */}
                        {resultados.length > 0 && (
                            <div className="mt-8 border-t border-gray-200 pt-4">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Navegación Rápida
                                </label>
                                <div className="space-y-1.5">
                                    {resultados.map((res, idx) => {
                                        const isActive = idx === activeIndex;
                                        return (
                                            <div
                                                key={idx}
                                                className={`p-2 rounded-lg border flex justify-between items-center cursor-pointer transition-all ${isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                                                onClick={() => setActiveIndex(idx)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                        {idx + 1}
                                                    </span>
                                                    {res.tieneConflictosPermitidos && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded" title="Conflicto permitido">⚠️</span>
                                                    )}
                                                    <span className="text-[10px] text-gray-400">{obtenerInfoCombinacion(res).bloquesOcupados} blq</span>
                                                </div>
                                                <button
                                                    className={`text-[10px] uppercase font-bold tracking-wide ${isActive ? 'text-blue-600' : 'text-gray-300'}`}
                                                >
                                                    {isActive ? 'Viendo' : 'Ver'}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer Sidebar */}
                <div className="p-4 border-t border-gray-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    <button
                        onClick={() => setShowConfigModal(true)}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3 w-full justify-center transition-colors hover:bg-gray-50 py-1 rounded"
                    >
                        ⚙️ Topes permitidos {permisosTope.size > 0 && `(${permisosTope.size})`}
                    </button>
                    <button
                        onClick={handleGenerar}
                        disabled={generando || ramosSeleccionados.size === 0}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-[0.98] ${generando ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}
                    >
                        {generando ? 'Generando...' : '⚡ Generar Combinaciones'}
                    </button>
                    {(error || errorAPI) && (
                        <div className="mt-2 text-xs text-red-500 text-center font-medium animate-pulse bg-red-50 p-1 rounded border border-red-100">
                            {error || errorAPI}
                        </div>
                    )}
                </div>
            </div>

            {/* ================= MAIN CONTENT ================= */}
            <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    {resultados.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 select-none">
                            {error && conflictDiagnostic && conflictDiagnostic.length > 0 ? (
                                /* Error state with diagnostic available */
                                <>
                                    <div className="text-5xl mb-4">❌</div>
                                    <h3 className="text-lg font-medium text-gray-600">No hay combinaciones posibles</h3>
                                    <p className="text-sm mt-2 text-gray-400 max-w-sm text-center">
                                        Con las restricciones actuales no se encontró ningún horario sin conflictos.
                                    </p>
                                    <button
                                        onClick={() => setShowDiagnosticModal(true)}
                                        className="mt-4 text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium flex items-center gap-1"
                                    >
                                        <span>📊</span> Ver detalle de conflictos
                                    </button>
                                </>
                            ) : (
                                /* Normal empty state */
                                <>
                                    <div className="text-8xl mb-4 grayscale opacity-20">📅</div>
                                    <h3 className="text-xl font-medium text-gray-400">Generador de Horarios</h3>
                                    <p className="text-sm mt-2 max-w-sm text-center text-gray-400">
                                        Busca ramos en la API, selecciona tus preferencias en el panel izquierdo y presiona "Generar".
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Info Bar */}
                            <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-lg font-bold text-gray-800 leading-none">Opción {activeIndex + 1}</span>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                    ⏱️ {obtenerInfoCombinacion(resultados[activeIndex]).bloquesOcupados} bloques
                                </div>
                            </div>

                            {/* GRID */}
                            <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-slate-50/50">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 min-w-[800px] mx-auto max-w-6xl h-full flex flex-col">
                                    <ScheduleGrid
                                        seccionesSeleccionadas={resultados[activeIndex].secciones}
                                        previewSecciones={[]}
                                    />
                                </div>
                            </div>

                            {/* NAVIGATION BAR */}
                            <div className="bg-white border-t border-gray-200 p-4 flex flex-col md:flex-row justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 gap-4 flex-shrink-0">
                                <div className="flex items-center gap-2 bg-gray-100/50 p-1.5 rounded-xl border border-gray-200">
                                    <button
                                        onClick={handlePrev}
                                        disabled={activeIndex === 0}
                                        className="p-2 hover:bg-white rounded-lg text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm disabled:shadow-none bg-transparent hover:shadow min-w-[40px]"
                                    >
                                        ◀
                                    </button>
                                    <div className="flex flex-col items-center w-24 px-2 select-none">
                                        <span className="font-bold text-gray-800 text-lg leading-none">{activeIndex + 1}</span>
                                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">de {resultados.length}</span>
                                    </div>
                                    <button
                                        onClick={handleNext}
                                        disabled={activeIndex === resultados.length - 1}
                                        className="p-2 hover:bg-white rounded-lg text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm disabled:shadow-none bg-transparent hover:shadow min-w-[40px]"
                                    >
                                        ▶
                                    </button>
                                </div>

                                <button
                                    onClick={handleApplyToPlanner}
                                    className="bg-[#003366] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#002244] transition-all shadow-lg hover:shadow-xl active:transform active:scale-[0.98] flex items-center gap-3 group"
                                >
                                    <span>Llevar al Planificador</span>
                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal - Conflict Config */}
            {showConfigModal && (
                <ConflictConfigModal
                    ramos={ramosParaGenerar}
                    permisosTope={permisosTope}
                    onSave={setPermisosTope}
                    onClose={() => setShowConfigModal(false)}
                />
            )}

            {/* Modal - Diagnostic */}
            {showDiagnosticModal && conflictDiagnostic && (
                <NoResultsDiagnosticModal
                    isOpen={showDiagnosticModal}
                    onClose={() => setShowDiagnosticModal(false)}
                    topPairs={conflictDiagnostic}
                />
            )}
        </div>
    );
};

export default Generator;
