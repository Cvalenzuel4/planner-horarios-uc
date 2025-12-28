/**
 * Datos iniciales del planificador
 * 
 * Este módulo exporta los datos de ramos que se cargarán
 * automáticamente si IndexedDB está vacío.
 * 
 * Edita el archivo initialData.json para agregar tus ramos.
 */

import initialData from './initialData.json';
import { DatosExportados } from '../types';

export const datosIniciales: DatosExportados = initialData as DatosExportados;

export default datosIniciales;
