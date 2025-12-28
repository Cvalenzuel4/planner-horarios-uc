/**
 * Módulo de exportación a Excel con ExcelJS
 * Genera un archivo .xlsx con el horario visualmente replicado
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    SeccionConMask,
    DIAS,
    MODULOS,
    HORARIOS_MODULOS,
    NOMBRES_DIA,
    TipoActividad,
    Dia,
    Modulo,
} from '../types';

// ============================================================================
// CONSTANTES DE COLORES (mismo que CSS)
// ============================================================================

/** Mapeo de colores HEX por tipo de actividad */
const COLORES_HEX: Record<TipoActividad, { bg: string; text: string }> = {
    catedra: { bg: 'FBBF24', text: '1F2937' },      // Amarillo, texto oscuro
    laboratorio: { bg: '7DD3FC', text: '1F2937' }, // Azul claro, texto oscuro
    ayudantia: { bg: '34D399', text: '1F2937' },   // Verde, texto oscuro
    taller: { bg: 'C084FC', text: 'FFFFFF' },      // Púrpura, texto blanco
    otro: { bg: '9CA3AF', text: '1F2937' },        // Gris, texto oscuro
};

/** Mapeo de índice de columna por día (B=2, C=3, etc.) */
const DIA_COLUMNA: Record<Dia, number> = {
    'L': 2, // B
    'M': 3, // C
    'W': 4, // D
    'J': 5, // E
    'V': 6, // F
    'S': 7, // G
};

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

interface BloqueCelda {
    sigla: string;
    seccion: number;
    ramoNombre: string;
    profesor: string;
    tipo: TipoActividad;
}

type GrillaHorario = Map<string, BloqueCelda[]>; // key: "dia-modulo"

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Genera la clave única para una celda de la grilla
 */
function getCeldaKey(dia: Dia, modulo: Modulo): string {
    return `${dia}-${modulo}`;
}

/**
 * Construye la grilla de horario a partir de las secciones seleccionadas
 */
function construirGrilla(secciones: SeccionConMask[]): GrillaHorario {
    const grilla: GrillaHorario = new Map();

    for (const seccion of secciones) {
        for (const actividad of seccion.actividades) {
            for (const bloque of actividad.bloques) {
                const key = getCeldaKey(bloque.dia, bloque.modulo);
                const bloqueData: BloqueCelda = {
                    sigla: seccion.ramoSigla,
                    seccion: seccion.numero,
                    ramoNombre: seccion.ramoNombre,
                    profesor: seccion.metadatos.profesor || '',
                    tipo: actividad.tipo,
                };

                if (!grilla.has(key)) {
                    grilla.set(key, []);
                }
                grilla.get(key)!.push(bloqueData);
            }
        }
    }

    return grilla;
}

/**
 * Aplica estilos de borde fino a una celda
 */
function aplicarBordes(cell: ExcelJS.Cell): void {
    cell.border = {
        top: { style: 'thin', color: { argb: '404040' } },
        left: { style: 'thin', color: { argb: '404040' } },
        bottom: { style: 'thin', color: { argb: '404040' } },
        right: { style: 'thin', color: { argb: '404040' } },
    };
}

/**
 * Aplica estilos de encabezado a una celda
 */
function aplicarEstiloEncabezado(cell: ExcelJS.Cell): void {
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4338CA' }, // Indigo oscuro
    };
    cell.font = {
        bold: true,
        color: { argb: 'FFFFFF' },
        size: 11,
    };
    cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
    };
    aplicarBordes(cell);
}

/**
 * Aplica estilos de celda de horario según el tipo de actividad
 */
function aplicarEstiloBloque(cell: ExcelJS.Cell, tipo: TipoActividad): void {
    const colores = COLORES_HEX[tipo];

    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colores.bg },
    };
    cell.font = {
        bold: true,
        color: { argb: colores.text },
        size: 10,
    };
    cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
    };
    aplicarBordes(cell);
}

/**
 * Aplica estilos de celda vacía
 */
function aplicarEstiloCeldaVacia(cell: ExcelJS.Cell): void {
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F3F4F6' }, // Gris muy claro
    };
    aplicarBordes(cell);
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE EXPORTACIÓN
// ============================================================================

/**
 * Exporta el horario a un archivo Excel (.xlsx)
 * @param seccionesSeleccionadas - Array de secciones actualmente seleccionadas
 */
