import { useState, useEffect, useCallback } from 'react';
import { ScheduleSnapshot, createSnapshot } from '../domain/snapshots';
import { Ramo } from '../types';

const STORAGE_KEY = 'planner_slots_v1';
export type SlotId = 'A' | 'B' | 'C';

interface UseSlotsReturn {
    activeSlot: SlotId;
    slots: Record<SlotId, ScheduleSnapshot | null>;
    saveSlot: (slotId: SlotId, name: string, seccionesIds: string[], ramos: Ramo[]) => void;
    loadSlot: (slotId: SlotId) => ScheduleSnapshot | null;
    clearSlot: (slotId: SlotId) => void;
    setActiveSlot: (slotId: SlotId) => void;
    hasSlot: (slotId: SlotId) => boolean;
}

export function useSlots(): UseSlotsReturn {
    const [activeSlot, setActiveSlot] = useState<SlotId>('A');
    const [slots, setSlots] = useState<Record<SlotId, ScheduleSnapshot | null>>({
        A: null,
        B: null,
        C: null
    });

    // Cargar persistencia al inicio
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Validar estructura básica
                if (parsed && typeof parsed === 'object') {
                    setSlots(prev => ({ ...prev, ...parsed }));
                }
            }
        } catch (error) {
            console.error('Error cargando slots:', error);
        }
    }, []);

    // Helper para guardar en localStorage
    const persistSlots = (newSlots: Record<SlotId, ScheduleSnapshot | null>) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newSlots));
        } catch (error) {
            console.error('Error guardando slots en localStorage:', error);
        }
    };

    const saveSlot = useCallback((slotId: SlotId, name: string, seccionesIds: string[], ramos: Ramo[]) => {
        const snapshot = createSnapshot(slotId, name, seccionesIds, ramos);
        setSlots(prev => {
            const next = { ...prev, [slotId]: snapshot };
            persistSlots(next);
            return next;
        });
    }, []);

    const clearSlot = useCallback((slotId: SlotId) => {
        setSlots(prev => {
            const next = { ...prev, [slotId]: null };
            persistSlots(next);
            return next;
        });
    }, []);

    const loadSlot = useCallback((slotId: SlotId) => {
        return slots[slotId];
    }, [slots]);

    const hasSlot = useCallback((slotId: SlotId) => {
        return !!slots[slotId];
    }, [slots]);

    return {
        activeSlot,
        slots,
        saveSlot,
        loadSlot,
        clearSlot,
        setActiveSlot,
        hasSlot
    };
}
