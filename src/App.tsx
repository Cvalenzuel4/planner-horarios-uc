/**
 * Planificador de Horarios UC - Aplicación Principal
 */

import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Ramo, SeccionConMask } from './types';
import { prepararRamo } from './core/bitmask';
import {
    initDatabase,
    obtenerRamosPorSemestre,
    agregarRamo,
    actualizarRamo,
    obtenerConfig,
    actualizarSeccionesSeleccionadas,
    descargarDatos,
    subirDatos,
    limpiarRamosSemestre,
    eliminarRamo,
} from './db';
import {
    ScheduleGrid,
    Generator,
    CourseSearch,
    SelectedCoursesList,
    SlotControls,
    CompareView,
    ShareButton
} from './components';
import { decodeShared } from './domain/share';
import { reconstructSchedule } from './domain/reconstruction';
import { useSlots } from './hooks/useSlots';
import { checkHealth, obtenerVacantes, SEMESTRE_ACTUAL } from './services';
import { exportarHorarioExcel } from './utils/excelExport';

type Tab = 'planner' | 'generator' | 'compare';

function App() {
    // Estado de datos
    const [ramos, setRamos] = useState<Ramo[]>([]);
    const [seccionesSeleccionadasIds, setSeccionesSeleccionadasIds] = useState<Set<string>>(new Set());
    const [currentSemester, setCurrentSemester] = useState(SEMESTRE_ACTUAL);
    const [previewSecciones, setPreviewSecciones] = useState<SeccionConMask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dbInitialized, setDbInitialized] = useState(false);
    const [importingStatus, setImportingStatus] = useState<{ loading: boolean; message: string }>({ loading: false, message: '' });

    // Estado de UI
    const [tab, setTab] = useState<Tab>('planner');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [gridHeight, setGridHeight] = useState<number | null>(null);
    const [searchRequest, setSearchRequest] = useState<{ term: string; timestamp: number } | null>(null);

    // Slots hook
    const { activeSlot, slots, saveSlot, loadSlot, setActiveSlot, clearSlot } = useSlots();


    // Ref para medir la altura del grid
    const gridContainerRef = useRef<HTMLDivElement>(null);

    // Health check al inicio para despertar la API
    useEffect(() => {
        checkHealth();
    }, []);

    // Cargar datos iniciales y reaccionar a cambios de semestre
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            setRamos([]); // Limpiar ramos al cambiar de semestre
            setSeccionesSeleccionadasIds(new Set()); // Limpiar selección al cambiar de semestre
            try {
                if (!dbInitialized) {
                    await initDatabase();
                    setDbInitialized(true);
                }

                // Cargar ramos del semestre actual
                console.log(`[App] Cargando datos para semestre: ${currentSemester}`);
                const ramosData = await obtenerRamosPorSemestre(currentSemester);
                console.log(`[App] Ramos cargados: ${ramosData.length}`);
                setRamos(ramosData);

                // Cargar selección del semestre actual
                const config = await obtenerConfig();
                if (config?.seccionesPorSemestre && config.seccionesPorSemestre[currentSemester]) {
                    setSeccionesSeleccionadasIds(new Set(config.seccionesPorSemestre[currentSemester]));
                } else if (currentSemester === '2026-1' && config?.seccionesSeleccionadas) {
                    // Migración legacy para el semestre por defecto
                    setSeccionesSeleccionadasIds(new Set(config.seccionesSeleccionadas));
                } else {
                    setSeccionesSeleccionadasIds(new Set());
                }
            } catch (err) {
                setError('Error al cargar la base de datos: ' + (err as Error).message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [currentSemester, dbInitialized]);

    // PROCESAR LINK COMPARTIDO (Hash)
    useEffect(() => {
        const handleHash = async () => {
            const hash = window.location.hash;
            if (hash.startsWith('#s=')) {
                try {
                    const encoded = hash.substring(3);
                    const snapshot = decodeShared(encoded);

                    if (snapshot) {
                        // Confirmar carga
                        const shouldLoad = ramos.length === 0 || confirm('Se ha detectado un horario compartido en el link. ¿Deseas cargarlo? Se reemplazará tu selección actual.');

                        if (shouldLoad) {
                            setImportingStatus({ loading: true, message: 'Iniciando carga de horario compartido...' });

                            // Reconstruir desde API
                            const result = await reconstructSchedule(snapshot, (msg) => {
                                setImportingStatus(prev => ({ ...prev, message: msg }));
                            });

                            // Aplicar cambios
                            setRamos(prev => {
                                // Combinar estrategicamente: mantener lo que ya estaba y agregar lo nuevo?
                                // O reemplazar totalmente?
                                // El usuario aceptó "reemplazar selección", pero quizás quiera mantener sus otros ramos en "mis ramos".
                                // Vamos a fusionar los ramos cargados con los existentes por si acaso.
                                const map = new Map(prev.map(r => [r.sigla, r]));
                                result.ramos.forEach(r => map.set(r.sigla, r));
                                return Array.from(map.values());
                            });

                            setCurrentSemester(snapshot.sem);
                            setSeccionesSeleccionadasIds(new Set(result.selectedIds));
                            setTab('planner'); // Ir al planner para ver el resultado

                            // Manejo de errores parciales
                            if (result.errors.length > 0) {
                                console.warn('Errores al importar:', result.errors);
                                alert(`Horario cargado con advertencias:\n- ${result.errors.join('\n- ')}`);
                            } else {
                                console.log('Horario reconstruido exitosamente');
                            }

                            // Vacantes prefetch para lo seleccionado
                            result.selectedIds.forEach(id => {
                                // Encontrar NRC
                                const ramo = result.ramos.find(r => r.secciones.some(s => s.id === id));
                                const seccion = ramo?.secciones.find(s => s.id === id);
                                if (seccion?.nrc) {
                                    obtenerVacantes(seccion.nrc).catch(() => { });
                                }
                            });

                        }
                    } else {
                        console.warn('Link inválido.');
                    }
                } catch (e) {
                    console.error('Error procesando link compartido', e);
                } finally {
                    setImportingStatus({ loading: false, message: '' });
                    // Opcional: limpiar hash para no re-importar al refrescar, 
                    // pero es útil mantenerlo para copiar.
                    // Si ya cargamos, el confirm() protege de re-loads accidentales.
                }
            }
        };

        if (dbInitialized && !loading) {
            // Pequeño delay
            setTimeout(handleHash, 500);
        }
    }, [dbInitialized, loading]); // Dependencias mínimas (run once logic handled inside)

    // Guardar secciones seleccionadas cuando cambien
    useEffect(() => {
        if (dbInitialized && !loading) {
            actualizarSeccionesSeleccionadas(currentSemester, Array.from(seccionesSeleccionadasIds));
        }
    }, [seccionesSeleccionadasIds, loading, dbInitialized, currentSemester]);

    // Calcular secciones seleccionadas con sus datos completos
    const seccionesSeleccionadas = useMemo(() => {
        const resultado: SeccionConMask[] = [];
        for (const ramo of ramos) {
            const seccionesPreparadas = prepararRamo(ramo);
            for (const seccion of seccionesPreparadas) {
                if (seccionesSeleccionadasIds.has(seccion.id)) {
                    resultado.push(seccion);
                }
            }
        }
        return resultado;
    }, [ramos, seccionesSeleccionadasIds]);

    // Medir la altura del grid para sincronizar con el sidebar
    useLayoutEffect(() => {
        const updateGridHeight = () => {
            if (gridContainerRef.current) {
                setGridHeight(gridContainerRef.current.offsetHeight);
            }
        };

        updateGridHeight();
        window.addEventListener('resize', updateGridHeight);
        return () => window.removeEventListener('resize', updateGridHeight);
    }, [tab, seccionesSeleccionadas]);

    // Handler para guardar ramos encontrados en la búsqueda
    const handleNuevosRamos = useCallback(async (nuevosRamos: Ramo[]) => {
        try {
            // Actualizar estado y DB
            const actualizados = [...ramos];
            let cambio = false;

            for (const nuevoRamo of nuevosRamos) {
                // Asegurar que el ramo tenga el semestre correcto (aunque la API debería darlo, forzamos coherencia)
                const ramoConSemestre = { ...nuevoRamo, semestre: currentSemester };

                const index = actualizados.findIndex(r => r.sigla === ramoConSemestre.sigla);
                if (index >= 0) {
                    actualizados[index] = ramoConSemestre;
                    await actualizarRamo(ramoConSemestre);
                    cambio = true;
                } else {
                    actualizados.push(ramoConSemestre);
                    await agregarRamo(ramoConSemestre);
                    cambio = true;
                }
            }

            if (cambio) {
                setRamos(actualizados);
            }
        } catch (err) {
            console.error('Error al guardar nuevos ramos:', err);
        }
    }, [ramos, currentSemester]);

    const handleToggleSeccion = useCallback((seccion: SeccionConMask) => {
        setSeccionesSeleccionadasIds(prev => {
            const nuevas = new Set(prev);
            if (nuevas.has(seccion.id)) {
                nuevas.delete(seccion.id);
            } else {
                nuevas.add(seccion.id);
                // Prefetch de vacantes (fire-and-forget) para que esté listo al abrir detalles
                if (seccion.nrc) {
                    obtenerVacantes(seccion.nrc).catch(console.error);
                }
            }
            return nuevas;
        });
    }, []);

    // Handler para buscar de nuevo un ramo desde la lista
    const handleSearchAgain = useCallback((sigla: string) => {
        setSearchRequest({ term: sigla, timestamp: Date.now() });
        setSidebarOpen(true);
        // Desplazar al top en móvil si fuera necesario
    }, []);

    // Import/Export
    const handleExportarExcel = useCallback(async () => {
        try {
            if (seccionesSeleccionadas.length === 0) {
                alert('No hay secciones seleccionadas para exportar.\nSelecciona al menos una sección en tu horario.');
                return;
            }
            await exportarHorarioExcel(seccionesSeleccionadas);
        } catch (err) {
            alert('Error al exportar Excel: ' + (err as Error).message);
        }
    }, [seccionesSeleccionadas]);

    const handleExportarJSON = useCallback(async () => {
        try {
            await descargarDatos();
        } catch (err) {
            alert('Error al exportar JSON: ' + (err as Error).message);
        }
    }, []);

    const handleImportar = useCallback(async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    await subirDatos(file);
                    // Recargar datos
                    const ramosData = await obtenerRamosPorSemestre(currentSemester);
                    setRamos(ramosData);
                    const config = await obtenerConfig();
                    if (config?.seccionesPorSemestre && config.seccionesPorSemestre[currentSemester]) {
                        setSeccionesSeleccionadasIds(new Set(config.seccionesPorSemestre[currentSemester]));
                    } else if (currentSemester === '2026-1' && config?.seccionesSeleccionadas) {
                        setSeccionesSeleccionadasIds(new Set(config.seccionesSeleccionadas));
                    } else {
                        setSeccionesSeleccionadasIds(new Set());
                    }
                    alert('Datos importados correctamente');
                } catch (err) {
                    alert('Error al importar: ' + (err as Error).message);
                }
            }
        };
        input.click();
    }, []);

    // Generador handlers
    const handleAplicarResultado = useCallback((secciones: SeccionConMask[]) => {
        setSeccionesSeleccionadasIds(new Set(secciones.map(s => s.id)));
        setPreviewSecciones([]);
        setTab('planner');

        // Prefetch vacantes para todos los ramos del horario generado
        secciones.forEach(s => {
            if (s.nrc) {
                obtenerVacantes(s.nrc).catch(console.error);
            }
        });
    }, []);

    // Limpiar todas las secciones seleccionadas
    const handleLimpiarHorario = useCallback(() => {
        if (confirm('¿Estás seguro de que quieres limpiar todo el horario?')) {
            setSeccionesSeleccionadasIds(new Set());
        }
    }, []);

    // Limpiar todos los ramos (del Generador)
    const handleLimpiarRamos = useCallback(async () => {
        try {
            await limpiarRamosSemestre(currentSemester);
            setRamos([]);
            setSeccionesSeleccionadasIds(new Set());
        } catch (err) {
            console.error('Error al limpiar ramos:', err);
        }
    }, []);

    // Eliminar ramos seleccionados
    const handleEliminarRamos = useCallback(async (siglas: string[]) => {
        try {
            // Eliminar de BD
            await Promise.all(siglas.map(sigla => eliminarRamo(sigla, currentSemester)));

            // Actualizar estado local
            setRamos(prev => prev.filter(r => !siglas.includes(r.sigla)));

            // Limpiar secciones seleccionadas de estos ramos
            setSeccionesSeleccionadasIds(prev => {
                const nuevas = new Set(prev);
                const seccionesDeEliminados = ramos
                    .filter(r => siglas.includes(r.sigla))
                    .flatMap(r => r.secciones.map(s => s.id));

                seccionesDeEliminados.forEach(id => nuevas.delete(id));
                return nuevas;
            });
        } catch (err) {
            console.error('Error al eliminar ramos:', err);
            alert('Error al eliminar ramos: ' + (err as Error).message);
        }
    }, [ramos]);

    // Slot Handlers
    const handleSaveSlot = useCallback(() => {
        const name = prompt(`Nombre para la Opción ${activeSlot}:`, `Opción ${activeSlot}`);
        if (name !== null) {
            // Guardamos todos los ramos actuales para poder restaurar el contexto completo,
            // no solo los IDs seleccionados.
            const ids = Array.from(seccionesSeleccionadasIds);
            saveSlot(activeSlot, name || `Opción ${activeSlot}`, ids, ramos);
        }
    }, [activeSlot, ramos, seccionesSeleccionadasIds, saveSlot]);

    const handleLoadSlot = useCallback(() => {
        const snapshot = loadSlot(activeSlot);
        if (snapshot) {
            if (confirm(`¿Cargar "${snapshot.name}"? Esto reemplazará tu selección actual.`)) {
                // 1. Restaurar ramos (fusionando con los actuales para no perder otros datos si fuera deseado, 
                // pero snapshot.ramos manda para asegurar consistencia visual con lo guardado)
                // Usamos un Map para unir inteligentemente si quisiéramos, pero por ahora reemplazamos
                // o fusionamos. Estrategia segura: Agregar los del snapshot a los existentes.

                const ramosMap = new Map(ramos.map(r => [r.sigla, r]));
                snapshot.ramos.forEach(r => ramosMap.set(r.sigla, r));
                const nuevosRamos = Array.from(ramosMap.values());

                setRamos(nuevosRamos);

                // 2. Restaurar selección
                setSeccionesSeleccionadasIds(new Set(snapshot.seccionesSeleccionadasIds));

                // 3. Resetear preview
                setPreviewSecciones([]);

                // 4. Prefetch vacantes para lo cargado
                // (Opcional: implementar si se desea pre-fetching aquí)
            }
        }
    }, [activeSlot, loadSlot, ramos]);

    const handleDeleteSlot = useCallback((slotId: 'A' | 'B' | 'C') => {
        const snapshot = loadSlot(slotId);
        if (snapshot && confirm(`¿Estás seguro de que quieres eliminar el horario guardado en "${snapshot.name}"?`)) {
            clearSlot(slotId);
        }
    }, [clearSlot, loadSlot]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="loader mx-auto mb-4" />
                    <p className="text-gray-500">Cargando...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md glass-panel p-8">
                    <p className="text-4xl mb-4">⚠️</p>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Error</h1>
                    <p className="text-gray-600">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-primary mt-4"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {/* Header */}
            <header className="relative z-[100] bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    {/* Botón hamburguesa para móvil */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
                        aria-label="Toggle menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {sidebarOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>

                    <h1 className="text-lg md:text-2xl font-bold text-[#003366] truncate">
                        <span className="hidden sm:inline">📅 Planificador de Horarios UC</span>
                        <span className="sm:hidden">📅 Horarios UC</span>
                    </h1>

                    {/* Tabs - ocultos en móvil pequeño, visibles como iconos en tablets */}
                    <nav className="hidden md:flex gap-1 ml-4 lg:ml-8">
                        <button
                            onClick={() => { setTab('planner'); setSidebarOpen(false); }}
                            className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all text-sm lg:text-base ${tab === 'planner'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            📋 <span className="hidden lg:inline">Planificador</span>
                        </button>
                        <button
                            onClick={() => { setTab('generator'); setSidebarOpen(false); }}
                            className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all text-sm lg:text-base ${tab === 'generator'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            🔄 <span className="hidden lg:inline">Generador</span>
                        </button>
                        <button
                            onClick={() => { setTab('compare'); setSidebarOpen(false); }}
                            className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all text-sm lg:text-base ${tab === 'compare'
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            ⚖️ <span className="hidden lg:inline">Comparar</span>
                        </button>
                    </nav>
                </div>

                {/* Slots Controls */}
                <div className="hidden xl:block mr-4">
                    <SlotControls
                        activeSlot={activeSlot}
                        slots={slots}
                        onSlotChange={setActiveSlot}
                        onSave={handleSaveSlot}
                        onLoad={handleLoadSlot}
                        onDeleteSlot={handleDeleteSlot}
                        isCurrentSlotEmpty={!slots[activeSlot]}
                    />
                </div>

                {/* Botones de Import/Export */}
                <div className="flex gap-1 md:gap-2 flex-shrink-0 items-center">
                    <ShareButton ramos={ramos} selectedIds={seccionesSeleccionadasIds} semestre={currentSemester} />
                    <div className="w-px h-6 bg-gray-200 mx-1 hidden md:block"></div>
                    <button onClick={handleImportar} className="btn-secondary text-xs md:text-sm px-3 py-2" title="Importar datos desde JSON">
                        <span>📥</span>
                    </button>
                    <button onClick={handleExportarJSON} className="btn-secondary text-xs md:text-sm px-3 py-2" title="Exportar todos los datos a JSON">
                        <span>���</span>
                    </button>
                    <button onClick={handleExportarExcel} className="btn-secondary text-xs md:text-sm px-3 py-2" title="Exportar horario visual a Excel">
                        <span>📄</span>
                    </button>
                </div>

            </header>

            {/* Tabs móviles - visibles solo en pantallas pequeñas */}
            <div className="md:hidden flex bg-white border-t border-gray-200">
                <button
                    onClick={() => { setTab('planner'); setSidebarOpen(false); }}
                    className={`flex-1 px-4 py-3 font-medium transition-all text-sm ${tab === 'planner'
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500'
                        }`}
                >
                    📋 Planificador
                </button>

                <button
                    onClick={() => { setTab('generator'); setSidebarOpen(false); }}
                    className={`flex-1 px-4 py-3 font-medium transition-all text-sm ${tab === 'generator'
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500'
                        }`}
                >
                    🔄 Generador
                </button>
                <button
                    onClick={() => { setTab('compare'); setSidebarOpen(false); }}
                    className={`flex-1 px-4 py-3 font-medium transition-all text-sm ${tab === 'compare'
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500'
                        }`}
                >
                    ⚖️ Comparar
                </button>
            </div>

            {/* Main content */}
            <main className="flex-1 min-h-0 relative overflow-hidden">
                {/* PLANNER TAB */}
                <div className={`flex flex-col lg:flex-row h-full w-full ${tab === 'planner' ? 'flex' : 'hidden'}`}>
                    {/* Overlay para cerrar sidebar en móvil */}
                    {sidebarOpen && (
                        <div
                            className="lg:hidden fixed inset-0 bg-black/50 z-30"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}

                    {/* Sidebar - Buscador de Cursos */}
                    <div
                        className={`
                            fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto
                            transform transition-transform duration-300 ease-in-out
                            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                            flex-shrink-0 lg:h-full max-h-[100vh] lg:max-h-full
                            w-full max-w-sm lg:max-w-none lg:w-[470px]
                        `}
                        style={gridHeight ? { height: `${gridHeight}px` } : undefined}
                    >
                        <CourseSearch
                            seccionesSeleccionadasIds={seccionesSeleccionadasIds}
                            onToggleSeccion={handleToggleSeccion}
                            onNuevosRamos={handleNuevosRamos}
                            externalSearchRequest={searchRequest}
                            semestre={currentSemester}
                            onSemestreChange={setCurrentSemester}
                        />
                    </div>

                    {/* Grid */}
                    <div className="flex-1 p-3 md:p-6 lg:pl-3.5 overflow-auto">
                        <div ref={gridContainerRef} className="glass-panel p-3 md:p-6">
                            <ScheduleGrid
                                seccionesSeleccionadas={seccionesSeleccionadas}
                                previewSecciones={previewSecciones}
                            />
                        </div>

                        {/* Leyenda - más compacta en móvil */}
                        <div className="mt-3 md:mt-4 flex items-center gap-2 md:gap-4 justify-center flex-wrap">
                            <span className="text-gray-500 text-xs md:text-sm">Leyenda:</span>
                            <span className="flex items-center gap-1 text-xs md:text-sm">
                                <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-amber-400" />
                                <span className="text-gray-600">Cátedra</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs md:text-sm">
                                <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-sky-400" />
                                <span className="text-gray-600">Lab</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs md:text-sm">
                                <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-emerald-400" />
                                <span className="text-gray-600">Ayud</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs md:text-sm">
                                <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-violet-400" />
                                <span className="text-gray-600">Taller</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs md:text-sm">
                                <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-orange-500" />
                                <span className="text-gray-600">Terreno</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs md:text-sm">
                                <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-red-400" />
                                <span className="text-gray-600">Práctica</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs md:text-sm">
                                <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-red-500 animate-pulse" />
                                <span className="text-gray-600">Conflicto</span>
                            </span>

                            {/* Botón limpiar - solo visible si hay secciones seleccionadas */}
                            {seccionesSeleccionadas.length > 0 && (
                                <button
                                    onClick={handleLimpiarHorario}
                                    className="ml-2 md:ml-4 px-3 py-1 text-xs md:text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-all flex items-center gap-1"
                                >
                                    <span>🗑️</span>
                                    <span className="hidden sm:inline">Limpiar horario</span>
                                    <span className="sm:hidden">Limpiar</span>
                                </button>
                            )}
                        </div>

                        {/* Lista de cursos seleccionados */}
                        <SelectedCoursesList
                            secciones={seccionesSeleccionadas}
                            onRemove={handleToggleSeccion}
                            onSearch={handleSearchAgain}
                        />
                    </div>
                </div>

                {/* GENERATOR TAB */}
                <div className={`w-full h-full ${tab === 'generator' ? 'block' : 'hidden'}`}>
                    <Generator
                        ramos={ramos}
                        onNuevosRamos={handleNuevosRamos}
                        onLimpiarRamos={handleLimpiarRamos}
                        onEliminarRamos={handleEliminarRamos}
                        onAplicarResultado={handleAplicarResultado}
                        semestre={currentSemester}
                        onSemestreChange={setCurrentSemester}
                    />
                </div>

                {/* COMPARE TAB */}
                <div className={`w-full h-full ${tab === 'compare' ? 'block' : 'hidden'}`}>
                    <CompareView
                        slots={slots}
                        activeSlot={activeSlot}
                        onLoadSlot={(slot) => {
                            const snapshot = slots[slot];
                            if (snapshot && confirm(`¿Cargar "${snapshot.name}"?`)) {
                                const ramosMap = new Map(ramos.map(r => [r.sigla, r]));
                                snapshot.ramos.forEach(r => ramosMap.set(r.sigla, r));
                                setRamos(Array.from(ramosMap.values()));
                                setActiveSlot(slot);
                                setSeccionesSeleccionadasIds(new Set(snapshot.seccionesSeleccionadasIds));
                                setPreviewSecciones([]);
                                setTab('planner');
                            }
                        }}
                    />
                </div>
            </main>

            {/* Loading Overlay for Share Import */}
            {
                importingStatus.loading && (
                    <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
                        <div className="bg-gray-900/90 text-white px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-3 border border-gray-700/50">
                            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-medium">{importingStatus.message}</span>
                        </div>
                    </div>
                )
            }

            {/* Vercel Web Analytics */}
            <Analytics />
        </div >
    );
}

export default App;
