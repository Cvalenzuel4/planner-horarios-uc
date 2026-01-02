import { useState } from 'react';
import { SeccionConMask } from '../../types';
import { SectionInfoModal } from '../Grid/SectionInfoModal';

interface SelectedCoursesListProps {
    secciones: SeccionConMask[];
    onRemove: (seccion: SeccionConMask) => void;
    onSearch: (sigla: string) => void;
}

export const SelectedCoursesList: React.FC<SelectedCoursesListProps> = ({
    secciones,
    onRemove,
    onSearch,
}) => {
    const [selectedSeccion, setSelectedSeccion] = useState<SeccionConMask | null>(null);

    if (secciones.length === 0) return null;

    // Por ahora usamos el semestre por defecto ya que no viene en el objeto Sección
    const titulo = "Mis Cursos 2026-1";

    return (
        <div className="mt-6 bg-blue-50/50 rounded-xl border border-blue-100 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-blue-100/50 border-b border-blue-200 flex items-center gap-2">
                <span className="text-xl">📚</span>
                <h3 className="font-bold text-gray-800">{titulo}</h3>
                <span className="text-xs font-normal text-gray-500 bg-white/50 px-2 py-0.5 rounded-full border border-blue-200">
                    {secciones.length} seleccionados
                </span>
            </div>

            {/* Lista */}
            <div className="divide-y divide-blue-100/50">
                {secciones.map((seccion) => (
                    <div
                        key={seccion.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/60 transition-colors group"
                    >
                        {/* Acciones */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => onRemove(seccion)}
                                className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Eliminar del horario"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onSearch(seccion.ramoSigla)}
                                className="p-1.5 rounded-md text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Buscar más secciones de este curso"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </div>

                        {/* Info clickable */}
                        <div
                            className="flex-1 cursor-pointer flex items-center gap-3 min-w-0"
                            onClick={() => setSelectedSeccion(seccion)}
                        >
                            <span className="font-mono text-gray-600 font-semibold shrink-0">
                                {seccion.ramoSigla}-{seccion.numero}
                            </span>
                            <span className="truncate text-gray-800 font-medium group-hover:text-blue-700 transition-colors">
                                {seccion.ramoNombre}
                            </span>
                            <span className="text-xs text-gray-400 hidden sm:inline-block shrink-0">
                                (NRC: {seccion.nrc}){seccion.metadatos?.campus && <span className="ml-1 text-gray-500">[{seccion.metadatos.campus}]</span>}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <SectionInfoModal
                isOpen={!!selectedSeccion}
                onClose={() => setSelectedSeccion(null)}
                seccion={selectedSeccion}
            />
        </div>
    );
};
