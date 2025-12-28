/**
 * Formulario para crear/editar una Sección
 * Incluye selector visual de bloques tipo matriz
 */

import { useState, Fragment } from 'react';
import {
    Seccion,
    Actividad,
    Bloque,
    TipoActividad,
    DIAS,
    MODULOS,

    HORARIOS_MODULOS,
    NOMBRES_ACTIVIDAD,
    COLORES_ACTIVIDAD,
    Dia,
    Modulo,
} from '../../types';
import { generarIdSeccion } from '../../core/validation';

interface SeccionFormProps {
    sigla: string;
    seccion?: Seccion | null;
    siguienteNumero: number;
    onSubmit: (seccion: Seccion) => void;
    onCancel: () => void;
}

const TIPOS_ACTIVIDAD: TipoActividad[] = ['catedra', 'laboratorio', 'ayudantia', 'taller', 'otro'];

export const SeccionForm: React.FC<SeccionFormProps> = ({
    sigla,
    seccion,
    siguienteNumero,
    onSubmit,
    onCancel,
}) => {
    const [numero, setNumero] = useState(seccion?.numero || siguienteNumero);
    const [profesor, setProfesor] = useState(seccion?.metadatos?.profesor || '');
    const [sala, setSala] = useState(seccion?.metadatos?.sala || '');
    const [actividades, setActividades] = useState<Actividad[]>(seccion?.actividades || []);

    // Estado para la actividad en edición
    const [tipoActual, setTipoActual] = useState<TipoActividad>('catedra');
    const [bloquesSeleccionados, setBloquesSeleccionados] = useState<Set<string>>(new Set());
    const [editandoIndex, setEditandoIndex] = useState<number | null>(null);

    const [errors, setErrors] = useState<string[]>([]);

    const isEditing = !!seccion;

    // Toggle de bloque en el selector
    const toggleBloque = (dia: Dia, modulo: Modulo) => {
        const key = `${dia}-${modulo}`;
        const nuevos = new Set(bloquesSeleccionados);
        if (nuevos.has(key)) {
            nuevos.delete(key);
        } else {
            nuevos.add(key);
        }
        setBloquesSeleccionados(nuevos);
    };

    // Agregar/actualizar actividad
    const guardarActividad = () => {
        if (bloquesSeleccionados.size === 0) {
            setErrors(['Selecciona al menos un bloque para la actividad']);
            return;
        }

        const bloques: Bloque[] = Array.from(bloquesSeleccionados).map(key => {
            const [dia, modulo] = key.split('-');
            return { dia: dia as Dia, modulo: parseInt(modulo) as Modulo };
        });

        const nuevaActividad: Actividad = {
            tipo: tipoActual,
            bloques,
        };

        if (editandoIndex !== null) {
            const nuevas = [...actividades];
            nuevas[editandoIndex] = nuevaActividad;
            setActividades(nuevas);
        } else {
            setActividades([...actividades, nuevaActividad]);
        }

        // Limpiar selección
        setBloquesSeleccionados(new Set());
        setTipoActual('catedra');
        setEditandoIndex(null);
        setErrors([]);
    };

    // Editar una actividad existente
    const editarActividad = (index: number) => {
        const act = actividades[index];
        setTipoActual(act.tipo);
        setBloquesSeleccionados(new Set(act.bloques.map(b => `${b.dia}-${b.modulo}`)));
        setEditandoIndex(index);
    };

    // Eliminar una actividad
    const eliminarActividad = (index: number) => {
        setActividades(actividades.filter((_, i) => i !== index));
    };

    // Cancelar edición de actividad
    const cancelarEdicionActividad = () => {
        setBloquesSeleccionados(new Set());
        setTipoActual('catedra');
        setEditandoIndex(null);
    };

    // Submit del formulario
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: string[] = [];

        if (actividades.length === 0) {
            newErrors.push('La sección debe tener al menos una actividad');
        }

        if (numero < 1) {
            newErrors.push('El número de sección debe ser positivo');
        }

        if (newErrors.length > 0) {
            setErrors(newErrors);
            return;
        }

        const seccionFinal: Seccion = {
            id: seccion?.id || generarIdSeccion(sigla, numero),
            numero,
            actividades,
            metadatos: {
                profesor: profesor.trim() || undefined,
                sala: sala.trim() || undefined,
            },
        };

        onSubmit(seccionFinal);
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div
                className="modal-content p-6 max-w-4xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-white mb-2">
                    {isEditing ? 'Editar Sección' : 'Nueva Sección'}
                </h2>
                <p className="text-indigo-300 mb-6">{sigla}</p>

                <form onSubmit={handleSubmit} className="space-y-6">
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

                    {/* Info básica */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Número de Sección
                            </label>
                            <input
                                type="number"
                                value={numero}
                                onChange={(e) => setNumero(parseInt(e.target.value) || 1)}
                                className="input-styled"
                                min={1}
                            />
                        </div>
                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Profesor (opcional)
                            </label>
                            <input
                                type="text"
                                value={profesor}
                                onChange={(e) => setProfesor(e.target.value)}
                                className="input-styled"
                                placeholder="Nombre del profesor"
                            />
                        </div>
                        <div>
                            <label className="block text-white/80 text-sm font-medium mb-2">
                                Sala (opcional)
                            </label>
                            <input
                                type="text"
                                value={sala}
                                onChange={(e) => setSala(e.target.value)}
                                className="input-styled"
                                placeholder="Ej: A-101"
                            />
                        </div>
                    </div>

                    {/* Actividades existentes */}
                    {actividades.length > 0 && (
                        <div>
                            <h3 className="text-white font-medium mb-3">Actividades agregadas:</h3>
                            <div className="flex flex-wrap gap-2">
                                {actividades.map((act, i) => (
                                    <div
                                        key={i}
                                        className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg
                      ${COLORES_ACTIVIDAD[act.tipo].bg} ${COLORES_ACTIVIDAD[act.tipo].text}
                    `}
                                    >
                                        <span className="font-medium">{NOMBRES_ACTIVIDAD[act.tipo]}</span>
                                        <span className="text-sm opacity-70">
                                            ({act.bloques.length} bloques)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => editarActividad(i)}
                                            className="ml-2 hover:opacity-80"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => eliminarActividad(i)}
                                            className="hover:opacity-80"
                                        >
                                            ❌
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Selector de tipo de actividad */}
                    <div>
                        <h3 className="text-white font-medium mb-3">
                            {editandoIndex !== null ? 'Editar Actividad:' : 'Agregar Actividad:'}
                        </h3>
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {TIPOS_ACTIVIDAD.map((tipo) => (
                                <button
                                    key={tipo}
                                    type="button"
                                    onClick={() => setTipoActual(tipo)}
                                    className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${tipoActual === tipo
                                            ? `${COLORES_ACTIVIDAD[tipo].bg} ${COLORES_ACTIVIDAD[tipo].text} ring-2 ring-white`
                                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                                        }
                  `}
                                >
                                    {NOMBRES_ACTIVIDAD[tipo]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Matriz de selección de bloques */}
                    <div className="overflow-x-auto">
                        <p className="text-white/60 text-sm mb-2">
                            Haz clic en los bloques para seleccionarlos:
                        </p>
                        <div className="min-w-[600px]">
                            <div className="grid grid-cols-7 gap-1">
                                {/* Header */}
                                <div className="p-2 text-center text-white/50 text-xs">Módulo</div>
                                {DIAS.map((dia) => (
                                    <div key={dia} className="p-2 text-center text-white font-medium text-sm">
                                        {dia}
                                    </div>
                                ))}

                                {/* Filas de módulos */}
                                {MODULOS.map((modulo) => (
                                    <Fragment key={modulo}>
                                        <div className="p-2 text-center text-white/70 text-xs">
                                            <div>M{modulo}</div>
                                            <div className="text-[10px] text-white/40">
                                                {HORARIOS_MODULOS[modulo].inicio}
                                            </div>
                                        </div>
                                        {DIAS.map((dia) => {
                                            const key = `${dia}-${modulo}`;
                                            const isSelected = bloquesSeleccionados.has(key);
                                            const colores = COLORES_ACTIVIDAD[tipoActual];

                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => toggleBloque(dia, modulo)}
                                                    className={`
                            p-2 rounded transition-all duration-150 min-h-[40px]
                            ${isSelected
                                                            ? `${colores.bg} ${colores.text} ring-2 ring-white`
                                                            : 'bg-white/5 hover:bg-white/15 text-white/30'
                                                        }
                          `}
                                                >
                                                    {isSelected ? '✓' : ''}
                                                </button>
                                            );
                                        })}
                                    </Fragment>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Botón guardar actividad */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={guardarActividad}
                            disabled={bloquesSeleccionados.size === 0}
                            className={`
                btn-secondary flex-1
                ${bloquesSeleccionados.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}
              `}
                        >
                            {editandoIndex !== null ? 'Actualizar Actividad' : '+ Guardar Actividad'}
                        </button>
                        {editandoIndex !== null && (
                            <button
                                type="button"
                                onClick={cancelarEdicionActividad}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>

                    {/* Botones principales */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <button type="button" onClick={onCancel} className="btn-secondary">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={actividades.length === 0}
                            className={`btn-primary ${actividades.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isEditing ? 'Guardar Cambios' : 'Crear Sección'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SeccionForm;
