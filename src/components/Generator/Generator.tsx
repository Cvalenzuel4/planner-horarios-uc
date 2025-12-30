/**
 * Generador de Horarios Automático
 * Permite buscar ramos desde la API, seleccionar secciones específicas
 * y generar combinaciones válidas de horarios
 */

import { useState, useMemo } from 'react';
import { Ramo, SeccionConMask, ResultadoGeneracion, PermisosTopeMap } from '../../types';
import { generarHorarios, obtenerInfoCombinacion } from '../../core/scheduler';
import { ConflictConfigModal } from './ConflictConfigModal';
import { useCourseGenerator } from '../../hooks';
import { SEMESTRE_ACTUAL } from '../../services/api.types';

interface GeneratorProps {
    ramos: Ramo[];
    onNuevosRamos: (ramos: Ramo[]) => void;
    onLimpiarRamos: () => void;
    onPreviewResultado: (secciones: SeccionConMask[]) => void;
    onAplicarResultado: (secciones: SeccionConMask[]) => void;
    onClearPreview: () => void;
}

export const Generator: React.FC<GeneratorProps> = ({
    ramos: ramosLocales,
    onNuevosRamos,
    onLimpiarRamos,
    onPreviewResultado,
    onAplicarResultado,
    onClearPreview,
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
    } = useCourseGenerator();

    // ---------- Estados para input de siglas ----------
    const [siglasInput, setSiglasInput] = useState('');
    const [semestre, setSemestre] = useState(SEMESTRE_ACTUAL);

    // ---------- Estados existentes ----------
    const [ramosSeleccionados, setRamosSeleccionados] = useState<Set<string>>(new Set());
    const [seccionesFiltradas, setSeccionesFiltradas] = useState<Map<string, Set<string>>>(new Map());
    const [ramosExpandidos, setRamosExpandidos] = useState<Set<string>>(new Set());

    const [resultados, setResultados] = useState<ResultadoGeneracion[]>([]);
    const [generando, setGenerando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tiempoGeneracion, setTiempoGeneracion] = useState<number>(0);
    const [permisosTope, setPermisosTope] = useState<PermisosTopeMap>(new Map());
    const [showConfigModal, setShowConfigModal] = useState(false);

    // ---------- Combinar ramos locales con los de la API ----------
    const ramos = useMemo(() => {
        // Los cursosAPI tienen prioridad (datos más frescos)
        const ramosMap = new Map<string, Ramo>();

        // Primero agregar locales
        for (const ramo of ramosLocales) {
            ramosMap.set(ramo.sigla, ramo);
        }

        // Sobrescribir/agregar con los de la API
        for (const ramo of cursosAPI) {
            ramosMap.set(ramo.sigla, ramo);
        }

        return Array.from(ramosMap.values());
    }, [ramosLocales, cursosAPI]);

    // ---------- Handler para cargar desde API ----------
    const handleCargarDesdeAPI = async () => {
        const siglas = siglasInput.split(/[,;\s]+/).filter(s => s.trim().length > 0);
        if (siglas.length === 0) {
            setError('Ingresa al menos una sigla (ej: ICS2123, MAT1610)');
            return;
        }

        // Limpiar estado antes de cargar
        setResultados([]);
        onClearPreview();

        await fetchAllCourses(siglas, semestre);
    };

    // ---------- Funciones existentes ----------
    const toggleRamo = (sigla: string) => {
        const nuevos = new Set(ramosSeleccionados);
        if (nuevos.has(sigla)) {
            nuevos.delete(sigla);
            const nuevosFiltros = new Map(seccionesFiltradas);
            nuevosFiltros.delete(sigla);
            setSeccionesFiltradas(nuevosFiltros);
            const nuevosExpandidos = new Set(ramosExpandidos);
            nuevosExpandidos.delete(sigla);
            setRamosExpandidos(nuevosExpandidos);
        } else {
            nuevos.add(sigla);
        }
        setRamosSeleccionados(nuevos);
        setResultados([]);
        onClearPreview();
    };

    const toggleExpandirRamo = (sigla: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const nuevos = new Set(ramosExpandidos);
        if (nuevos.has(sigla)) {
            nuevos.delete(sigla);
        } else {
            nuevos.add(sigla);
        }
        setRamosExpandidos(nuevos);
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
        onClearPreview();
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
        onClearPreview();
    };

    const getSeccionesSeleccionadasCount = (ramo: Ramo): string => {
        const filtro = seccionesFiltradas.get(ramo.sigla);
        if (!filtro || filtro.size === 0) {
            return `Todas (${ramo.secciones.length})`;
        }
        return `${filtro.size} de ${ramo.secciones.length}`;
    };

    const isSeccionSeleccionada = (sigla: string, seccionId: string): boolean => {
        const filtro = seccionesFiltradas.get(sigla);
        if (!filtro || filtro.size === 0) {
            return true;
        }
        return filtro.has(seccionId);
    };

    const seleccionarTodos = () => {
        setRamosSeleccionados(new Set(ramos.map(r => r.sigla)));
        setResultados([]);
        onClearPreview();
    };

    const deseleccionarTodos = () => {
        setRamosSeleccionados(new Set());
        setSeccionesFiltradas(new Map());
        setRamosExpandidos(new Set());
        setResultados([]);
        onClearPreview();
    };

    const ramosParaGenerar = useMemo(() => {
        return ramos.filter(r => ramosSeleccionados.has(r.sigla));
    }, [ramos, ramosSeleccionados]);

    const estadisticas = useMemo(() => {
        if (ramosParaGenerar.length === 0) return null;

        let seccionesTotalCount = 0;
        let combinacionesPosibles = 1;

        for (const ramo of ramosParaGenerar) {
            const filtro = seccionesFiltradas.get(ramo.sigla);
            const count = (filtro && filtro.size > 0) ? filtro.size : ramo.secciones.length;
            seccionesTotalCount += count;
            combinacionesPosibles *= count;
        }

        return {
            combinacionesPosibles,
            ramosCount: ramosParaGenerar.length,
            seccionesTotalCount,
        };
    }, [ramosParaGenerar, seccionesFiltradas]);

    const handleGenerar = async () => {
        if (ramosParaGenerar.length === 0) {
            setError('Selecciona al menos un ramo');
            return;
        }

        setGenerando(true);
        setError(null);
        setResultados([]);
        onClearPreview();

        await new Promise(resolve => setTimeout(resolve, 10));

        const inicio = performance.now();

        try {
            const results = generarHorarios(ramosParaGenerar, 500, seccionesFiltradas, permisosTope);
            const fin = performance.now();
            setTiempoGeneracion(fin - inicio);

            if (results.length === 0) {
                setError('No se encontraron combinaciones válidas (todos los horarios tienen conflictos)');
            } else {
                setResultados(results);
            }
        } catch (err) {
            setError(`Error durante la generación: ${(err as Error).message}`);
        } finally {
            setGenerando(false);
        }
    };

    return (
        <div className="flex flex-col">
            {/* Cabecera */}
            <div className="p-4 border-b border-white/10">
                <h2 className="text-xl font-bold text-white mb-2">
                    🔄 Generador de Horarios
                </h2>
                <p className="text-white/60 text-sm">
                    Busca ramos, selecciona secciones y genera combinaciones sin conflictos
                </p>
            </div>

            {/* ========== NUEVA SECCIÓN: Buscar desde API ========== */}
            <div className="p-4 border-b border-white/10 bg-white/5">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    🔍 Buscar Ramos desde API
                </h3>

                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input
                        type="text"
                        value={siglasInput}
                        onChange={(e) => setSiglasInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleCargarDesdeAPI()}
                        placeholder="Ej: ICS2123, MAT1610, FIS1514"
                        className="input-styled flex-1"
                        disabled={loadingAPI}
                    />

                    <select
                        value={semestre}
                        onChange={(e) => setSemestre(e.target.value)}
                        className="select-styled w-full sm:w-28"
                        disabled={loadingAPI}
                    >
                        <option value="2026-1">2026-1</option>
                        <option value="2025-2">2025-2</option>
                        <option value="2025-1">2025-1</option>
                    </select>

                    <button
                        onClick={handleCargarDesdeAPI}
                        disabled={loadingAPI || !siglasInput.trim()}
                        className={`btn-primary px-4 whitespace-nowrap ${loadingAPI ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loadingAPI ? (
                            <span className="flex items-center gap-2">
                                <span className="loader w-4 h-4" />
                                Cargando...
                            </span>
                        ) : (
                            '🚀 Cargar'
                        )}
                    </button>
                </div>

                {/* Progreso de carga */}
                {loadingProgress && (
                    <div className="mt-2 p-2 bg-indigo-500/20 rounded-lg text-sm text-indigo-200 flex items-center gap-2">
                        <span className="loader w-3 h-3" />
                        Buscando {loadingProgress.currentSigla}... ({loadingProgress.current}/{loadingProgress.total})
                    </div>
                )}

                {/* Errores por sigla */}
                {Object.keys(erroresPorSigla).length > 0 && (
                    <div className="mt-2 p-2 bg-amber-500/20 rounded-lg text-sm text-amber-200">
                        <span className="font-medium">⚠️ Algunas siglas no se encontraron:</span>
                        <ul className="ml-4 mt-1 text-xs">
                            {Object.entries(erroresPorSigla).map(([sigla, msg]) => (
                                <li key={sigla}>• {sigla}: {msg}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Cursos cargados desde API */}
                {cursosAPI.length > 0 && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-emerald-300">
                            ✅ {cursosAPI.length} ramo{cursosAPI.length !== 1 ? 's' : ''} cargado{cursosAPI.length !== 1 ? 's' : ''} desde la API
                        </span>
                        <button
                            onClick={clearCourses}
                            className="text-xs text-white/50 hover:text-white/70"
                        >
                            Limpiar
                        </button>
                    </div>
                )}
            </div>

            {/* Selector de ramos */}
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium">Ramos a incluir:</h3>
                    <div className="flex gap-2 items-center">
                        {/* Botón limpiar - solo visible si hay ramos */}
                        {ramos.length > 0 && (
                            <button
                                onClick={() => {
                                    if (confirm('¿Estás seguro de que deseas eliminar TODOS los ramos cargados?')) {
                                        clearCourses();
                                        onLimpiarRamos();
                                        deseleccionarTodos();
                                    }
                                }}
                                className="text-xs text-red-300 hover:text-red-200 flex items-center gap-1"
                                title="Eliminar todos los ramos cargados"
                            >
                                🗑️ Limpiar
                            </button>
                        )}
                        {ramos.length > 0 && <span className="text-white/30">|</span>}
                        <button
                            onClick={seleccionarTodos}
                            className="text-xs text-indigo-300 hover:text-indigo-200"
                        >
                            Todos
                        </button>
                        <span className="text-white/30">|</span>
                        <button
                            onClick={deseleccionarTodos}
                            className="text-xs text-indigo-300 hover:text-indigo-200"
                        >
                            Ninguno
                        </button>
                    </div>
                </div>

                {ramos.length === 0 ? (
                    <p className="text-white/40 text-center py-4">
                        No hay ramos disponibles. Busca ramos desde la API o agrega ramos en el Planificador.
                    </p>
                ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {ramos.map((ramo) => {
                            const isSelected = ramosSeleccionados.has(ramo.sigla);
                            const isExpanded = ramosExpandidos.has(ramo.sigla);
                            const isFromAPI = cursosAPI.some(c => c.sigla === ramo.sigla);

                            return (
                                <div key={ramo.sigla} className="space-y-1">
                                    {/* Ramo principal */}
                                    <div
                                        className={`
                                            flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                                            ${isSelected
                                                ? 'bg-indigo-500/20 border border-indigo-500/50'
                                                : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                            }
                                        `}
                                        onClick={() => toggleRamo(ramo.sigla)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => { }}
                                            className="checkbox-styled"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-medium text-white block truncate">
                                                {ramo.sigla}
                                                {isFromAPI && (
                                                    <span className="ml-2 text-xs bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded">
                                                        API
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-xs text-white/50 block truncate">
                                                {ramo.nombre} • {getSeccionesSeleccionadasCount(ramo)}
                                            </span>
                                        </div>
                                        {/* Botón expandir secciones */}
                                        {isSelected && ramo.secciones.length > 0 && (
                                            <button
                                                onClick={(e) => toggleExpandirRamo(ramo.sigla, e)}
                                                className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                                title="Filtrar secciones"
                                            >
                                                <svg
                                                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* Secciones del ramo (expandible) */}
                                    {isSelected && isExpanded && (
                                        <div className="ml-6 p-2 bg-white/5 rounded-lg space-y-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-white/60 font-medium">Secciones:</span>
                                                <button
                                                    onClick={() => seleccionarTodasSecciones(ramo)}
                                                    className="text-xs text-indigo-300 hover:text-indigo-200"
                                                >
                                                    {(seccionesFiltradas.get(ramo.sigla)?.size === ramo.secciones.length)
                                                        ? 'Cualquiera'
                                                        : 'Seleccionar todas'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1">
                                                {ramo.secciones.map((seccion) => {
                                                    const isSeccionActiva = isSeccionSeleccionada(ramo.sigla, seccion.id);
                                                    const filtro = seccionesFiltradas.get(ramo.sigla);
                                                    const hayFiltroActivo = filtro && filtro.size > 0;

                                                    return (
                                                        <label
                                                            key={seccion.id}
                                                            className={`
                                                                flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors text-xs
                                                                ${hayFiltroActivo && isSeccionActiva
                                                                    ? 'bg-indigo-500/30 text-white'
                                                                    : hayFiltroActivo && !isSeccionActiva
                                                                        ? 'bg-white/5 text-white/40'
                                                                        : 'bg-white/10 text-white/80 hover:bg-white/15'
                                                                }
                                                            `}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={hayFiltroActivo ? isSeccionActiva : false}
                                                                onChange={() => toggleSeccion(ramo.sigla, seccion.id)}
                                                                className="checkbox-styled w-3 h-3"
                                                            />
                                                            <span className="truncate">
                                                                Sec {seccion.numero}
                                                                {seccion.metadatos?.profesor && (
                                                                    <span className="text-white/40 ml-1">
                                                                        ({seccion.metadatos.profesor})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-xs text-white/40 mt-2 italic">
                                                Sin selección = cualquier sección válida
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Estadísticas */}
                {estadisticas && (
                    <div className="mt-3 p-2 bg-white/5 rounded-lg text-sm text-white/70">
                        <span className="font-medium">{estadisticas.ramosCount}</span> ramos,{' '}
                        <span className="font-medium">{estadisticas.seccionesTotalCount}</span> secciones,{' '}
                        <span className="font-medium">{estadisticas.combinacionesPosibles.toLocaleString()}</span> combinaciones posibles
                    </div>
                )}

                {/* Botón configurar topes */}
                <button
                    onClick={() => setShowConfigModal(true)}
                    disabled={ramosSeleccionados.size === 0}
                    className={`
                        w-full mt-4 py-2 rounded-lg font-medium transition-all text-sm
                        ${ramosSeleccionados.size === 0
                            ? 'bg-white/5 text-white/30 cursor-not-allowed'
                            : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/10'
                        }
                    `}
                >
                    ⚙️ Configurar Topes Permitidos
                    {permisosTope.size > 0 && (
                        <span className="ml-2 bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded text-xs">
                            {permisosTope.size} activo{permisosTope.size !== 1 ? 's' : ''}
                        </span>
                    )}
                </button>

                {/* Botón generar */}
                <button
                    onClick={handleGenerar}
                    disabled={generando || ramosSeleccionados.size === 0}
                    className={`
            w-full mt-4 py-3 rounded-lg font-bold transition-all
            ${generando || ramosSeleccionados.size === 0
                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                            : 'btn-primary'
                        }
          `}
                >
                    {generando ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="loader w-5 h-5" />
                            Generando...
                        </span>
                    ) : (
                        '🚀 Generar Horarios'
                    )}
                </button>
            </div>

            {/* Error */}
            {(error || errorAPI) && (
                <div className="m-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                    {error || errorAPI}
                </div>
            )}

            {/* Resultados */}
            <div className="p-4">
                {resultados.length > 0 && (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white font-medium">
                                Resultados: {resultados.length} combinaciones
                            </h3>
                            <span className="text-xs text-white/50">
                                Generado en {tiempoGeneracion.toFixed(0)}ms
                            </span>
                        </div>

                        {/* Max height para ~3 tarjetas (~130px each + spacing), scroll solo si hay 4+ resultados */}
                        <div className={`space-y-2 pr-1 ${resultados.length > 3 ? 'max-h-[420px] overflow-y-auto' : ''}`}>
                            {resultados.map((resultado, index) => {
                                const info = obtenerInfoCombinacion(resultado);

                                return (
                                    <div
                                        key={resultado.id}
                                        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                                        onMouseEnter={() => onPreviewResultado(resultado.secciones)}
                                        onMouseLeave={() => onClearPreview()}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-white font-medium">
                                                    Opción {index + 1}
                                                    {resultado.tieneConflictosPermitidos && (
                                                        <span className="ml-2 text-xs bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded">
                                                            ⚠️ Con tope
                                                        </span>
                                                    )}
                                                </span>
                                                <p className="text-xs text-white/60 mt-1">
                                                    {info.descripcion}
                                                </p>
                                                <p className="text-xs text-white/40 mt-1">
                                                    {info.bloquesOcupados} bloques ocupados
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Persistir ramos de la API antes de aplicar
                                                    if (cursosAPI.length > 0) {
                                                        onNuevosRamos(cursosAPI);
                                                    }
                                                    onAplicarResultado(resultado.secciones);
                                                }}
                                                className="btn-primary text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Aplicar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {!generando && resultados.length === 0 && !error && !errorAPI && (
                    <div className="text-center py-8 text-white/40">
                        <p className="text-4xl mb-2">📊</p>
                        <p>Selecciona ramos y haz clic en "Generar"</p>
                        <p className="text-sm mt-1">Los resultados aparecerán aquí</p>
                    </div>
                )}
            </div>

            {/* Modal de configuración de topes */}
            {showConfigModal && (
                <ConflictConfigModal
                    ramos={ramosParaGenerar}
                    permisosTope={permisosTope}
                    onSave={setPermisosTope}
                    onClose={() => setShowConfigModal(false)}
                />
            )}
        </div>
    );
};

export default Generator;
