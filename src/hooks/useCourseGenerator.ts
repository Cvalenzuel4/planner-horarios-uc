/**
 * Custom hook para el Generador de Horarios
 * Maneja la carga de cursos desde la API para múltiples siglas
 */

import { useState, useCallback } from 'react';
import { Ramo } from '../types';
import { buscarCursos } from '../services';

export interface FetchProgress {
    current: number;
    total: number;
    currentSigla: string;
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
}

/**
 * Hook para manejar la carga de cursos desde la API
 * Usa Promise.allSettled para manejar errores individuales sin fallar todo
 */
export function useCourseGenerator(): UseCourseGeneratorReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState<FetchProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cursosAPI, setCursosAPI] = useState<Ramo[]>([]);
    const [erroresPorSigla, setErroresPorSigla] = useState<Record<string, string>>({});

    /**
     * Busca cursos para múltiples siglas y los ACUMULA con los existentes
     * Reporta errores por sigla individual sin fallar el proceso completo
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
        // Mantener errores anteriores y agregar nuevos
        const erroresNuevos: Record<string, string> = {};

        try {
            const nuevosRamos: Ramo[] = [];

            // Procesar siglas secuencialmente para mostrar progreso
            for (let i = 0; i < siglasLimpias.length; i++) {
                const sigla = siglasLimpias[i];

                setLoadingProgress({
                    current: i + 1,
                    total: siglasLimpias.length,
                    currentSigla: sigla,
                });

                const resultado = await buscarCursos(sigla, semestre);

                if (resultado.success) {
                    // Agregar ramos encontrados
                    for (const ramo of resultado.ramos) {
                        nuevosRamos.push(ramo);
                    }
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
    }, []);

    /**
     * Limpia los cursos cargados desde la API
     */
    const clearCourses = useCallback(() => {
        setCursosAPI([]);
        setErroresPorSigla({});
        setError(null);
    }, []);

    return {
        isLoading,
        loadingProgress,
        error,
        cursosAPI,
        erroresPorSigla,
        fetchAllCourses,
        clearCourses,
    };
}
