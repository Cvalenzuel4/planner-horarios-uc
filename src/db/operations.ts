/**
 * Operaciones CRUD para la base de datos
 */

import { db } from './database';
import { Ramo, ConfigUsuario, DatosExportados, Seccion, Actividad } from '../types';
import { normalizarSigla, generarIdSeccion } from '../core/validation';

// ============================================================================
// OPERACIONES DE RAMOS
// ============================================================================

/**
 * Obtiene todos los ramos de la base de datos
 */
export async function obtenerTodosRamos(): Promise<Ramo[]> {
    return await db.ramos.toArray();
}

/**
 * Obtiene un ramo por su sigla
 */
export async function obtenerRamo(sigla: string): Promise<Ramo | undefined> {
    return await db.ramos.get(normalizarSigla(sigla));
}

/**
 * Agrega un nuevo ramo
 */
export async function agregarRamo(ramo: Ramo): Promise<string> {
    const ramoNormalizado: Ramo = {
        ...ramo,
        sigla: normalizarSigla(ramo.sigla),
        secciones: ramo.secciones || [],
    };
    await db.ramos.add(ramoNormalizado);
    return ramoNormalizado.sigla;
}

/**
 * Actualiza un ramo existente
 */
export async function actualizarRamo(ramo: Ramo): Promise<void> {
    const sigla = normalizarSigla(ramo.sigla);
    await db.ramos.put({ ...ramo, sigla });
}

/**
 * Elimina un ramo por su sigla
 */
export async function eliminarRamo(sigla: string): Promise<void> {
    await db.ramos.delete(normalizarSigla(sigla));
}

/**
 * Elimina TODOS los ramos de la base de datos
 */
export async function limpiarTodosRamos(): Promise<void> {
    await db.ramos.clear();
}

// ============================================================================
// OPERACIONES DE SECCIONES
// ============================================================================

/**
 * Agrega una sección a un ramo existente
 */
export async function agregarSeccion(sigla: string, seccion: Seccion): Promise<void> {
    const ramo = await obtenerRamo(sigla);
    if (!ramo) {
        throw new Error(`Ramo ${sigla} no encontrado`);
    }

    // Generar ID si no existe
    if (!seccion.id) {
        seccion.id = generarIdSeccion(sigla, seccion.numero);
    }

    ramo.secciones.push(seccion);
    await actualizarRamo(ramo);
}

/**
 * Actualiza una sección existente
 */
export async function actualizarSeccion(sigla: string, seccion: Seccion): Promise<void> {
    const ramo = await obtenerRamo(sigla);
    if (!ramo) {
        throw new Error(`Ramo ${sigla} no encontrado`);
    }

    const index = ramo.secciones.findIndex(s => s.id === seccion.id);
    if (index === -1) {
        throw new Error(`Sección ${seccion.id} no encontrada en ${sigla}`);
    }

    ramo.secciones[index] = seccion;
    await actualizarRamo(ramo);
}

/**
 * Elimina una sección de un ramo
 */
export async function eliminarSeccion(sigla: string, seccionId: string): Promise<void> {
    const ramo = await obtenerRamo(sigla);
    if (!ramo) {
        throw new Error(`Ramo ${sigla} no encontrado`);
    }

    ramo.secciones = ramo.secciones.filter(s => s.id !== seccionId);
    await actualizarRamo(ramo);
}

/**
 * Agrega una actividad a una sección existente
 */
export async function agregarActividad(
    sigla: string,
    seccionId: string,
    actividad: Actividad
): Promise<void> {
    const ramo = await obtenerRamo(sigla);
    if (!ramo) {
        throw new Error(`Ramo ${sigla} no encontrado`);
    }

    const seccion = ramo.secciones.find(s => s.id === seccionId);
    if (!seccion) {
        throw new Error(`Sección ${seccionId} no encontrada`);
    }

    seccion.actividades.push(actividad);
    await actualizarRamo(ramo);
}

// ============================================================================
// OPERACIONES DE CONFIGURACIÓN
// ============================================================================

const CONFIG_ID = 'default';

/**
 * Obtiene la configuración del usuario
 */
export async function obtenerConfig(): Promise<ConfigUsuario | undefined> {
    return await db.config.get(CONFIG_ID);
}

/**
 * Guarda la configuración del usuario
 */
export async function guardarConfig(config: Partial<ConfigUsuario>): Promise<void> {
    const configActual = await obtenerConfig();
    const nuevaConfig: ConfigUsuario = {
        id: CONFIG_ID,
        seccionesSeleccionadas: config.seccionesSeleccionadas || configActual?.seccionesSeleccionadas || [],
        ultimaActualizacion: Date.now(),
    };
    await db.config.put(nuevaConfig);
}

/**
 * Actualiza las secciones seleccionadas
 */
export async function actualizarSeccionesSeleccionadas(secciones: string[]): Promise<void> {
    await guardarConfig({ seccionesSeleccionadas: secciones });
}

// ============================================================================
// IMPORT/EXPORT
// ============================================================================

/**
 * Exporta todos los datos a un objeto JSON
 */
export async function exportarDatos(): Promise<DatosExportados> {
    const ramos = await obtenerTodosRamos();
    const config = await obtenerConfig();

    return {
        version: '1.0.0',
        fechaExportacion: new Date().toISOString(),
        ramos,
        config: config || null,
    };
}

/**
 * Importa datos desde un objeto JSON
 * @param datos Datos a importar
 * @param reemplazar Si true, elimina todos los datos existentes antes de importar
 */
export async function importarDatos(datos: DatosExportados, reemplazar: boolean = true): Promise<void> {
    // Validar estructura básica
    if (!datos.ramos || !Array.isArray(datos.ramos)) {
        throw new Error('Formato de datos inválido: falta el array de ramos');
    }

    await db.transaction('rw', [db.ramos, db.config], async () => {
        if (reemplazar) {
            // Limpiar datos existentes
            await db.ramos.clear();
            await db.config.clear();
        }

        // Importar ramos
        for (const ramo of datos.ramos) {
            const ramoNormalizado: Ramo = {
                sigla: normalizarSigla(ramo.sigla),
                nombre: ramo.nombre,
                secciones: ramo.secciones || [],
            };
            await db.ramos.put(ramoNormalizado);
        }

        // Importar configuración si existe
        if (datos.config) {
            await db.config.put({
                ...datos.config,
                id: CONFIG_ID,
                ultimaActualizacion: Date.now(),
            });
        }
    });
}

/**
 * Genera un archivo JSON descargable con los datos exportados
 */
export async function descargarDatos(): Promise<void> {
    const datos = await exportarDatos();
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `planificador-horarios-uc-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Lee un archivo JSON y lo importa
 */
export async function subirDatos(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const contenido = event.target?.result as string;
                const datos = JSON.parse(contenido) as DatosExportados;
                await importarDatos(datos, true);
                resolve();
            } catch (error) {
                reject(new Error('Error al procesar el archivo: ' + (error as Error).message));
            }
        };

        reader.onerror = () => {
            reject(new Error('Error al leer el archivo'));
        };

        reader.readAsText(file);
    });
}
