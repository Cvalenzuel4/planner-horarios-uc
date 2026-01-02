/**
 * Custom hook para el Generador de Horarios
 * Maneja la carga de cursos desde la API para múltiples siglas
 */

import { useState, useCallback } from 'react';
import { Ramo } from '../types';
import { buscarCursos, buscarMultiplesCursos } from '../services';

export interface FetchProgress {
    current: number;
    total: number;
    currentSigla: string;
}

export interface UseCourseGeneratorProps {
    onCacheRamos?: (ramos: Ramo[]) => void;
}

export interface UseCourseGeneratorReturn {
    // Estado
    isLoading: boolean;
    loadingProgress: FetchProgress | null;
    error: string | null;
    cursosAPI: Ramo[];
    erroresPorSigla: Record<string, string>;

    // Acciones
    fetchAllCourses: (siglas: string[], semestre?: string) => Promise<Ramo[]>;
    clearCourses: () => void;
    removeCourses: (siglas: string[]) => void;
}

/**
 * Hook para manejar la carga de cursos desde la API
 * Usa el endpoint batch para múltiples siglas (optimizado)
 */
export function useCourseGenerator({ onCacheRamos }: UseCourseGeneratorProps = {}): UseCourseGeneratorReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState<FetchProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cursosAPI, setCursosAPI] = useState<Ramo[]>([]);
    const [erroresPorSigla, setErroresPorSigla] = useState<Record<string, string>>({});

    /**
     * Busca cursos para múltiples siglas y los ACUMULA con los existentes
     * Usa endpoint batch optimizado cuando hay 2+ siglas
     */
    const fetchAllCourses = useCallback(async (siglas: string[], semestre?: string) => {
        // Limpiar y validar siglas
        const siglasLimpias = siglas
            .map(s => s.trim().toUpperCase())
            .filter(s => s.length > 0);

        if (siglasLimpias.length === 0) {
            setError('Ingresa al menos una sigla válida');
            return [];
        }

        // Iniciar carga (NO borramos cursosAPI existentes)
        setIsLoading(true);
        setError(null);

        try {
            const nuevosRamos: Ramo[] = [];
            const erroresNuevos: Record<string, string> = {};

            // Usar endpoint batch si hay 2+ siglas (optimizado en servidor)
            if (siglasLimpias.length >= 2) {
                setLoadingProgress({
                    current: 0,
                    total: siglasLimpias.length,
                    currentSigla: 'Cargando cursos...',
                });

                const resultado = await buscarMultiplesCursos(siglasLimpias, semestre);

                if (resultado.success) {
                    // Extraer ramos del Map
                    for (const [, ramos] of resultado.resultados) {
                        nuevosRamos.push(...ramos);
                    }
                    // Copiar errores individuales
                    Object.assign(erroresNuevos, resultado.erroresPorSigla);
                } else {
                    // Fallback: endpoint batch falló, intentar individual
                    console.warn('[useCourseGenerator] Batch endpoint failed, falling back to sequential');
                    for (let i = 0; i < siglasLimpias.length; i++) {
                        const sigla = siglasLimpias[i];
                        setLoadingProgress({
                            current: i + 1,
                            total: siglasLimpias.length,
                            currentSigla: sigla,
                        });

                        const res = await buscarCursos(sigla, semestre);
                        if (res.success) {
                            nuevosRamos.push(...res.ramos);
                        } else {
                            erroresNuevos[sigla] = res.message;
                        }
                    }
                }

                setLoadingProgress({
                    current: siglasLimpias.length,
                    total: siglasLimpias.length,
                    currentSigla: 'Completado',
                });
            } else {
                // Una sola sigla: usar endpoint individual
                const sigla = siglasLimpias[0];
                setLoadingProgress({
                    current: 1,
                    total: 1,
                    currentSigla: sigla,
                });

                const resultado = await buscarCursos(sigla, semestre);

                if (resultado.success) {
                    nuevosRamos.push(...resultado.ramos);
                } else {
                    erroresNuevos[sigla] = resultado.message;
                }
            }

            // ACUMULAR con cursos existentes (usar functional setState)
            setCursosAPI(cursosExistentes => {
                const ramosMap = new Map<string, Ramo>();

                // Primero agregar existentes
                for (const ramo of cursosExistentes) {
                    ramosMap.set(ramo.sigla, ramo);
                }

                // Luego agregar/sobrescribir con nuevos (datos más frescos)
                for (const ramo of nuevosRamos) {
                    ramosMap.set(ramo.sigla, ramo);
                }

                return Array.from(ramosMap.values());
            });

            // Sincronizar con caché externo si existe
            if (onCacheRamos && nuevosRamos.length > 0) {
                onCacheRamos(nuevosRamos);
            }

            setErroresPorSigla(prev => ({ ...prev, ...erroresNuevos }));

            // Error general solo si no se cargó nada nuevo
            if (nuevosRamos.length === 0 && Object.keys(erroresNuevos).length > 0) {
                setError('No se pudieron cargar los cursos solicitados.');
            }

            return nuevosRamos;
        } catch (err) {
            setError(`Error inesperado: ${err instanceof Error ? err.message : 'desconocido'}`);
            return [];
        } finally {
            setIsLoading(false);
            setLoadingProgress(null);
        }
    }, [onCacheRamos]);

    /**
     * Limpia los cursos cargados desde la API
     */
    const clearCourses = useCallback(() => {
        setCursosAPI([]);
        setErroresPorSigla({});
        setError(null);
    }, []);

    const removeCourses = useCallback((siglas: string[]) => {
        const setSiglas = new Set(siglas);
        setCursosAPI(prev => prev.filter(ramo => !setSiglas.has(ramo.sigla)));
    }, []);

    return {
        isLoading,
        loadingProgress,
        error,
        cursosAPI,
        erroresPorSigla,
        fetchAllCourses,
        clearCourses,
        removeCourses,
    };
}
