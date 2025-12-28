# Datos Iniciales

Esta carpeta contiene datos de ramos que se cargarán automáticamente al iniciar la aplicación (si IndexedDB está vacío).

## Formato de Datos

Los archivos deben seguir la estructura JSON definida en los tipos del proyecto:

```json
{
  "version": "1.0.0",
  "ramos": [
    {
      "sigla": "MAT1620",
      "nombre": "Cálculo I",
      "secciones": [
        {
          "id": "MAT1620-1",
          "numero": 1,
          "actividades": [
            {
              "tipo": "catedra",
              "bloques": [
                { "dia": "L", "modulo": 3 },
                { "dia": "W", "modulo": 3 }
              ]
            }
          ],
          "metadatos": {
            "profesor": "Juan Pérez",
            "sala": "A-101"
          }
        }
      ]
    }
  ]
}
```

## Tipos de Actividad
- `catedra` - Clases teóricas
- `ayudantia` - Ayudantías
- `laboratorio` - Laboratorios
- `taller` - Talleres
- `otro` - Otro tipo

## Días
- `L` = Lunes
- `M` = Martes  
- `W` = Miércoles
- `J` = Jueves
- `V` = Viernes
- `S` = Sábado

## Módulos
Del 1 al 8 (horarios universitarios estándar UC)
