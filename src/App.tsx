/**
 * Planificador de Horarios UC - Aplicación Principal
 */

import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { Ramo, SeccionConMask } from './types';
import { prepararRamo } from './core/bitmask';
import {
    initDatabase,
    obtenerTodosRamos,
    agregarRamo,
    actualizarRamo,
    obtenerConfig,
    actualizarSeccionesSeleccionadas,
    descargarDatos,
    subirDatos,
    limpiarTodosRamos,
} from './db';
import {
    ScheduleGrid,
    Generator,
    CourseSearch
} from './components';
import { checkHealth } from './services';
import { exportarHorarioExcel } from './utils/excelExport';

type Tab = 'planner' | 'generator';

function App() {
    // Estado de datos
    const [ramos, setRamos] = useState<Ramo[]>([]);
    const [seccionesSeleccionadasIds, setSeccionesSeleccionadasIds] = useState<Set<string>>(new Set());
    const [previewSecciones, setPreviewSecciones] = useState<SeccionConMask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estado de UI
    const [tab, setTab] = useState<Tab>('planner');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [gridHeight, setGridHeight] = useState<number | null>(null);

    // Ref para medir la altura del grid
    const gridContainerRef = useRef<HTMLDivElement>(null);

    // Health check al inicio para despertar la API
    useEffect(() => {
        checkHealth();
    }, []);

    // Cargar datos iniciales
    useEffect(() => {
        const init = async () => {
            try {
                await initDatabase();
                const ramosData = await obtenerTodosRamos();
                setRamos(ramosData);

                const config = await obtenerConfig();
                if (config?.seccionesSeleccionadas) {
                    setSeccionesSeleccionadasIds(new Set(config.seccionesSeleccionadas));
                }
            } catch (err) {
                setError('Error al cargar la base de datos: ' + (err as Error).message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // Guardar secciones seleccionadas cuando cambien
    useEffect(() => {
        if (!loading) {
            actualizarSeccionesSeleccionadas(Array.from(seccionesSeleccionadasIds));
        }
    }, [seccionesSeleccionadasIds, loading]);

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
                const index = actualizados.findIndex(r => r.sigla === nuevoRamo.sigla);
                if (index >= 0) {
                    // Actualizar existente si es diferente?
                    // Por simplicidad, asumimos que la API manda la info más reciente
                    // y actualizamos siempre
                    actualizados[index] = nuevoRamo;
                    await actualizarRamo(nuevoRamo);
                    cambio = true;
                } else {
                    // Agregar nuevo
                    actualizados.push(nuevoRamo);
                    await agregarRamo(nuevoRamo);
                    cambio = true;
                }
            }

            if (cambio) {
                setRamos(actualizados);
            }
        } catch (err) {
            console.error('Error al guardar nuevos ramos:', err);
        }
    }, [ramos]);

    const handleToggleSeccion = useCallback((seccion: SeccionConMask) => {
        setSeccionesSeleccionadasIds(prev => {
            const nuevas = new Set(prev);
            if (nuevas.has(seccion.id)) {
                nuevas.delete(seccion.id);
            } else {
                nuevas.add(seccion.id);
            }
            return nuevas;
        });
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
                    const ramosData = await obtenerTodosRamos();
                    setRamos(ramosData);
                    const config = await obtenerConfig();
                    if (config?.seccionesSeleccionadas) {
                        setSeccionesSeleccionadasIds(new Set(config.seccionesSeleccionadas));
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
            await limpiarTodosRamos();
            setRamos([]);
            setSeccionesSeleccionadasIds(new Set());
        } catch (err) {
            console.error('Error al limpiar ramos:', err);
        }
    }, []);

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
            <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2 shadow-sm">
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
                    </nav>
                </div>

                {/* Botones de Import/Export */}
                <div className="flex gap-1 md:gap-2 flex-shrink-0">
                    <button onClick={handleImportar} className="btn-secondary text-xs md:text-sm px-2 md:px-4" title="Importar datos desde JSON">
                        <span className="hidden sm:inline">📥 Importar</span>
                        <span className="sm:hidden">📥</span>
                    </button>
                    <button onClick={handleExportarJSON} className="btn-secondary text-xs md:text-sm px-2 md:px-4" title="Exportar todos los datos a JSON">
                        <span className="hidden lg:inline">💾 JSON</span>
                        <span className="lg:hidden">💾</span>
                    </button>
                    <button onClick={handleExportarExcel} className="btn-secondary text-xs md:text-sm px-2 md:px-4" title="Exportar horario visual a Excel">
                        <span className="hidden lg:inline">📄 Excel</span>
                        <span className="lg:hidden">📄</span>
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
            </div>

            {/* Main content */}
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
                    </div>
                </div>

                {/* GENERATOR TAB */}
                <div className={`w-full h-full ${tab === 'generator' ? 'block' : 'hidden'}`}>
                    <Generator
                        ramos={ramos}
                        onNuevosRamos={handleNuevosRamos}
                        onLimpiarRamos={handleLimpiarRamos}
                        onAplicarResultado={handleAplicarResultado}
                    />
                </div>
            </main>
        </div>
    );
}

export default App;
