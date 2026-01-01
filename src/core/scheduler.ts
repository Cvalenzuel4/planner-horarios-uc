/**
 * Algoritmo de generación de horarios usando Backtracking
 * 
 * Genera todas las combinaciones válidas de secciones que no tienen conflictos.
 * Usa optimización de poda temprana ordenando ramos por cantidad de secciones.
 * Soporta permisos de tope para permitir conflictos en actividades específicas.
 * 
 * When results = 0, provides conflict diagnostics showing the top 3 pairs
 * of courses causing the most conflicts.
 */

import { Ramo, SeccionConMask, ResultadoGeneracion, PermisosTopeMap, TipoActividad, getPermisoTopeKey } from '../types';
import { hasConflict, prepararRamo, actividadToMask, indexToBloque } from './bitmask';
import {
    ConflictStats,
    ConflictHit,
    TopPairResult,
    createConflictStats,
    recordConflict,
    buildTopPairs,
    normalizeSectionId,
} from './conflictStats';

/** Límite máximo de combinaciones a generar */
const MAX_RESULTADOS = 500;

/**
 * Extended result type that includes conflict diagnostics when no results found
 */
export interface GenerationResult {
    /** Array of valid schedule combinations */
    resultados: ResultadoGeneracion[];
    /** Conflict diagnostics (only present when resultados.length === 0) */
    conflictDiagnostic?: TopPairResult[];
}

/**
 * Información de una actividad para verificar conflictos permitidos
 */
interface ActividadInfo {
    siglaRamo: string;
    tipoActividad: TipoActividad;
    mask: bigint;
}

/**
 * Prepara la información de actividades de una sección para verificación de conflictos
 */
function prepararActividadesInfo(seccion: SeccionConMask): ActividadInfo[] {
    return seccion.actividades.map(actividad => ({
        siglaRamo: seccion.ramoSigla,
        tipoActividad: actividad.tipo,
        mask: actividadToMask(actividad),
    }));
}

/**
 * Verifica si un conflicto está permitido según los permisos de tope
 * 
 * La lógica es: un conflicto está permitido si todos los involucrados (o todos menos uno)
 * tienen permiteTope = true
 */
function esConflictoPermitido(
    actividadesExistentes: ActividadInfo[],
    actividadNueva: ActividadInfo,
    permisosTope: PermisosTopeMap
): boolean {
    // Encontrar qué actividades existentes tienen conflicto con la nueva
    const actividadesEnConflicto: ActividadInfo[] = [];

    for (const existente of actividadesExistentes) {
        if (hasConflict(existente.mask, actividadNueva.mask)) {
            actividadesEnConflicto.push(existente);
        }
    }

    if (actividadesEnConflicto.length === 0) {
        return true; // No hay conflicto
    }

    // Incluir la actividad nueva en la lista de conflictos
    const todasEnConflicto = [...actividadesEnConflicto, actividadNueva];

    // Contar cuántas NO permiten tope
    let noPermitenTope = 0;
    for (const act of todasEnConflicto) {
        const key = getPermisoTopeKey(act.siglaRamo, act.tipoActividad);
        const permite = permisosTope.get(key) ?? false;
        if (!permite) {
            noPermitenTope++;
        }
    }

    // Permitido si a lo sumo UNA no permite tope
    return noPermitenTope <= 1;
}

/**
 * Finds the first conflicting slot between a candidate section and existing sections.
 * Returns ConflictHit with details about which sections conflict and where.
 * 
 * @param candidateSeccion The section being tested for addition
 * @param seccionesActuales The sections already in the partial schedule
 * @returns ConflictHit if conflict found, null otherwise
 */
