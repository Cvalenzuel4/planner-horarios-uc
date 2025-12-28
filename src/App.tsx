/**
 * Planificador de Horarios UC - Aplicación Principal
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
    const handleExportar = useCallback(async () => {
        try {
            await descargarDatos();
        } catch (err) {
            alert('Error al exportar: ' + (err as Error).message);
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
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="glass-panel-dark px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                        📅 Planificador de Horarios UC
                    </h1>

                    {/* Tabs */}
                    <nav className="flex gap-1 ml-8">
                        <button
                            onClick={() => setTab('planner')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${tab === 'planner'
                                ? 'bg-white/20 text-white'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            📋 Planificador
                        </button>
                        <button
                            onClick={() => setTab('generator')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${tab === 'generator'
                                ? 'bg-white/20 text-white'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            🔄 Generador
                        </button>
                    </nav>
                </div>

                {/* Botones de Import/Export */}
                <div className="flex gap-2">
                    <button onClick={handleImportar} className="btn-secondary text-sm">
                        📤 Importar
                    </button>
                    <button onClick={handleExportar} className="btn-secondary text-sm">
                        📥 Exportar
                    </button>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 flex overflow-hidden">
                {tab === 'planner' ? (
                    <>
                        {/* Sidebar */}
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

                        {/* Grid */}
                        <div className="flex-1 p-6 overflow-auto">
                            <div className="glass-panel p-6">
                                <ScheduleGrid
                                    seccionesSeleccionadas={seccionesSeleccionadas}
                                    previewSecciones={previewSecciones}
                                />
                            </div>

                            {/* Leyenda */}
                            <div className="mt-4 flex items-center gap-4 justify-center flex-wrap">
                                <span className="text-white/50 text-sm">Leyenda:</span>
                                <span className="flex items-center gap-1 text-sm">
                                    <span className="w-4 h-4 rounded bg-catedra" />
                                    <span className="text-white/70">Cátedra</span>
                                </span>
                                <span className="flex items-center gap-1 text-sm">
                                    <span className="w-4 h-4 rounded bg-laboratorio" />
                                    <span className="text-white/70">Laboratorio</span>
                                </span>
                                <span className="flex items-center gap-1 text-sm">
                                    <span className="w-4 h-4 rounded bg-ayudantia" />
                                    <span className="text-white/70">Ayudantía</span>
                                </span>
                                <span className="flex items-center gap-1 text-sm">
                                    <span className="w-4 h-4 rounded bg-taller" />
                                    <span className="text-white/70">Taller</span>
                                </span>
                                <span className="flex items-center gap-1 text-sm">
                                    <span className="w-4 h-4 rounded bg-red-500 animate-pulse" />
                                    <span className="text-white/70">Conflicto</span>
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Generator sidebar */}
                        <div className="w-96 glass-panel-dark">
                            <Generator
                                ramos={ramos}
                                onPreviewResultado={handlePreviewResultado}
                                onAplicarResultado={handleAplicarResultado}
                                onClearPreview={handleClearPreview}
                            />
                        </div>

                        {/* Grid con preview */}
                        <div className="flex-1 p-6 overflow-auto">
                            <div className="glass-panel p-6">
                                <ScheduleGrid
                                    seccionesSeleccionadas={[]}
                                    previewSecciones={previewSecciones}
                                />
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Modales */}
            {modal.type === 'ramo' && (
                <RamoForm
                    ramo={modal.ramo}
                    onSubmit={handleGuardarRamo}
                    onCancel={() => setModal({ type: 'none' })}
                    existingSiglas={ramos.map(r => r.sigla)}
                />
            )}

            {modal.type === 'seccion' && modal.sigla && (
                <SeccionForm
                    sigla={modal.sigla}
                    seccion={modal.seccion}
                    siguienteNumero={getSiguienteNumeroSeccion(modal.sigla)}
                    onSubmit={handleGuardarSeccion}
                    onCancel={() => setModal({ type: 'none' })}
                />
            )}
        </div>
    );
}

export default App;
