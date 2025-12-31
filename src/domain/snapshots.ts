import { Ramo } from '../types';

/**
 * Snapshot de un horario guardado.
 * Guarda tanto los IDs de secciones seleccionadas como la data completa de los ramos
 * para asegurar que el horario se pueda restaurar incluso si el usuario ha limpiado sus ramos.
 */
export interface ScheduleSnapshot {
    id: string; // 'A' | 'B' | 'C'
    name: string;
    timestamp: number;
    seccionesSeleccionadasIds: string[];
    ramos: Ramo[]; // Snapshot completo de los ramos necesarios
}

export const createSnapshot = (
    id: string,
    name: string,
    seccionesIds: string[],
    todosLosRamos: Ramo[]
): ScheduleSnapshot => {
    // Para optimizar, podríamos guardar solo los ramos que tienen secciones seleccionadas,
    // pero guardar todo asegura que el contexto total se mantenga (ej. otras secciones disponibles).
    // Por seguridad y simplicidad MVP, guardamos una copia de los ramos que tienen al menos una sección seleccionada.

    // Filtramos para no guardar "basura" si el usuario tiene 100 ramos buscados pero solo usa 5.
    const ramosRelevantes = todosLosRamos.filter(ramo =>
        ramo.secciones.some(seccion => seccionesIds.includes(seccion.id))
    );

    return {
        id,
        name,
        timestamp: Date.now(),
        seccionesSeleccionadasIds: [...seccionesIds],
        ramos: ramosRelevantes
    };
};

export const getSlotLabel = (snapshot: ScheduleSnapshot | null, slotId: string): string => {
    if (!snapshot) return `Opción ${slotId}`;
    return snapshot.name || `Opción ${slotId}`;
};

export const getSlotSummary = (snapshot: ScheduleSnapshot | null): string => {
    if (!snapshot) return 'Vacío';
    const count = snapshot.seccionesSeleccionadasIds.length;
    const date = new Date(snapshot.timestamp).toLocaleDateString();
    return `${count} secciones • ${date}`;
};
