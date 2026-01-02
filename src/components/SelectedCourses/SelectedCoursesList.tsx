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
        <div className="mt-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-blue-100/50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800/30 flex items-center gap-2">
                <span className="text-xl">📚</span>
                <h3 className="font-bold text-gray-800 dark:text-blue-100">{titulo}</h3>
                <span className="text-xs font-normal text-gray-500 dark:text-blue-300 bg-white/50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/30">
                    {secciones.length} seleccionados
                </span>
            </div>

            {/* Lista */}
            <div className="divide-y divide-blue-100/50 dark:divide-blue-800/30">
                {secciones.map((seccion) => (
                    <div
                        key={seccion.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/60 dark:hover:bg-blue-900/20 transition-colors group"
                    >
                        {/* Acciones */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => onRemove(seccion)}
                                className="p-1.5 rounded-md text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Eliminar del horario"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <button
                                onClick={() => onSearch(seccion.ramoSigla)}
                                className="p-1.5 rounded-md text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
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
                            <span className="font-mono text-gray-600 dark:text-gray-400 font-semibold shrink-0">
                                {seccion.ramoSigla}-{seccion.numero}
                            </span>
                            <span className="truncate text-gray-800 dark:text-gray-200 font-medium group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                {seccion.ramoNombre}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline-block shrink-0">
                                (NRC: {seccion.nrc}){seccion.metadatos?.campus && <span className="ml-1 text-gray-500 dark:text-gray-400">[{seccion.metadatos.campus}]</span>}
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
