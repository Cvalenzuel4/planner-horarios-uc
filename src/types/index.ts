/**
 * Tipos fundamentales para el Planificador de Horarios UC
 * Estos tipos siguen estrictamente el esquema JSON definido en las especificaciones.
 */

// ============================================================================
// ENUMS Y TIPOS BASE
// ============================================================================

/** Días de la semana universitaria (L = Lunes, S = Sábado) */
export type Dia = 'L' | 'M' | 'W' | 'J' | 'V' | 'S';

/** Módulos horarios del 1 al 8 */
export type Modulo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Tipos de actividad con colores asociados */
export type TipoActividad = 'catedra' | 'ayudantia' | 'laboratorio' | 'taller' | 'terreno' | 'practica' | 'otro';

/** Array constante de días para iteración */
export const DIAS: Dia[] = ['L', 'M', 'W', 'J', 'V', 'S'];

/** Array constante de módulos para iteración */
export const MODULOS: Modulo[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** Mapeo de índice de día para cálculos de bitmask */
export const DIA_INDEX: Record<Dia, number> = {
    'L': 0,
    'M': 1,
    'W': 2,
    'J': 3,
    'V': 4,
    'S': 5,
};

/** Horarios de cada módulo para visualización */
export const HORARIOS_MODULOS: Record<Modulo, { inicio: string; fin: string }> = {
    1: { inicio: '08:20', fin: '09:30' },
    2: { inicio: '09:40', fin: '10:50' },
    3: { inicio: '11:00', fin: '12:10' },
    4: { inicio: '12:20', fin: '13:30' },
    5: { inicio: '14:50', fin: '16:00' },
    6: { inicio: '16:10', fin: '17:20' },
    7: { inicio: '17:30', fin: '18:40' },
    8: { inicio: '18:50', fin: '20:00' },
};

/** Hora de almuerzo (separador visual) */
export const ALMUERZO = { inicio: '13:30', fin: '14:50' };

// ============================================================================
// MODELOS DE DATOS PRINCIPALES
// ============================================================================

/** Un bloque representa una celda específica en el horario */
export interface Bloque {
    dia: Dia;
    modulo: Modulo;
}

/** Metadatos opcionales de una sección */
export interface MetadatosSeccion {
    profesor?: string;
    sala?: string;
}

/** Una actividad agrupa bloques del mismo tipo dentro de una sección */
export interface Actividad {
    tipo: TipoActividad;
    bloques: Bloque[];
}

/** Una sección es una instancia específica de un ramo con sus actividades */
export interface Seccion {
    id: string;           // Formato: SIGLA-NUMERO (ej: "MAT1620-1")
    numero: number;
    actividades: Actividad[];
    metadatos: MetadatosSeccion;
}

/** Un ramo agrupa varias secciones bajo una sigla y nombre */
export interface Ramo {
    sigla: string;        // ID único (ej: "MAT1620")
    nombre: string;       // Nombre descriptivo
    secciones: Seccion[];
}

// ============================================================================
// TIPOS DE ESTADO DE LA APLICACIÓN
// ============================================================================

/** Estado de una sección con su máscara de bits precalculada */
export interface SeccionConMask extends Seccion {
    mask: bigint;
    ramoSigla: string;
    ramoNombre: string;
}

/** Configuración de usuario persistida */
export interface ConfigUsuario {
    id: string;
    seccionesSeleccionadas: string[]; // Array de IDs de secciones
    ultimaActualizacion: number;      // Timestamp
}

/** Resultado de una generación de horarios */
export interface ResultadoGeneracion {
    id: string;
    secciones: SeccionConMask[];
    maskTotal: bigint;
    tieneConflictosPermitidos?: boolean; // Indica si esta combinación tiene topes permitidos
}

/** Configuración de permiso de tope por actividad de un ramo */
export interface PermisoTope {
    siglaRamo: string;
    tipoActividad: TipoActividad;
    permiteTope: boolean;
}

/** 
 * Mapa de permisos de tope: "SIGLA:tipoActividad" → permiteTope 
 * Por defecto, si una clave no existe, el tope NO está permitido
 */
export type PermisosTopeMap = Map<string, boolean>;

/** Helper para generar clave de permiso de tope */
export function getPermisoTopeKey(sigla: string, tipoActividad: TipoActividad): string {
    return `${sigla}:${tipoActividad}`;
}

/** Datos para exportar/importar */
export interface DatosExportados {
    version: string;
    fechaExportacion: string;
    ramos: Ramo[];
    config: ConfigUsuario | null;
}

// ============================================================================
// TIPOS UTILITARIOS
// ============================================================================

/** Resultado de validación */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/** Mapeo de colores por tipo de actividad (clases TailwindCSS) */
export const COLORES_ACTIVIDAD: Record<TipoActividad, { bg: string; text: string; border: string }> = {
    catedra: { bg: 'bg-catedra', text: 'text-gray-900', border: 'border-amber-500' },
    laboratorio: { bg: 'bg-laboratorio', text: 'text-gray-900', border: 'border-sky-500' },
    ayudantia: { bg: 'bg-ayudantia', text: 'text-gray-900', border: 'border-emerald-500' },
    taller: { bg: 'bg-taller', text: 'text-white', border: 'border-purple-600' },
    terreno: { bg: 'bg-terreno', text: 'text-gray-900', border: 'border-amber-700' },
    practica: { bg: 'bg-practica', text: 'text-white', border: 'border-red-600' },
    otro: { bg: 'bg-otro', text: 'text-gray-900', border: 'border-gray-500' },
};

/** Nombres legibles de tipos de actividad */
export const NOMBRES_ACTIVIDAD: Record<TipoActividad, string> = {
    catedra: 'Cátedra',
    laboratorio: 'Laboratorio',
    ayudantia: 'Ayudantía',
    taller: 'Taller',
    terreno: 'Terreno',
    practica: 'Práctica',
    otro: 'Otro',
};

/** Nombres completos de los días */
export const NOMBRES_DIA: Record<Dia, string> = {
    'L': 'Lunes',
    'M': 'Martes',
    'W': 'Miércoles',
    'J': 'Jueves',
    'V': 'Viernes',
    'S': 'Sábado',
};
