/**
 * Planificador de Horarios UC - Aplicación Principal
 */

import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { Ramo, Seccion, SeccionConMask } from './types';
import { prepararRamo } from './core/bitmask';
import {
    initDatabase,
    obtenerTodosRamos,
    agregarRamo,
    actualizarRamo,
    eliminarRamo,
    agregarSeccion,
    actualizarSeccion,
    eliminarSeccion,
    obtenerConfig,
    actualizarSeccionesSeleccionadas,
    descargarDatos,
    subirDatos,
} from './db';
import {
    ScheduleGrid,
    Sidebar,
    RamoForm,
    SeccionForm,
    Generator,
} from './components';
import { datosIniciales } from './data';
import { exportarHorarioExcel } from './utils/excelExport';

type Tab = 'planner' | 'generator';
type Modal = 'none' | 'ramo' | 'seccion';

interface ModalState {
    type: Modal;
    sigla?: string;
    seccionId?: string;
    ramo?: Ramo;
    seccion?: Seccion;
}

function App() {
    // Estado de datos
    const [ramos, setRamos] = useState<Ramo[]>([]);
    const [seccionesSeleccionadasIds, setSeccionesSeleccionadasIds] = useState<Set<string>>(new Set());
    const [previewSecciones, setPreviewSecciones] = useState<SeccionConMask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estado de UI
    const [tab, setTab] = useState<Tab>('planner');
    const [modal, setModal] = useState<ModalState>({ type: 'none' });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [gridHeight, setGridHeight] = useState<number | null>(null);

    // Ref para medir la altura del grid
    const gridContainerRef = useRef<HTMLDivElement>(null);

    // Cargar datos iniciales
    useEffect(() => {
        const init = async () => {
            try {
                await initDatabase();
                let ramosData = await obtenerTodosRamos();

                // Si no hay datos, cargar los datos iniciales
                if (ramosData.length === 0 && datosIniciales.ramos.length > 0) {
                    console.log('Cargando datos iniciales...');
                    for (const ramo of datosIniciales.ramos) {
                        await agregarRamo(ramo);
                    }
                    ramosData = await obtenerTodosRamos();
                }

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

    // Handlers de CRUD
    const handleAgregarRamo = useCallback(() => {
        setModal({ type: 'ramo' });
    }, []);

    const handleEditarRamo = useCallback((ramo: Ramo) => {
        setModal({ type: 'ramo', ramo });
    }, []);

    const handleEliminarRamo = useCallback(async (sigla: string) => {
        try {
            await eliminarRamo(sigla);
            setRamos(prev => prev.filter(r => r.sigla !== sigla));
            // Eliminar secciones seleccionadas de este ramo
            setSeccionesSeleccionadasIds(prev => {
                const nuevas = new Set(prev);
                for (const id of prev) {
                    if (id.startsWith(sigla + '-')) {
                        nuevas.delete(id);
                    }
                }
                return nuevas;
            });
        } catch (err) {
            alert('Error al eliminar: ' + (err as Error).message);
        }
    }, []);

    const handleGuardarRamo = useCallback(async (ramo: Ramo) => {
        try {
            const existe = ramos.find(r => r.sigla === ramo.sigla);
            if (existe) {
                await actualizarRamo(ramo);
                setRamos(prev => prev.map(r => r.sigla === ramo.sigla ? ramo : r));
            } else {
                await agregarRamo(ramo);
                setRamos(prev => [...prev, ramo]);
            }
            setModal({ type: 'none' });
        } catch (err) {
            alert('Error al guardar: ' + (err as Error).message);
        }
    }, [ramos]);

    const handleAgregarSeccion = useCallback((sigla: string) => {
        const ramo = ramos.find(r => r.sigla === sigla);
        if (ramo) {
            setModal({ type: 'seccion', sigla });
        }
    }, [ramos]);

    const handleEditarSeccion = useCallback((sigla: string, seccionId: string) => {
        const ramo = ramos.find(r => r.sigla === sigla);
        const seccion = ramo?.secciones.find(s => s.id === seccionId);
        if (ramo && seccion) {
            setModal({ type: 'seccion', sigla, seccionId, seccion });
        }
    }, [ramos]);

    const handleEliminarSeccion = useCallback(async (sigla: string, seccionId: string) => {
        try {
            await eliminarSeccion(sigla, seccionId);
            setRamos(prev => prev.map(r => {
                if (r.sigla === sigla) {
                    return { ...r, secciones: r.secciones.filter(s => s.id !== seccionId) };
                }
                return r;
            }));
            setSeccionesSeleccionadasIds(prev => {
                const nuevas = new Set(prev);
                nuevas.delete(seccionId);
                return nuevas;
            });
        } catch (err) {
            alert('Error al eliminar sección: ' + (err as Error).message);
        }
    }, []);

    const handleGuardarSeccion = useCallback(async (seccion: Seccion) => {
        const sigla = modal.sigla!;
        try {
            const ramo = ramos.find(r => r.sigla === sigla);
            if (!ramo) throw new Error('Ramo no encontrado');

            const existe = ramo.secciones.find(s => s.id === seccion.id);
            if (existe) {
                await actualizarSeccion(sigla, seccion);
                setRamos(prev => prev.map(r => {
                    if (r.sigla === sigla) {
                        return {
                            ...r,
                            secciones: r.secciones.map(s => s.id === seccion.id ? seccion : s),
                        };
                    }
                    return r;
                }));
            } else {
                await agregarSeccion(sigla, seccion);
                setRamos(prev => prev.map(r => {
                    if (r.sigla === sigla) {
                        return { ...r, secciones: [...r.secciones, seccion] };
                    }
                    return r;
                }));
            }
            setModal({ type: 'none' });
        } catch (err) {
            alert('Error al guardar sección: ' + (err as Error).message);
        }
    }, [modal.sigla, ramos]);

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
    const handlePreviewResultado = useCallback((secciones: SeccionConMask[]) => {
        setPreviewSecciones(secciones);
    }, []);

    const handleClearPreview = useCallback(() => {
        setPreviewSecciones([]);
    }, []);

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

    // Obtener siguiente número de sección
    const getSiguienteNumeroSeccion = useCallback((sigla: string) => {
        const ramo = ramos.find(r => r.sigla === sigla);
        if (!ramo || ramo.secciones.length === 0) return 1;
        return Math.max(...ramo.secciones.map(s => s.numero)) + 1;
    }, [ramos]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="loader mx-auto mb-4" />
                    <p className="text-white/70">Cargando...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md glass-panel p-8">
                    <p className="text-4xl mb-4">⚠️</p>
                    <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
                    <p className="text-white/70">{error}</p>
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
            <header className="glass-panel-dark px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    {/* Botón hamburguesa para móvil */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
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

                    <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent truncate">
                        <span className="hidden sm:inline">📅 Planificador de Horarios UC</span>
                        <span className="sm:hidden">📅 Horarios UC</span>
                    </h1>

                    {/* Tabs - ocultos en móvil pequeño, visibles como iconos en tablets */}
                    <nav className="hidden md:flex gap-1 ml-4 lg:ml-8">
                        <button
                            onClick={() => { setTab('planner'); setSidebarOpen(false); }}
                            className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all text-sm lg:text-base ${tab === 'planner'
                                ? 'bg-white/20 text-white'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            📋 <span className="hidden lg:inline">Planificador</span>
                        </button>
                        <button
                            onClick={() => { setTab('generator'); setSidebarOpen(false); }}
                            className={`px-3 lg:px-4 py-2 rounded-lg font-medium transition-all text-sm lg:text-base ${tab === 'generator'
                                ? 'bg-white/20 text-white'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
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
            <div className="md:hidden flex glass-panel-dark border-t border-white/10">
                <button
                    onClick={() => { setTab('planner'); setSidebarOpen(false); }}
                    className={`flex-1 px-4 py-3 font-medium transition-all text-sm ${tab === 'planner'
                        ? 'bg-white/20 text-white'
                        : 'text-white/60'
                        }`}
                >
                    📋 Planificador
                </button>
                <button
                    onClick={() => { setTab('generator'); setSidebarOpen(false); }}
                    className={`flex-1 px-4 py-3 font-medium transition-all text-sm ${tab === 'generator'
                        ? 'bg-white/20 text-white'
                        : 'text-white/60'
                        }`}
                >
                    🔄 Generador
                </button>
            </div>

            {/* Main content */}
            <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
                {tab === 'planner' ? (
                    <>
                        {/* Overlay para cerrar sidebar en móvil */}
                        {sidebarOpen && (
                            <div
                                className="lg:hidden fixed inset-0 bg-black/50 z-30"
                                onClick={() => setSidebarOpen(false)}
                            />
                        )}

                        {/* Sidebar - drawer en móvil, fijo en desktop */}
                        <div
                            className={`
                                fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto
                                transform transition-transform duration-300 ease-in-out
                                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                                flex-shrink-0 lg:h-full max-h-[100vh] lg:max-h-full
                                p-3 md:p-6 pr-0 md:pr-0
                            `}
                            style={gridHeight ? { height: `${gridHeight}px` } : undefined}
                        >
                            <Sidebar
                                ramos={ramos}
                                seccionesSeleccionadas={seccionesSeleccionadas}
                                onToggleSeccion={handleToggleSeccion}
                                onAgregarRamo={handleAgregarRamo}
                                onEditarRamo={handleEditarRamo}
                                onEliminarRamo={handleEliminarRamo}
                                onAgregarSeccion={handleAgregarSeccion}
                                onEditarSeccion={handleEditarSeccion}
                                onEliminarSeccion={handleEliminarSeccion}
                            />
                        </div>

                        {/* Grid */}
                        <div className="flex-1 p-3 md:p-6 overflow-auto">
                            <div ref={gridContainerRef} className="glass-panel p-3 md:p-6">
                                <ScheduleGrid
                                    seccionesSeleccionadas={seccionesSeleccionadas}
                                    previewSecciones={previewSecciones}
                                />
                            </div>

                            {/* Leyenda - más compacta en móvil */}
                            <div className="mt-3 md:mt-4 flex items-center gap-2 md:gap-4 justify-center flex-wrap">
                                <span className="text-white/50 text-xs md:text-sm">Leyenda:</span>
                                <span className="flex items-center gap-1 text-xs md:text-sm">
                                    <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-catedra" />
                                    <span className="text-white/70">Cátedra</span>
                                </span>
                                <span className="flex items-center gap-1 text-xs md:text-sm">
                                    <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-laboratorio" />
                                    <span className="text-white/70">Lab</span>
                                </span>
                                <span className="flex items-center gap-1 text-xs md:text-sm">
                                    <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-ayudantia" />
                                    <span className="text-white/70">Ayud</span>
                                </span>
                                <span className="flex items-center gap-1 text-xs md:text-sm">
                                    <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-taller" />
                                    <span className="text-white/70">Taller</span>
                                </span>
                                <span className="flex items-center gap-1 text-xs md:text-sm">
                                    <span className="w-3 h-3 md:w-4 md:h-4 rounded bg-red-500 animate-pulse" />
                                    <span className="text-white/70">Conflicto</span>
                                </span>

                                {/* Botón limpiar - solo visible si hay secciones seleccionadas */}
                                {seccionesSeleccionadas.length > 0 && (
                                    <button
                                        onClick={handleLimpiarHorario}
                                        className="ml-2 md:ml-4 px-3 py-1 text-xs md:text-sm bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg border border-red-500/30 transition-all flex items-center gap-1"
                                    >
                                        <span>🗑️</span>
                                        <span className="hidden sm:inline">Limpiar horario</span>
                                        <span className="sm:hidden">Limpiar</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                        {/* Generator panel - full width en móvil, sidebar en desktop */}
                        <div className="w-full lg:w-96 glass-panel-dark flex-shrink-0 max-h-[40vh] lg:max-h-full overflow-auto">
                            <Generator
                                ramos={ramos}
                                onPreviewResultado={handlePreviewResultado}
                                onAplicarResultado={handleAplicarResultado}
                                onClearPreview={handleClearPreview}
                            />
                        </div>

                        {/* Grid con preview */}
                        <div className="flex-1 p-3 md:p-6 overflow-auto">
                            <div className="glass-panel p-3 md:p-6">
                                <ScheduleGrid
                                    seccionesSeleccionadas={[]}
                                    previewSecciones={previewSecciones}
                                />
                            </div>
                        </div>
                    </div>
                )
                }
            </main >

            {/* Modales */}
            {
                modal.type === 'ramo' && (
                    <RamoForm
                        ramo={modal.ramo}
                        onSubmit={handleGuardarRamo}
                        onCancel={() => setModal({ type: 'none' })}
                        existingSiglas={ramos.map(r => r.sigla)}
                    />
                )
            }

            {
                modal.type === 'seccion' && modal.sigla && (
                    <SeccionForm
                        sigla={modal.sigla}
                        seccion={modal.seccion}
                        siguienteNumero={getSiguienteNumeroSeccion(modal.sigla)}
                        onSubmit={handleGuardarSeccion}
                        onCancel={() => setModal({ type: 'none' })}
                    />
                )
            }
        </div >
    );
}

export default App;
