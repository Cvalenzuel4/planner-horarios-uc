import React from 'react';
import { ScheduleSnapshot, getSlotLabel, getSlotSummary } from '../../domain/snapshots';
import { SlotId } from '../../hooks/useSlots';

interface SlotControlsProps {
    activeSlot: SlotId;
    slots: Record<SlotId, ScheduleSnapshot | null>;
    onSlotChange: (slot: SlotId) => void;
    onSave: () => void;
    onLoad: () => void;
    isCurrentSlotEmpty: boolean;
}

export const SlotControls: React.FC<SlotControlsProps> = ({
    activeSlot,
    slots,
    onSlotChange,
    onSave,
    onLoad,
    isCurrentSlotEmpty
}) => {
    // Array para iterar opciones
    const slotOptions: SlotId[] = ['A', 'B', 'C'];

    return (
        <div className="flex items-center gap-2 bg-gray-50/80 p-1.5 rounded-lg border border-gray-200 shadow-sm backdrop-blur-sm">
            <div className="flex gap-1">
                {slotOptions.map((slot) => {
                    const hasData = !!slots[slot];
                    const isActive = activeSlot === slot;

                    return (
                        <div key={slot} className="relative group">
                            <button
                                onClick={() => onSlotChange(slot)}
                                className={`
                                    relative w-8 h-8 flex items-center justify-center rounded-md text-sm font-bold transition-all
                                    ${isActive
                                        ? 'bg-white text-[#003366] shadow-sm border border-gray-200'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                                    }
                                `}
                                title={hasData ? `${getSlotLabel(slots[slot], slot)} (${getSlotSummary(slots[slot])})` : `Slot ${slot}: Vacío`}
                            >
                                {slot}
                                {hasData && !isActive && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white" />
                                )}
                            </button>

                            {/* Tooltip simple */}
                            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 min-w-max hidden group-hover:block z-50">
                                <div className="bg-gray-800 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap">
                                    {hasData ? getSlotLabel(slots[slot], slot) : 'Vacío'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="w-px h-5 bg-gray-300 mx-1" />

            <div className="flex gap-1">
                <button
                    onClick={onSave}
                    className="p-1.5 text-gray-600 hover:text-[#003366] hover:bg-white rounded-md transition-all active:scale-95"
                    title="Guardar en slot actual"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                </button>

                <button
                    onClick={onLoad}
                    disabled={isCurrentSlotEmpty}
                    className={`
                        p-1.5 rounded-md transition-all active:scale-95
                        ${isCurrentSlotEmpty
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600 hover:text-[#003366] hover:bg-white'
                        }
                    `}
                    title="Cargar slot actual"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};
