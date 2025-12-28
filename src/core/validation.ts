/**
 * Funciones de validación para entrada de datos
 */

import { Bloque, Seccion, Ramo, Actividad, ValidationResult, DIAS, MODULOS, TipoActividad } from '../types';

const TIPOS_VALIDOS: TipoActividad[] = ['catedra', 'ayudantia', 'laboratorio', 'taller', 'otro'];

/**
 * Valida que una sigla sea correcta (mayúsculas y números, 4-10 caracteres)
 */
export function validarSigla(sigla: string): ValidationResult {
    const errors: string[] = [];

    if (!sigla || sigla.trim().length === 0) {
        errors.push('La sigla no puede estar vacía');
    } else {
        const siglaTrim = sigla.trim().toUpperCase();

        if (siglaTrim.length < 4 || siglaTrim.length > 10) {
            errors.push('La sigla debe tener entre 4 y 10 caracteres');
        }

        if (!/^[A-Z]{3}[A-Z0-9]+$/.test(siglaTrim)) {
            errors.push('La sigla debe comenzar con 3 letras seguidas de letras o números');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Valida que un bloque sea correcto (día y módulo válidos)
 */
export function validarBloque(bloque: Bloque): ValidationResult {
    const errors: string[] = [];

    if (!DIAS.includes(bloque.dia)) {
        errors.push(`Día inválido: ${bloque.dia}. Debe ser L, M, W, J, V o S`);
    }

    if (!MODULOS.includes(bloque.modulo)) {
        errors.push(`Módulo inválido: ${bloque.modulo}. Debe ser un número entre 1 y 8`);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Valida una actividad completa
 */
export function validarActividad(actividad: Actividad): ValidationResult {
    const errors: string[] = [];

    if (!TIPOS_VALIDOS.includes(actividad.tipo)) {
        errors.push(`Tipo de actividad inválido: ${actividad.tipo}`);
    }

    if (!actividad.bloques || actividad.bloques.length === 0) {
        errors.push('La actividad debe tener al menos un bloque');
    } else {
        for (const bloque of actividad.bloques) {
            const bloqueValidation = validarBloque(bloque);
            errors.push(...bloqueValidation.errors);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Valida una sección completa
 */
export function validarSeccion(seccion: Seccion): ValidationResult {
    const errors: string[] = [];

    if (!seccion.id || seccion.id.trim().length === 0) {
        errors.push('El ID de la sección no puede estar vacío');
    }

    if (typeof seccion.numero !== 'number' || seccion.numero < 1) {
        errors.push('El número de sección debe ser un entero positivo');
    }

    if (!seccion.actividades || seccion.actividades.length === 0) {
        errors.push('La sección debe tener al menos una actividad');
    } else {
        for (let i = 0; i < seccion.actividades.length; i++) {
            const actValidation = validarActividad(seccion.actividades[i]);
            if (!actValidation.valid) {
                errors.push(`Actividad ${i + 1}: ${actValidation.errors.join(', ')}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Valida un ramo completo
 */
export function validarRamo(ramo: Ramo): ValidationResult {
    const errors: string[] = [];

    const siglaValidation = validarSigla(ramo.sigla);
    errors.push(...siglaValidation.errors);

    if (!ramo.nombre || ramo.nombre.trim().length === 0) {
        errors.push('El nombre del ramo no puede estar vacío');
    }

    if (!ramo.secciones || ramo.secciones.length === 0) {
        // Permitir ramos sin secciones durante la creación inicial
    } else {
        for (let i = 0; i < ramo.secciones.length; i++) {
            const secValidation = validarSeccion(ramo.secciones[i]);
            if (!secValidation.valid) {
                errors.push(`Sección ${i + 1}: ${secValidation.errors.join(', ')}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Normaliza una sigla (mayúsculas, sin espacios)
 */
export function normalizarSigla(sigla: string): string {
    return sigla.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Genera un ID de sección a partir de sigla y número
 */
export function generarIdSeccion(sigla: string, numero: number): string {
    return `${normalizarSigla(sigla)}-${numero}`;
}