function findFirstConflict(
    candidateSeccion: SeccionConMask,
    seccionesActuales: SeccionConMask[]
): ConflictHit | null {
    const candidateMask = candidateSeccion.mask;

    for (const existingSeccion of seccionesActuales) {
        const conflictMask = candidateMask & existingSeccion.mask;
        if (conflictMask !== BigInt(0)) {
            // Find the first conflicting bit (lowest set bit)
            let temp = conflictMask;
            let bitIndex = 0;
            while ((temp & BigInt(1)) === BigInt(0)) {
                temp >>= BigInt(1);
                bitIndex++;
            }

            // Convert bit index to day/module
            const bloque = indexToBloque(bitIndex);

            return {
                siglaCandidate: candidateSeccion.ramoSigla,
                sectionCandidateNorm: normalizeSectionId(candidateSeccion.id),
                siglaExisting: existingSeccion.ramoSigla,
                sectionExistingNorm: normalizeSectionId(existingSeccion.id),
                day: bloque.dia,
                module: bloque.modulo,
            };
        }
    }

    return null;
}

/**
 * Verifica si una sección puede agregarse considerando permisos de tope
 */
function puedeAgregarSeccion(
    seccionesActuales: SeccionConMask[],
    nuevaSeccion: SeccionConMask,
    permisosTope?: PermisosTopeMap
): { puede: boolean; tieneConflictos: boolean } {
    // Calcular máscara acumulada de las secciones actuales
    let maskAcumulada = BigInt(0);
    for (const sec of seccionesActuales) {
        maskAcumulada |= sec.mask;
    }

    // Si no hay conflicto de máscara, está todo bien
    if (!hasConflict(maskAcumulada, nuevaSeccion.mask)) {
        return { puede: true, tieneConflictos: false };
    }

    // Hay conflicto - verificar si está permitido
    if (!permisosTope || permisosTope.size === 0) {
        // Sin permisos configurados, el conflicto no está permitido
        return { puede: false, tieneConflictos: true };
    }

    // Preparar info de actividades existentes
    const actividadesExistentes: ActividadInfo[] = [];
    for (const sec of seccionesActuales) {
        actividadesExistentes.push(...prepararActividadesInfo(sec));
    }

    // Preparar info de actividades de la nueva sección
    const actividadesNuevas = prepararActividadesInfo(nuevaSeccion);

    // Verificar cada actividad de la nueva sección
    for (const actNueva of actividadesNuevas) {
        if (!esConflictoPermitido(actividadesExistentes, actNueva, permisosTope)) {
            return { puede: false, tieneConflictos: true };
        }
    }

    return { puede: true, tieneConflictos: true };
}

/**
 * Genera todas las combinaciones válidas de horarios
 * 
 * @param ramos Array de ramos obligatorios a incluir
 * @param maxResultados Límite de resultados (default: 500)
 * @param filtroSecciones Mapa opcional de sigla ramo → set de IDs de secciones permitidas
 * @param permisosTope Mapa opcional de permisos de tope por actividad
 * @returns GenerationResult with combinations and optional conflict diagnostics
 */
export function generarHorarios(
    ramos: Ramo[],
    maxResultados: number = MAX_RESULTADOS,
    filtroSecciones?: Map<string, Set<string>>,
    permisosTope?: PermisosTopeMap
): GenerationResult {
    if (ramos.length === 0) {
        return { resultados: [] };
    }

    // Preparar secciones con máscaras precalculadas, aplicando filtro si existe
    const ramosSecciones: SeccionConMask[][] = ramos.map(ramo => {
        const todasSecciones = prepararRamo(ramo);

        // Si hay filtro para este ramo, aplicarlo
        if (filtroSecciones && filtroSecciones.has(ramo.sigla)) {
            const seccionesPermitidas = filtroSecciones.get(ramo.sigla)!;
            if (seccionesPermitidas.size > 0) {
                return todasSecciones.filter(s => seccionesPermitidas.has(s.id));
            }
        }

        // Si no hay filtro o el set está vacío, usar todas las secciones
        return todasSecciones;
    });

    // Filtrar ramos que quedaron sin secciones después del filtro
    const ramosConSecciones = ramosSecciones.filter(secciones => secciones.length > 0);

    if (ramosConSecciones.length === 0) {
        return { resultados: [] };
    }

    // Ordenar por cantidad de secciones (menos secciones primero = poda temprana)
    const indices = ramosConSecciones
        .map((_, i) => i)
        .sort((a, b) => ramosConSecciones[a].length - ramosConSecciones[b].length);

    const ramosOrdenados = indices.map(i => ramosConSecciones[i]);

    // Create conflict stats for instrumentation
    const conflictStats = createConflictStats();

    // Ejecutar backtracking
    const resultados: ResultadoGeneracion[] = [];
    backtrack(ramosOrdenados, 0, [], resultados, maxResultados, permisosTope, false, conflictStats);

    // If no results, provide conflict diagnostics
    if (resultados.length === 0 && conflictStats.totalConflictEvents > 0) {
        return {
            resultados: [],
            conflictDiagnostic: buildTopPairs(conflictStats),
        };
    }

    return { resultados };
}


