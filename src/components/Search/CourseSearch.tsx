/**
 * Componente principal para buscar cursos
 * Incluye input de búsqueda, manejo de estado de la API y lista de resultados
 */

import { useState, useEffect } from 'react';
import {
    buscarCursos,
    checkHealth,
    CursoAPI,
    SEMESTRE_ACTUAL
} from '../../services';
import { CourseCard } from './CourseCard';
import { SeccionConMask, Ramo } from '../../types';

interface CourseSearchProps {
    seccionesSeleccionadasIds: Set<string>;
    onToggleSeccion: (seccion: SeccionConMask) => void;
    onNuevosRamos: (ramos: Ramo[]) => void;
}

export function CourseSearch({ seccionesSeleccionadasIds, onToggleSeccion, onNuevosRamos }: CourseSearchProps) {
    const [query, setQuery] = useState('');
    const [semestre, setSemestre] = useState(SEMESTRE_ACTUAL);
    const [loading, setLoading] = useState(false);
    const [apiReady, setApiReady] = useState(false);
    const [results, setResults] = useState<CursoAPI[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);



    // Health check al montar
    useEffect(() => {
        const init = async () => {
            // Verificar estado sin bloquear UI
            const status = await checkHealth();
            if (status.isReady) {
                setApiReady(true);
            }
        };
        init();
    }, []);

    const handleSearch = async (forceQuery?: string) => {
        const q = forceQuery !== undefined ? forceQuery : query;
        if (!q.trim()) return;

        setLoading(true);
        setError(null);
        setSearched(true);
        setResults([]);

        const resultado = await buscarCursos(q, semestre);

        if (resultado.success) {
            setResults(resultado.cursosAPI);
            setApiReady(true);
            // Notificar al padre los ramos encontrados para que los guarde
            if (resultado.ramos.length > 0) {
                onNuevosRamos(resultado.ramos);
            }
        } else {
            setError(resultado.message);
        }
        setLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Debounce opcional si quisieramos búsqueda instantánea, 
    // pero como es API externa mejor onEnter o click

    return (
        <div className="flex flex-col h-full bg-slate-900/50">
            {/* Barra de Búsqueda */}
            <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value.toUpperCase())}
                        onKeyDown={handleKeyDown}
                        placeholder="Ej: ICS2123"
                        className="input-styled pl-10 h-10 w-full"
                        autoFocus
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                        🔍
                    </div>
                </div>

                <div className="w-full sm:w-32">
                    <select
                        value={semestre}
                        onChange={(e) => setSemestre(e.target.value)}
                        className="select-styled h-10 w-full text-sm"
                    >
                        <option value="2026-1">2026-1</option>
                        <option value="2025-2">2025-2</option>
                        <option value="2025-1">2025-1</option>
                    </select>
                </div>

                <button
                    onClick={() => handleSearch()}
                    disabled={loading || !query.trim()}
                    className={`btn-primary h-10 md:w-24 flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        'Buscar'
                    )}
                </button>
            </div>

            {/* Estado API Cold Start */}
            {!apiReady && !loading && !searched && (
                <div className="px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20 text-indigo-200 text-xs flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    Conectando con BuscaCursos UC... (puede tardar un poco la primera vez)
                </div>
            )}

            {/* Resultados */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {error && (
                    <div className="glass-panel p-6 text-center border-red-500/30 bg-red-500/10">
                        <div className="text-4xl mb-2">😕</div>
                        <h3 className="text-red-300 font-medium mb-1">Algo salió mal</h3>
                        <p className="text-white/60 text-sm">{error}</p>
                        {error.includes('no disponible') && (
                            <p className="text-white/40 text-xs mt-2">
                                La API de busca cursos podría estar durmiendo. Intenta de nuevo en unos segundos.
                            </p>
                        )}
                    </div>
                )}

                {!loading && searched && results.length === 0 && !error && (
                    <div className="text-center py-12 text-white/40">
                        <div className="text-4xl mb-3">📭</div>
                        <p>No se encontraron cursos con la sigla "{query}"</p>
                        <p className="text-xs mt-1">Verifica el semestre y la sigla ingresada</p>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-white/50 px-1">
                            <span>{results.length} secciones encontradas</span>
                            <span>{results[0].nombre}</span>
                        </div>
                        {results.map((curso) => (
                            <CourseCard
                                key={curso.nrc}
                                curso={curso}
                                seccionesSeleccionadasIds={seccionesSeleccionadasIds}
                                onToggleSeccion={onToggleSeccion}
                            />
                        ))}
                    </div>
                )}

                {!searched && !loading && (
                    <div className="text-center py-20 text-white/20">
                        <div className="text-6xl mb-4 opacity-50">🎓</div>
                        <h2 className="text-xl font-medium text-white/40 mb-2">Busca tus ramos</h2>
                        <p className="max-w-xs mx-auto">
                            Ingresa la sigla del curso (ej: MAT1610) para ver horarios disponibles en tiempo real.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
