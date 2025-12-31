
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { Ramo } from '../types';

/**
 * Snapshot mínimo para compartir.
 * Solo contiene el semestre y un array de tuplas [sigla, id_seccion].
 * Usa nombres de propiedades cortos para minimizar el tamaño del JSON.
 */
export interface SharedPlanV1 {
    v: 1;                 // Versión
    sem: string;          // Semestre (ej: "2025-2")
    p: [string, string][];// Pares: [sigla, id_seccion_o_numero]
}

/**
 * Valida si un objeto es un SharedPlanV1 válido.
 */
export function isSharedPlanV1(obj: any): obj is SharedPlanV1 {
    return (
        obj &&
        obj.v === 1 &&
        typeof obj.sem === 'string' &&
        Array.isArray(obj.p) &&
        obj.p.every((pair: any) => Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string' && typeof pair[1] === 'string')
    );
}

/**
 * Crea un string codificado desde el estado actual.
 * Extrae solo la información mínima necesaria.
 */
export function encodeShared(semestre: string, ramos: Ramo[], selectedIds: string[]): string {
    // Filtrar solo los ramos que tienen alguna sección seleccionada
    // O si queremos permitir compartir ramos sin selección (ej: para que el otro elija),
    // podríamos incluirlos con "0" o similar, pero por ahora seguimos la spec:
    // "lista de pares (sigla, sección)"

    // Convertimos selectedIds a un Set para búsqueda rápida
    const selectedSet = new Set(selectedIds);

    const pairs: [string, string][] = [];

    ramos.forEach(ramo => {
        ramo.secciones.forEach(seccion => {
            if (selectedSet.has(seccion.id)) {
                // Usamos el número de sección si es numérico simple, o el ID si es complejo.
                // Idealmente usamos el identificador más corto pero robusto.
                // Como reconstruimos via API, el "número" (ej "1") es lo que necesitamos buscar en la lista de secciones devuelta.
                // Pero el ID interno suele ser "SIGLA-NUMERO" (ej "IIC2233-1").
                // Si guardamos solo "1", ahorramos bytes.
                // La spec dice: "p: [string, string][]" ej: [["EYP1113","1"]]
                // Asumimos que seccion.numero es lo que queremos.
                pairs.push([ramo.sigla, String(seccion.numero)]);
            }
        });

        // Opcional: Si un ramo no tiene selección, ¿lo incluimos?
        // La spec no lo explicita, pero es útil compartir "estoy viendo estos ramos".
        // Para soportar eso, podríamos usar un marcador especial para sección, ej: "0" o ""
        // Por ahora, solo compartimos LO SELECCIONADO según el objetivo "Compartir horario".
        // Si no hay horario armado, no hay mucho que compartir.
    });

    const plan: SharedPlanV1 = {
        v: 1,
        sem: semestre,
        p: pairs
    };

    const json = JSON.stringify(plan);
    return compressToEncodedURIComponent(json);
}

/**
 * Decodifica y valida el string compartido.
 */
export function decodeShared(encoded: string): SharedPlanV1 | null {
    try {
        if (!encoded) return null;
        const json = decompressFromEncodedURIComponent(encoded);
        if (!json) return null;

        const obj = JSON.parse(json);
        if (isSharedPlanV1(obj)) {
            return obj;
        }
        return null; // O lanzar error si preferimos
    } catch (e) {
        console.error("Error decoding shared plan", e);
        return null;
    }
}
