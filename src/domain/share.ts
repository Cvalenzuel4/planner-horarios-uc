import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { Ramo } from '../types';

/**
 * Representación serializable de un horario compartido.
 * Versionado para permitir evolución futura de la estructura.
 */
export interface SharedScheduleV1 {
    v: 1;                 // Versión del snapshot
    ts: number;           // Timestamp de creación
    ramos: Ramo[];        // Lista completa de ramos (para no depender de API en el receptor)
    selectedIds: string[];// IDs de secciones seleccionadas
}

/**
 * Type guard para validar que un objeto desconocido es un SharedScheduleV1 válido.
 */
function isSharedScheduleV1(obj: any): obj is SharedScheduleV1 {
    return (
        obj &&
        obj.v === 1 &&
        typeof obj.ts === 'number' &&
        Array.isArray(obj.ramos) &&
        Array.isArray(obj.selectedIds)
    );
}

/**
 * Crea un snapshot listo para compartir desde el estado actual.
 */
export function createSnapshotFromState(ramos: Ramo[], selectedIds: string[]): SharedScheduleV1 {
    // Para optimizar tamaño, podríamos filtrar solo los ramos que tienen secciones seleccionadas,
    // pero para seguridad y contexto completo (ej: mostrar opciones no seleccionadas del mismo ramo),
    // guardamos los ramos que están cargados en el contexto "mis ramos".

    // OPTIMIZACIÓN DE TAMAÑO:
    // Filtramos los ramos para incluir SOLO las secciones que están seleccionadas.
    // Esto reduce drásticamente el tamaño del payload (links más cortos).
    // Si un ramo no tiene secciones seleccionadas, lo incluimos "vacío" o tal cual?
    // Decisión: Si no hay selección, no mandamos las secciones (el usuario puede buscarlas de nuevo).
    // Si hay selección, mandamos SOLO esa sección.

    const optimizedRamos = ramos.map(ramo => {
        const seccionesSeleccionadas = ramo.secciones.filter(s => selectedIds.includes(s.id));

        // Si hay secciones seleccionadas, guardamos SOLO esas.
        if (seccionesSeleccionadas.length > 0) {
            return {
                ...ramo,
                secciones: seccionesSeleccionadas
            };
        }

        // Si no hay secciones seleccionadas del ramo, para ahorrar espacio,
        // podríamos enviar el ramo SIN secciones, obligando a re-buscar si se quiere editar.
        // Esto mantiene el "nombre" en la lista de mis ramos.
        return {
            ...ramo,
            secciones: []
        };
    });

    return {
        v: 1,
        ts: Date.now(),
        ramos: optimizedRamos,
        selectedIds: selectedIds
    };
}


/**
 * Comprime y codifica el snapshot en un string seguro para URL.
 */
export function encodeSharedSnapshot(snapshot: SharedScheduleV1): string {
    const json = JSON.stringify(snapshot);
    return compressToEncodedURIComponent(json);
}

/**
 * Decodifica, descomprime y valida un hash de la URL.
 * Retorna null si es inválido o falla.
 */
export function decodeSharedSnapshot(encoded: string): SharedScheduleV1 | null {
    try {
        if (!encoded) return null;

        const json = decompressFromEncodedURIComponent(encoded);
        if (!json) return null;

        const obj = JSON.parse(json);

        if (isSharedScheduleV1(obj)) {
            return obj;
        }

        console.warn('Snapshot decodificado tiene estructura inválida o versión no soportada:', obj);
        return null;
    } catch (err) {
        console.error('Error al decodificar snapshot compartido:', err);
        return null;
    }
}
