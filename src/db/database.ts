/**
 * Configuración de IndexedDB usando Dexie.js
 * Proporciona persistencia offline para ramos y configuración de usuario.
 */

import Dexie, { type EntityTable } from 'dexie';
import { Ramo, ConfigUsuario } from '../types';

/**
 * Clase de base de datos para el Planificador de Horarios UC
 */
class PlanificadorDatabase extends Dexie {
    ramos!: EntityTable<Ramo, 'sigla'>;
    config!: EntityTable<ConfigUsuario, 'id'>;

    constructor() {
        super('PlanificadorHorariosUC');

        this.version(2).stores({
            // Indexar ramos por sigla y semestre (clave compuesta para unicidad por semestre)
            ramos: '[sigla+semestre], sigla, semestre, nombre',
            // Configuración única de usuario
            config: 'id',
        });
    }
}

// Instancia singleton de la base de datos
export const db = new PlanificadorDatabase();

/**
 * Inicializa la base de datos (abre conexión)
 */
export async function initDatabase(): Promise<void> {
    try {
        await db.open();
        console.log('Base de datos inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);

        // Recuperación ante error de esquema (cambio de PK no soportado automáticamente)
        // Dexie lanza 'SchemaError' o 'VersionError' dependiendo del caso, o un mensaje específico
        const err = error as any;
        if (err.name === 'SchemaError' ||
            err.name === 'VersionError' ||
            err.message?.includes('changing primary key') ||
            err.message?.includes('Incompatible')) {
            console.warn('Detectado cambio incompatible de esquema. Reiniciando base de datos...');
            try {
                await db.delete();
                await db.open();
                console.log('Base de datos reiniciada correctamente tras error de esquema.');
                return;
            } catch (retryError) {
                console.error('Error fatal al intentar reiniciar la BD:', retryError);
                throw retryError;
            }
        }

        throw error;
    }
}

/**
 * Cierra la conexión a la base de datos
 */
export async function closeDatabase(): Promise<void> {
    db.close();
}

export default db;