/**
 * Función recursiva de backtracking
 * Records conflict events when sections are discarded for diagnostic purposes.
 */
function backtrack(
    ramos: SeccionConMask[][],
    indice: number,
    solucionActual: SeccionConMask[],
    resultados: ResultadoGeneracion[],
    maxResultados: number,
    permisosTope?: PermisosTopeMap,
    tieneConflictosPermitidos: boolean = false,
    conflictStats?: ConflictStats
): void {
    // Condición de parada: límite alcanzado
    if (resultados.length >= maxResultados) {
        return;
    }

    // Condición de éxito: todos los ramos asignados
    if (indice === ramos.length) {
        // Calcular máscara total
        let maskTotal = BigInt(0);
        for (const sec of solucionActual) {
            maskTotal |= sec.mask;
        }

        resultados.push({
            id: `resultado-${resultados.length + 1}`,
            secciones: [...solucionActual],
            maskTotal,
            tieneConflictosPermitidos,
        });
        return;
    }

    const seccionesRamo = ramos[indice];

    // Probar cada sección del ramo actual
    for (const seccion of seccionesRamo) {
        const { puede, tieneConflictos } = puedeAgregarSeccion(
            solucionActual,
            seccion,
            permisosTope
        );

        if (puede) {
            solucionActual.push(seccion);
            backtrack(
                ramos,
                indice + 1,
                solucionActual,
                resultados,
                maxResultados,
                permisosTope,
                tieneConflictosPermitidos || tieneConflictos,
                conflictStats
            );
            solucionActual.pop();

            // Early exit si ya alcanzamos el límite
            if (resultados.length >= maxResultados) {
                return;
            }
        } else if (conflictStats) {
            // Section was discarded due to conflict - record for diagnostics
            const hit = findFirstConflict(seccion, solucionActual);
            if (hit) {
                recordConflict(conflictStats, hit);
            }
        }
    }
}


/**
 * Calcula estadísticas de la generación
 */
export function calcularEstadisticas(ramos: Ramo[]): {
    combinacionesPosibles: number;
    ramosCount: number;
    seccionesTotalCount: number;
} {
    const seccionesPorRamo = ramos.map(r => r.secciones.length);
    const combinacionesPosibles = seccionesPorRamo.reduce((acc, n) => acc * n, 1);

    return {
        combinacionesPosibles,
        ramosCount: ramos.length,
        seccionesTotalCount: seccionesPorRamo.reduce((acc, n) => acc + n, 0),
    };
}

/**
 * Obtiene información de una combinación específica
 */
export function obtenerInfoCombinacion(resultado: ResultadoGeneracion): {
    bloquesOcupados: number;
    ramosSiglas: string[];
    descripcion: string;
} {
    const ramosSiglas = [...new Set(resultado.secciones.map(s => s.ramoSigla))];

    // Contar bloques ocupados
    let bloquesOcupados = 0;
    let mask = resultado.maskTotal;
    while (mask > BigInt(0)) {
        bloquesOcupados += Number(mask & BigInt(1));
        mask >>= BigInt(1);
    }

    const descripcion = resultado.secciones
        .map(s => `${s.ramoSigla}-${s.numero}`)
        .join(', ');

    return {
        bloquesOcupados,
        ramosSiglas,
        descripcion,
    };
}
