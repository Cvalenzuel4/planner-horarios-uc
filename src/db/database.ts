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

        this.version(1).stores({
            // Indexar ramos por sigla (clave primaria)
            ramos: 'sigla, nombre',
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
