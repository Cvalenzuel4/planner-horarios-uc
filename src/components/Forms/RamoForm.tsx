/**
 * Formulario para crear/editar un Ramo
 */

import { useState, useEffect } from 'react';
import { Ramo } from '../../types';
import { validarSigla, normalizarSigla } from '../../core/validation';
import { SEMESTRE_ACTUAL } from '../../services';

interface RamoFormProps {
    ramo?: Ramo | null;
    onSubmit: (ramo: Ramo) => void;
    onCancel: () => void;
    existingSiglas?: string[];
}

export const RamoForm: React.FC<RamoFormProps> = ({
    ramo,
    onSubmit,
    onCancel,
    existingSiglas = [],
}) => {
    const [sigla, setSigla] = useState(ramo?.sigla || '');
    const [nombre, setNombre] = useState(ramo?.nombre || '');
    const [errors, setErrors] = useState<string[]>([]);

    const isEditing = !!ramo;

    useEffect(() => {
        if (ramo) {
            setSigla(ramo.sigla);
            setNombre(ramo.nombre);
        }
    }, [ramo]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: string[] = [];

        // Validar sigla
        const siglaNorm = normalizarSigla(sigla);
        const siglaValidation = validarSigla(siglaNorm);
        if (!siglaValidation.valid) {
            newErrors.push(...siglaValidation.errors);
        }

        // Verificar duplicados solo al crear
        if (!isEditing && existingSiglas.includes(siglaNorm)) {
            newErrors.push(`Ya existe un ramo con la sigla ${siglaNorm}`);
        }

        // Validar nombre
        if (!nombre.trim()) {
            newErrors.push('El nombre del ramo es obligatorio');
        }

        if (newErrors.length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit({
            sigla: siglaNorm,
            nombre: nombre.trim(),
            semestre: ramo?.semestre || SEMESTRE_ACTUAL,
            secciones: ramo?.secciones || [],
        });
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-6">
                    {isEditing ? 'Editar Ramo' : 'Nuevo Ramo'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Errores */}
                    {errors.length > 0 && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                            <ul className="list-disc list-inside text-red-300 text-sm">
                                {errors.map((error, i) => (
                                    <li key={i}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Sigla */}
                    <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                            Sigla del Ramo
                        </label>
                        <input
                            type="text"
                            value={sigla}
                            onChange={(e) => setSigla(e.target.value.toUpperCase())}
                            className="input-styled font-mono"
                            placeholder="Ej: MAT1620"
                            disabled={isEditing}
                            autoFocus
                        />
                        {isEditing && (
                            <p className="text-white/40 text-xs mt-1">
                                La sigla no se puede modificar
                            </p>
                        )}
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                            Nombre del Ramo
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="input-styled"
                            placeholder="Ej: Cálculo II"
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onCancel} className="btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary">
                            {isEditing ? 'Guardar Cambios' : 'Crear Ramo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RamoForm;
