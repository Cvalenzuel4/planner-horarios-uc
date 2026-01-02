/**
 * Componente principal para buscar cursos
 * Incluye input de búsqueda, manejo de estado de la API y lista de resultados
 */

import { useState, useEffect } from 'react';
import {
    buscarCursos,
    checkHealth,
    CursoAPI
} from '../../services';
import { CourseCard } from './CourseCard';
import { SeccionConMask, Ramo } from '../../types';

interface CourseSearchProps {
    seccionesSeleccionadasIds: Set<string>;
    onToggleSeccion: (seccion: SeccionConMask) => void;
    onNuevosRamos: (ramos: Ramo[]) => Promise<void>;
    externalSearchRequest?: { term: string; timestamp: number } | null;
    semestre: string;
    onSemestreChange: (semestre: string) => void;
}

export function CourseSearch({ seccionesSeleccionadasIds, onToggleSeccion, onNuevosRamos, externalSearchRequest, semestre, onSemestreChange }: CourseSearchProps) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [apiReady, setApiReady] = useState(false);
    const [results, setResults] = useState<CursoAPI[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    // Reaccionar a búsquedas externas
    useEffect(() => {
        if (externalSearchRequest) {
            setQuery(externalSearchRequest.term);
            // Pequeño timeout para asegurar que el estado se actualice antes de buscar,
            // aunque handleSearch acepta argumento opcional para forzar el término
            handleSearch(externalSearchRequest.term);
        }
    }, [externalSearchRequest]);

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
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 h-[calc(100%-2rem)] m-4 flex flex-col p-6 gap-6 overflow-hidden">
            {/* Barra de Búsqueda */}
            <div className="flex flex-col gap-4">
                {/* Row 1: Input + Semester */}
                <div className="flex flex-row items-center gap-3">
                    {/* Input - toma todo el espacio restante */}
                    <div className="flex-1 min-w-0 relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value.toUpperCase())}
                            onKeyDown={handleKeyDown}
                            placeholder="Ej: ICS2123"
                            className="input-styled pl-11 pr-10 h-10 w-full"
                            style={{ paddingLeft: '44px' }}
                            autoFocus
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        {query && (
                            <button
                                onClick={() => {
                                    setQuery('');
                                    setResults([]);
                                    setSearched(false);
                                    setError(null);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Limpiar búsqueda"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Selector de semestre - ancho automático, no crece */}
                    <select
                        value={semestre}
                        onChange={(e) => onSemestreChange(e.target.value)}
                        className="select-styled h-10 w-auto flex-none text-sm"
                    >
                        <option value="2026-1">2026-1</option>
                        <option value="2025-2">2025-2</option>
                        <option value="2025-1">2025-1</option>
                    </select>
                </div>

                {/* Row 2: Button */}
                <button
                    onClick={() => handleSearch()}
                    disabled={loading || !query.trim()}
                    className={`btn-primary h-10 w-full flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    Conectando con BuscaCursos UC... (puede tardar un poco la primera vez)
                </div>
            )}

            {/* Resultados */}
            <div className="flex-1 overflow-y-auto space-y-4">
                {error && (
                    <div className="glass-panel p-6 text-center border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-900/20">
                        <div className="text-4xl mb-2">😕</div>
                        <h3 className="text-red-600 dark:text-red-400 font-medium mb-1">Algo salió mal</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">{error}</p>
                        {error.includes('no disponible') && (
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">
                                La API de busca cursos podría estar durmiendo. Intenta de nuevo en unos segundos.
                            </p>
                        )}
                    </div>
                )}

                {!loading && searched && results.length === 0 && !error && (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                        <div className="text-4xl mb-3">📭</div>
                        <p>No se encontraron cursos con la sigla "{query}"</p>
                        <p className="text-xs mt-1">Verifica el semestre y la sigla ingresada</p>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 px-1">
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
                    <div className="text-center py-20 text-gray-400 dark:text-gray-500">
                        <div className="text-6xl mb-4 opacity-50 dark:opacity-40 grayscale">🎓</div>
                        <h2 className="text-xl font-medium text-gray-500 dark:text-gray-400 mb-2">Busca tus ramos</h2>
                        <p className="max-w-xs mx-auto text-gray-400 dark:text-gray-500">
                            Ingresa la sigla del curso (ej: MAT1610) para ver horarios disponibles en tiempo real.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
