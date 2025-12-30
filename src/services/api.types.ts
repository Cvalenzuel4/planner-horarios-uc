/**
 * Tipos para la API de BuscaCursos UC
 * https://buscacursos-uc-api.onrender.com/docs
 */

// ============================================================================
// TIPOS DE LA API EXTERNA
// ============================================================================

/** Respuesta de la API de búsqueda de cursos */
export interface APIResponse {
    success: boolean;
    data: CursoAPI[];
    message: string;
    meta: {
        sigla: string;
        semestre: string;
        total_secciones: number;
    };
}

/** Detalle de una fila de vacantes */
export interface VacanteAPI {
    escuela: string;
    programa: string;
    concentracion: string;
    categoria: string;
    ofrecidas: number;
    ocupadas: number;
    disponibles: number;
}

/** Respuesta del endpoint de vacantes */
export interface VacantesResponse {
    success: boolean;
    data: VacanteAPI[];
    message: string;
    meta: {
        nrc: string;
        semestre: string;
    };
}

/** Curso tal como viene de la API */
export interface CursoAPI {
    nrc: string;
    sigla: string;
    seccion: number;
    nombre: string;
    profesor: string;
    campus: string;
    creditos: number;
    vacantes_totales: number;
    vacantes_disponibles: number;
    horarios: HorarioAPI[];
    requiere_laboratorio: boolean;
}

/** Horario tal como viene de la API */
export interface HorarioAPI {
    tipo: TipoActividadAPI;
    dia: DiaAPI;
    modulos: number[];
    sala: string | null;
}

/** Tipos de actividad de la API */
export type TipoActividadAPI = 'CLAS' | 'AYU' | 'LAB' | 'TAL' | 'TER' | 'PRA';

/** Días tal como vienen de la API */
export type DiaAPI = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';

// ============================================================================
// MAPEOS DE CONVERSIÓN
// ============================================================================

import { Dia, TipoActividad, Modulo } from '../types';

/** Mapeo de días de la API al formato interno */
export const DIA_API_MAP: Record<DiaAPI, Dia> = {
    'Lunes': 'L',
    'Martes': 'M',
    'Miércoles': 'W',
    'Jueves': 'J',
    'Viernes': 'V',
    'Sábado': 'S',
};

/** Mapeo de tipos de actividad de la API al formato interno */
export const TIPO_ACTIVIDAD_API_MAP: Record<TipoActividadAPI, TipoActividad> = {
    'CLAS': 'catedra',
    'AYU': 'ayudantia',
    'LAB': 'laboratorio',
    'TAL': 'taller',
    'TER': 'terreno',
    'PRA': 'practica',
};

/** Módulos válidos (1-8, descartamos módulo 9) */
export const MODULOS_VALIDOS: Modulo[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** Verifica si un módulo es válido (1-8) */
export function esModuloValido(modulo: number): modulo is Modulo {
    return modulo >= 1 && modulo <= 8;
}

// ============================================================================
// CONSTANTES DE LA API
// ============================================================================

export const API_BASE_URL = 'https://buscacursos-uc-api.onrender.com';
export const API_TIMEOUT_MS = 90000; // 90 segundos para cold start
export const SEMESTRE_ACTUAL = '2026-1';
