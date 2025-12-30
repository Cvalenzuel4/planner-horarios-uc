/**
 * Servicio para comunicación con la API de BuscaCursos UC
 */

import {
    APIResponse,
    CursoAPI,
    API_BASE_URL,
    API_TIMEOUT_MS,
    SEMESTRE_ACTUAL,
    DIA_API_MAP,
    TIPO_ACTIVIDAD_API_MAP,
    esModuloValido,
} from './api.types';
import { Ramo, Seccion, Actividad, Bloque, TipoActividad, Modulo } from '../types';

// ============================================================================
// HEALTH CHECK
// ============================================================================

/** Estado del health check */
export interface HealthCheckResult {
    isReady: boolean;
    message: string;
    responseTimeMs?: number;
}

/**
 * Verifica si la API está lista (y la despierta si está dormida)
 * Útil para llamar al inicio de la app
 */
export async function checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

        const response = await fetch(`${API_BASE_URL}/docs`, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (response.ok) {
            return {
                isReady: true,
                message: 'API lista',
                responseTimeMs: responseTime,
            };
        }

        return {
            isReady: false,
            message: `API respondió con estado ${response.status}`,
            responseTimeMs: responseTime,
        };
    } catch (error) {
        const responseTime = Date.now() - startTime;

        if (error instanceof Error && error.name === 'AbortError') {
            return {
                isReady: false,
                message: 'Timeout: La API está tardando demasiado en despertar',
                responseTimeMs: responseTime,
            };
        }

        return {
            isReady: false,
            message: `Error de conexión: ${error instanceof Error ? error.message : 'desconocido'}`,
            responseTimeMs: responseTime,
        };
    }
}

// ============================================================================
// BÚSQUEDA DE CURSOS
// ============================================================================

/** Resultado de búsqueda de cursos */
export interface BusquedaResult {
    success: boolean;
    ramos: Ramo[];
    cursosAPI: CursoAPI[];  // Datos originales de la API
    message: string;
    meta?: {
        sigla: string;
        semestre: string;
        total_secciones: number;
    };
}

/**
 * Busca cursos por sigla en la API
 */
export async function buscarCursos(
    sigla: string,
    semestre: string = SEMESTRE_ACTUAL
): Promise<BusquedaResult> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

        const url = `${API_BASE_URL}/api/v1/cursos/buscar?sigla=${encodeURIComponent(sigla)}&semestre=${semestre}`;

        const response = await fetch(url, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 503) {
                return {
                    success: false,
                    ramos: [],
                    cursosAPI: [],
                    message: 'BuscaCursos UC no está disponible en este momento',
                };
            }
            if (response.status === 500) {
                return {
                    success: false,
                    ramos: [],
                    cursosAPI: [],
                    message: `Error interno del servidor (500). Intenta con otro semestre o sigla.`,
                };
            }
            return {
                success: false,
                ramos: [],
                cursosAPI: [],
                message: `Error HTTP ${response.status}`,
            };
        }

        const data: APIResponse = await response.json();

        if (!data.success) {
            return {
                success: false,
                ramos: [],
                cursosAPI: [],
                message: data.message || 'Error desconocido',
            };
        }

        // Convertir cursos de la API al formato interno
        const ramosMap = new Map<string, Ramo>();

        for (const cursoAPI of data.data) {
            const siglaRamo = cursoAPI.sigla;

            if (!ramosMap.has(siglaRamo)) {
                ramosMap.set(siglaRamo, {
                    sigla: siglaRamo,
                    nombre: cursoAPI.nombre,
                    secciones: [],
                });
            }

            const ramo = ramosMap.get(siglaRamo)!;
            const seccion = convertirCursoAPIaSeccion(cursoAPI);
            ramo.secciones.push(seccion);
        }

        return {
            success: true,
            ramos: Array.from(ramosMap.values()),
            cursosAPI: data.data,
            message: data.message,
            meta: data.meta,
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return {
                success: false,
                ramos: [],
                cursosAPI: [],
                message: 'La búsqueda tardó demasiado. La API puede estar despertando, intenta de nuevo.',
            };
        }

        return {
            success: false,
            ramos: [],
            cursosAPI: [],
            message: `Error de conexión: ${error instanceof Error ? error.message : 'desconocido'}`,
        };
    }
}

// ============================================================================
// CONVERSIÓN DE DATOS
// ============================================================================

/**
 * Convierte un curso de la API a una Sección del formato interno
 */
export function convertirCursoAPIaSeccion(cursoAPI: CursoAPI): Seccion {
    // Agrupar horarios por tipo de actividad
    const actividadesMap = new Map<TipoActividad, Bloque[]>();

    for (const horarioAPI of cursoAPI.horarios) {
        const tipo = TIPO_ACTIVIDAD_API_MAP[horarioAPI.tipo];
        const dia = DIA_API_MAP[horarioAPI.dia];

        if (!actividadesMap.has(tipo)) {
            actividadesMap.set(tipo, []);
        }

        const bloques = actividadesMap.get(tipo)!;

        for (const modulo of horarioAPI.modulos) {
            // Solo incluir módulos 1-8
            if (esModuloValido(modulo)) {
                bloques.push({
                    dia,
                    modulo: modulo as Modulo,
                });
            }
        }
    }

    // Convertir a array de actividades
    const actividades: Actividad[] = [];
    for (const [tipo, bloques] of actividadesMap) {
        if (bloques.length > 0) {
            actividades.push({ tipo, bloques });
        }
    }

    return {
        id: `${cursoAPI.sigla}-${cursoAPI.seccion}`,
        nrc: cursoAPI.nrc,
        numero: cursoAPI.seccion,
        actividades,
        metadatos: {
            profesor: cursoAPI.profesor,
            sala: cursoAPI.horarios[0]?.sala || undefined,
        },
    };
}

/**
 * Información extendida de un curso desde la API
 * (para mostrar en la UI)
 */
export interface CursoInfo {
    nrc: string;
    sigla: string;
    seccion: number;
    nombre: string;
    profesor: string;
    campus: string;
    creditos: number;
    vacantesTotales: number;
    vacantesDisponibles: number;
    requiereLaboratorio: boolean;
    horarioTexto: string;
}

/**
 * Extrae información formateada de un curso de la API
 */
export function extraerCursoInfo(cursoAPI: CursoAPI): CursoInfo {
    const horariosTexto = cursoAPI.horarios.map(h => {
        const modulosStr = h.modulos.join(', ');
        return `${h.tipo} ${h.dia} M${modulosStr}`;
    }).join(' | ');

    return {
        nrc: cursoAPI.nrc,
        sigla: cursoAPI.sigla,
        seccion: cursoAPI.seccion,
        nombre: cursoAPI.nombre,
        profesor: cursoAPI.profesor,
        campus: cursoAPI.campus,
        creditos: cursoAPI.creditos,
        vacantesTotales: cursoAPI.vacantes_totales,
        vacantesDisponibles: cursoAPI.vacantes_disponibles,
        requiereLaboratorio: cursoAPI.requiere_laboratorio,
        horarioTexto: horariosTexto,
    };
}