export async function exportarHorarioExcel(seccionesSeleccionadas: SeccionConMask[]): Promise<void> {
    // Crear workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Planificador de Horarios UC';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Horario', {
        views: [{ showGridLines: false }],
    });

    // Construir grilla de datos
    const grilla = construirGrilla(seccionesSeleccionadas);

    // ========================================================================
    // SECCIÓN 1: ENCABEZADOS (Fila 1)
    // ========================================================================

    // A1 vacía pero con estilo
    const celdaA1 = worksheet.getCell('A1');
    celdaA1.value = 'Módulo';
    aplicarEstiloEncabezado(celdaA1);

    // B1 a G1: Días de la semana
    DIAS.forEach((dia, index) => {
        const cell = worksheet.getCell(1, index + 2); // columnas 2-7
        cell.value = NOMBRES_DIA[dia];
        aplicarEstiloEncabezado(cell);
    });

    // ========================================================================
    // SECCIÓN 2: CUERPO DEL HORARIO (Filas 2-9 para M1-M8)
    // ========================================================================

    MODULOS.forEach((modulo, rowIndex) => {
        const filaExcel = rowIndex + 2; // Filas 2-9

        // Columna A: Rango horario del módulo
        const celdaHorario = worksheet.getCell(filaExcel, 1);
        const horario = HORARIOS_MODULOS[modulo];
        celdaHorario.value = `M${modulo}\n${horario.inicio} - ${horario.fin}`;
        celdaHorario.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E0E7FF' }, // Indigo claro
        };
        celdaHorario.font = {
            bold: true,
            size: 9,
            color: { argb: '312E81' },
        };
        celdaHorario.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true,
        };
        aplicarBordes(celdaHorario);

        // Columnas B-G: Celdas para cada día
        DIAS.forEach((dia) => {
            const columna = DIA_COLUMNA[dia];
            const cell = worksheet.getCell(filaExcel, columna);
            const key = getCeldaKey(dia, modulo);
            const bloques = grilla.get(key) || [];

            if (bloques.length === 0) {
                // Celda vacía
                aplicarEstiloCeldaVacia(cell);
            } else if (bloques.length === 1) {
                // Un solo bloque
                const bloque = bloques[0];
                cell.value = `${bloque.sigla}\nS${bloque.seccion}`;
                aplicarEstiloBloque(cell, bloque.tipo);
            } else {
                // Conflicto: múltiples bloques
                const textos = bloques.map(b => `${b.sigla}-S${b.seccion}`);
                cell.value = textos.join('\n');
                // Estilo de conflicto
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'EF4444' }, // Rojo
                };
                cell.font = {
                    bold: true,
                    color: { argb: 'FFFFFF' },
                    size: 9,
                };
                cell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle',
                    wrapText: true,
                };
                aplicarBordes(cell);
            }
        });
    });

    // ========================================================================
    // SECCIÓN 3: TABLA DE DETALLES (debajo del horario)
    // ========================================================================

    const filaInicioDetalles = MODULOS.length + 5; // 3 filas vacías después

    // Encabezados de la tabla de detalles
    const encabezadosDetalles = ['Sigla', 'Sección', 'Nombre del Curso', 'Profesor', 'Tipo'];
    encabezadosDetalles.forEach((header, index) => {
        const cell = worksheet.getCell(filaInicioDetalles, index + 1);
        cell.value = header;
        aplicarEstiloEncabezado(cell);
    });

    // Datos de cada sección seleccionada (sin duplicados por actividad)
    const seccionesUnicas = new Map<string, SeccionConMask>();
    seccionesSeleccionadas.forEach(s => {
        if (!seccionesUnicas.has(s.id)) {
            seccionesUnicas.set(s.id, s);
        }
    });

    let filaDetalle = filaInicioDetalles + 1;
    seccionesUnicas.forEach((seccion) => {
        // Obtener tipos de actividad únicos
        const tiposActividad = [...new Set(seccion.actividades.map(a => a.tipo))];
        const tiposTexto = tiposActividad.map(t => {
            const nombres: Record<TipoActividad, string> = {
                catedra: 'Cátedra',
                laboratorio: 'Lab',
                ayudantia: 'Ayud',
                taller: 'Taller',
                otro: 'Otro',
            };
            return nombres[t];
        }).join(', ');

        const datosSeccion = [
            seccion.ramoSigla,
            seccion.numero,
            seccion.ramoNombre,
            seccion.metadatos.profesor || '-',
            tiposTexto,
        ];

        datosSeccion.forEach((valor, colIndex) => {
            const cell = worksheet.getCell(filaDetalle, colIndex + 1);
            cell.value = valor;
            cell.font = { size: 10 };
            cell.alignment = {
                horizontal: colIndex === 1 ? 'center' : 'left',
                vertical: 'middle',
            };
            aplicarBordes(cell);
        });

        filaDetalle++;
    });

    // ========================================================================
    // SECCIÓN 4: AJUSTE DE ANCHOS DE COLUMNA
    // ========================================================================

    worksheet.getColumn(1).width = 15;  // Columna de módulos
    worksheet.getColumn(2).width = 14;  // Lunes
    worksheet.getColumn(3).width = 14;  // Martes
    worksheet.getColumn(4).width = 14;  // Miércoles
    worksheet.getColumn(5).width = 14;  // Jueves
    worksheet.getColumn(6).width = 14;  // Viernes
    worksheet.getColumn(7).width = 14;  // Sábado

    // Ajustar anchos para tabla de detalles si hay más columnas
    if (seccionesUnicas.size > 0) {
        worksheet.getColumn(1).width = 15;  // Sigla
        worksheet.getColumn(2).width = 10;  // Sección
        worksheet.getColumn(3).width = 35;  // Nombre del Curso
        worksheet.getColumn(4).width = 25;  // Profesor
        worksheet.getColumn(5).width = 15;  // Tipo
    }

    // Ajustar altura de filas del horario
    for (let i = 2; i <= MODULOS.length + 1; i++) {
        worksheet.getRow(i).height = 40;
    }

    // ========================================================================
    // SECCIÓN 5: GENERAR Y DESCARGAR ARCHIVO
    // ========================================================================

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const fecha = new Date().toISOString().slice(0, 10);
    saveAs(blob, `Horario_UC_${fecha}.xlsx`);
}
