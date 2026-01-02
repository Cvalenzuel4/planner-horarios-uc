/**
 * Modal de configuración de permisos de tope de horario
 * Permite al usuario especificar qué actividades pueden tener conflictos
 */

import { useState, useMemo } from 'react';
import { Ramo, TipoActividad, PermisosTopeMap, NOMBRES_ACTIVIDAD, getPermisoTopeKey } from '../../types';

interface ConflictConfigModalProps {
    ramos: Ramo[];
    permisosTope: PermisosTopeMap;
    onSave: (permisos: PermisosTopeMap) => void;
    onClose: () => void;
}

export const ConflictConfigModal: React.FC<ConflictConfigModalProps> = ({
    ramos,
    permisosTope,
    onSave,
    onClose,
}) => {
    // Estado local para edición
    const [permisosLocal, setPermisosLocal] = useState<PermisosTopeMap>(
        new Map(permisosTope)
    );

    // Obtener actividades únicas por ramo
    const actividadesPorRamo = useMemo(() => {
        const mapa = new Map<string, Set<TipoActividad>>();

        for (const ramo of ramos) {
            const tipos = new Set<TipoActividad>();
            for (const seccion of ramo.secciones) {
                for (const actividad of seccion.actividades) {
                    tipos.add(actividad.tipo);
                }
            }
            if (tipos.size > 0) {
                mapa.set(ramo.sigla, tipos);
            }
        }

        return mapa;
    }, [ramos]);

    const togglePermiso = (sigla: string, tipo: TipoActividad) => {
        const key = getPermisoTopeKey(sigla, tipo);
        const nuevosPermisos = new Map(permisosLocal);
        const valorActual = nuevosPermisos.get(key) ?? false;

        if (valorActual) {
            nuevosPermisos.delete(key);
        } else {
            nuevosPermisos.set(key, true);
        }

        setPermisosLocal(nuevosPermisos);
    };

    const isChecked = (sigla: string, tipo: TipoActividad): boolean => {
        const key = getPermisoTopeKey(sigla, tipo);
        return permisosLocal.get(key) ?? false;
    };

    const handleSave = () => {
        onSave(permisosLocal);
        onClose();
    };

    const resetAll = () => {
        setPermisosLocal(new Map());
    };

    const permisosActivos = Array.from(permisosLocal.values()).filter(v => v).length;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                        ⚙️ Configurar Topes Permitidos
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Marca las actividades que pueden tener topes de horario
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {ramos.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">
                            No hay ramos seleccionados
                        </p>
                    ) : (
                        ramos.map(ramo => {
                            const actividades = actividadesPorRamo.get(ramo.sigla);
                            if (!actividades || actividades.size === 0) return null;

                            return (
                                <div key={ramo.sigla} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                                    <h3 className="text-gray-800 dark:text-gray-200 font-medium mb-2 flex items-center gap-2">
                                        <span className="text-sm bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded">
                                            {ramo.sigla}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 text-sm truncate">
                                            {ramo.nombre}
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Array.from(actividades).sort().map(tipo => (
                                            <label
                                                key={tipo}
                                                className={`
                                                    flex items-center gap-2 p-2 rounded cursor-pointer transition-colors text-sm
                                                    ${isChecked(ramo.sigla, tipo)
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50'
                                                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                                    }
                                                `}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked(ramo.sigla, tipo)}
                                                    onChange={() => togglePermiso(ramo.sigla, tipo)}
                                                    className="checkbox-styled w-4 h-4"
                                                />
                                                <span>{NOMBRES_ACTIVIDAD[tipo]}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Info box */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3 text-sm">
                        <p className="text-amber-700 dark:text-amber-500">
                            <strong>ℹ️ ¿Cómo funciona?</strong>
                        </p>
                        <p className="text-amber-600 dark:text-amber-500/80 mt-1">
                            Si hay tope de horario entre actividades, se permite si <strong>todas
                                (o todas menos una)</strong> tienen este permiso activado.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="text-sm text-gray-400 dark:text-gray-500">
                        {permisosActivos > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                                {permisosActivos} permiso{permisosActivos !== 1 ? 's' : ''} activo{permisosActivos !== 1 ? 's' : ''}
                            </span>
                        ) : (
                            <span>Sin permisos (solo horarios sin tope)</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={resetAll}
                            className="btn-secondary text-sm"
                        >
                            Resetear
                        </button>
                        <button
                            onClick={onClose}
                            className="btn-secondary text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn-primary text-sm"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConflictConfigModal;
