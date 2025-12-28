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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass-panel w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white mb-1">
                        ⚙️ Configurar Topes Permitidos
                    </h2>
                    <p className="text-white/60 text-sm">
                        Marca las actividades que pueden tener topes de horario
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {ramos.length === 0 ? (
                        <p className="text-white/50 text-center py-8">
                            No hay ramos seleccionados
                        </p>
                    ) : (
                        ramos.map(ramo => {
                            const actividades = actividadesPorRamo.get(ramo.sigla);
                            if (!actividades || actividades.size === 0) return null;

                            return (
                                <div key={ramo.sigla} className="bg-white/5 rounded-lg p-3">
                                    <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                                        <span className="text-sm bg-indigo-500/30 px-2 py-0.5 rounded">
                                            {ramo.sigla}
                                        </span>
                                        <span className="text-white/70 text-sm truncate">
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
                                                        ? 'bg-emerald-500/30 text-white border border-emerald-500/50'
                                                        : 'bg-white/5 text-white/70 hover:bg-white/10 border border-transparent'
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
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
                        <p className="text-amber-200">
                            <strong>ℹ️ ¿Cómo funciona?</strong>
                        </p>
                        <p className="text-amber-200/80 mt-1">
                            Si hay tope de horario entre actividades, se permite si <strong>todas
                                (o todas menos una)</strong> tienen este permiso activado.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex items-center justify-between">
                    <div className="text-sm text-white/50">
                        {permisosActivos > 0 ? (
                            <span className="text-emerald-300">
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
