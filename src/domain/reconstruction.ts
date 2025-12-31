
import { buscarCursos, buscarMultiplesCursos } from '../services/buscacursos.service';
import { SharedPlanV1 } from './share';
import { Ramo } from '../types';

export interface ReconstructionResult {
    ramos: Ramo[];
    selectedIds: string[];
    errors: string[];
}

// Cache simple en memoria para evitar re-fetching de la misma sigla+semestre en la misma sesión
const reconstructionCache = new Map<string, Ramo>();

/**
 * Reconstruye el horario completo a partir del snapshot mínimo.
 * 1. Identifica las siglas únicas.
 * 2. Consulta la API usando el endpoint batch optimizado.
 * 3. Recupera los objetos Ramo completos.
 * 4. Mapea la selección (sigla, número) a los IDs internos de las secciones.
 */
export async function reconstructSchedule(
    snapshot: SharedPlanV1,
    onProgress?: (message: string) => void
): Promise<ReconstructionResult> {
    const { sem, p } = snapshot;
    const errors: string[] = [];

    // 1. Extraer siglas únicas
    const allSiglas = Array.from(new Set(p.map(pair => pair[0])));

    if (allSiglas.length === 0) {
        return { ramos: [], selectedIds: [], errors: [] };
    }

    const ramosEncontrados: Ramo[] = [];

    // 2. Separar siglas en cache vs. a buscar
    const siglasEnCache: string[] = [];
    const siglasFaltantes: string[] = [];

    for (const sigla of allSiglas) {
        const cacheKey = `${sem}|${sigla}`;
        if (reconstructionCache.has(cacheKey)) {
            siglasEnCache.push(sigla);
            ramosEncontrados.push(reconstructionCache.get(cacheKey)!);
        } else {
            siglasFaltantes.push(sigla);
        }
    }

    // 3. Fetch de siglas faltantes usando endpoint batch o individual
    if (siglasFaltantes.length > 0) {
        if (onProgress) onProgress(`Cargando ${siglasFaltantes.length} curso(s)...`);

        if (siglasFaltantes.length >= 2) {
            // Usar endpoint batch optimizado
            const resultado = await buscarMultiplesCursos(siglasFaltantes, sem);

            if (resultado.success) {
                for (const [sigla, ramos] of resultado.resultados) {
                    // Buscar el ramo exacto por sigla
                    const ramo = ramos.find(r => r.sigla === sigla);
                    if (ramo) {
                        const cacheKey = `${sem}|${sigla}`;
                        reconstructionCache.set(cacheKey, ramo);
                        ramosEncontrados.push(ramo);
                    } else if (ramos.length > 0) {
                        // Si no encontramos match exacto, usar el primero
                        const cacheKey = `${sem}|${sigla}`;
                        reconstructionCache.set(cacheKey, ramos[0]);
                        ramosEncontrados.push(ramos[0]);
                    }
                }

                // Registrar errores individuales
                for (const [sigla, error] of Object.entries(resultado.erroresPorSigla)) {
                    errors.push(`${sigla}: ${error}`);
                }
            } else {
                // Fallback a búsqueda secuencial si batch falla
                console.warn('[reconstructSchedule] Batch endpoint failed, falling back to sequential');
                for (const sigla of siglasFaltantes) {
                    if (onProgress) onProgress(`Cargando ${sigla}...`);
                    try {
                        const result = await buscarCursos(sigla, sem);
                        if (result.success && result.ramos.length > 0) {
                            const ramo = result.ramos.find(r => r.sigla === sigla) || result.ramos[0];
                            const cacheKey = `${sem}|${sigla}`;
                            reconstructionCache.set(cacheKey, ramo);
                            ramosEncontrados.push(ramo);
                        } else {
                            errors.push(`No se encontró el curso ${sigla}`);
                        }
                    } catch {
                        errors.push(`Error al cargar ${sigla}`);
                    }
                }
            }
        } else {
            // Solo 1 sigla faltante: usar endpoint individual
            const sigla = siglasFaltantes[0];
            if (onProgress) onProgress(`Cargando ${sigla}...`);

            try {
                const result = await buscarCursos(sigla, sem);
                if (result.success && result.ramos.length > 0) {
                    const ramo = result.ramos.find(r => r.sigla === sigla) || result.ramos[0];
                    const cacheKey = `${sem}|${sigla}`;
                    reconstructionCache.set(cacheKey, ramo);
                    ramosEncontrados.push(ramo);
                } else {
                    errors.push(`No se encontró el curso ${sigla}`);
                }
            } catch {
                errors.push(`Error al cargar ${sigla}`);
            }
        }
    }

    if (onProgress) onProgress('Reconstruyendo selección...');

    // 4. Reconstruir selección (IDs)
    // El snapshot tiene pares [sigla, numero].
    // Necesitamos encontrar el ID de la sección que corresponda a ese número dentro del Ramo cargado.
    const restoredSelectedIds: string[] = [];

    // Mapa rápido de ramos cargados
    const ramosMap = new Map<string, Ramo>();
    ramosEncontrados.forEach(r => ramosMap.set(r.sigla, r));

    p.forEach(([sigla, numStr]) => {
        const ramo = ramosMap.get(sigla);
        if (!ramo) return; // Si falló la carga del curso, no podemos seleccionar su sección

        // Buscar la sección que coincida con el número.
        // La API devuelve section numbers como int, pero aquí lo tenemos como string.
        const seccion = ramo.secciones.find(s => String(s.numero) === numStr);

        if (seccion) {
            restoredSelectedIds.push(seccion.id);
        } else {
            // Intento secundario: a veces el ID es "SIGLA-NUMERO"
            const candidateId = `${sigla}-${numStr}`;
            const seccionById = ramo.secciones.find(s => s.id === candidateId);
            if (seccionById) {
                restoredSelectedIds.push(seccionById.id);
            } else {
                errors.push(`Sección ${numStr} de ${sigla} no encontrada.`);
            }
        }
    });

    return {
        ramos: ramosEncontrados,
        selectedIds: restoredSelectedIds,
        errors
    };
}
