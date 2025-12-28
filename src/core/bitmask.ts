/**
 * Operaciones de Bitmask para detección de conflictos O(1)
 * 
 * El sistema usa un BigInt de 48 bits donde cada bit representa un bloque horario.
 * Fórmula: Index = (IndiceDia * 8) + (NumeroModulo - 1)
 * 
 * Ejemplo: Lunes Módulo 1 = (0 * 8) + (1 - 1) = 0
 *          Sábado Módulo 8 = (5 * 8) + (8 - 1) = 47
 */

import { Bloque, Dia, Modulo, Seccion, DIA_INDEX, SeccionConMask, Ramo } from '../types';

// ============================================================================
// FUNCIONES DE CONVERSIÓN
// ============================================================================

/**
 * Convierte un bloque (día, módulo) a su índice de bit (0-47)
 */
export function bloqueToIndex(dia: Dia, modulo: Modulo): number {
    const diaIndex = DIA_INDEX[dia];
    return (diaIndex * 8) + (modulo - 1);
}

/**
 * Convierte un índice de bit (0-47) a su bloque correspondiente
 */
export function indexToBloque(index: number): Bloque {
    const diaIndex = Math.floor(index / 8);
    const modulo = (index % 8) + 1;
    const dias: Dia[] = ['L', 'M', 'W', 'J', 'V', 'S'];
    return {
        dia: dias[diaIndex],
        modulo: modulo as Modulo,
    };
}

/**
 * Convierte un bloque a su máscara de bit correspondiente
 */
export function bloqueToMask(bloque: Bloque): bigint {
    const index = bloqueToIndex(bloque.dia, bloque.modulo);
    return BigInt(1) << BigInt(index);
}

/**
 * Convierte un array de bloques a una máscara combinada
 */
export function bloquesToMask(bloques: Bloque[]): bigint {
    let mask = BigInt(0);
    for (const bloque of bloques) {
        mask |= bloqueToMask(bloque);
    }
    return mask;
}

/**
 * Calcula la máscara de bits para una sección completa
 * (combina todos los bloques de todas sus actividades)
 */
export function seccionToMask(seccion: Seccion): bigint {
    let mask = BigInt(0);
    for (const actividad of seccion.actividades) {
        mask |= bloquesToMask(actividad.bloques);
    }
    return mask;
}

/**
 * Calcula la máscara de bits para una actividad específica
 */
export function actividadToMask(actividad: { bloques: Bloque[] }): bigint {
    return bloquesToMask(actividad.bloques);
}

/**
 * Convierte una máscara a array de bloques
 */
export function maskToBloques(mask: bigint): Bloque[] {
    const bloques: Bloque[] = [];
    for (let i = 0; i < 48; i++) {
        if ((mask & (BigInt(1) << BigInt(i))) !== BigInt(0)) {
            bloques.push(indexToBloque(i));
        }
    }
    return bloques;
}

// ============================================================================
// FUNCIONES DE DETECCIÓN DE CONFLICTOS
// ============================================================================

/**
 * Verifica si dos máscaras tienen conflicto (al menos un bit en común)
 */
export function hasConflict(maskA: bigint, maskB: bigint): boolean {
    return (maskA & maskB) !== BigInt(0);
}

/**
 * Obtiene los bloques en conflicto entre dos máscaras
 */
export function getConflictingBloques(maskA: bigint, maskB: bigint): Bloque[] {
    const conflictMask = maskA & maskB;
    return maskToBloques(conflictMask);
}

/**
 * Combina múltiples máscaras en una sola
 */
export function combinarMasks(masks: bigint[]): bigint {
    return masks.reduce((acc, mask) => acc | mask, BigInt(0));
}

/**
 * Verifica si una nueva máscara entra en conflicto con una máscara acumulada
 */
export function puedeAgregar(maskAcumulada: bigint, nuevaMask: bigint): boolean {
    return !hasConflict(maskAcumulada, nuevaMask);
}

// ============================================================================
// FUNCIONES DE PREPARACIÓN
// ============================================================================

/**
 * Prepara una sección con su máscara precalculada y datos del ramo
 */
export function prepararSeccion(seccion: Seccion, ramo: Ramo): SeccionConMask {
    return {
        ...seccion,
        mask: seccionToMask(seccion),
        ramoSigla: ramo.sigla,
        ramoNombre: ramo.nombre,
    };
}

/**
 * Prepara todas las secciones de un ramo con sus máscaras
 */
export function prepararRamo(ramo: Ramo): SeccionConMask[] {
    return ramo.secciones.map(seccion => prepararSeccion(seccion, ramo));
}

/**
 * Cuenta cuántos bloques están ocupados en una máscara
 */
export function contarBloquesOcupados(mask: bigint): number {
    let count = 0;
    let m = mask;
    while (m > BigInt(0)) {
        count += Number(m & BigInt(1));
        m >>= BigInt(1);
    }
    return count;
}
