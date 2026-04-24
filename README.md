# Cronograma de actividades del día

Aplicación web sencilla para organizar tareas con fecha, hora, prioridad y recordatorios. Los datos se guardan en el navegador (`localStorage`); no requiere backend ni instalación de dependencias.

## Características

- **Alta y edición de tareas**: actividad, fecha, hora, prioridad (baja / media / alta), aviso previo (al momento o 5–30 minutos antes) y opción de alarma de cumplimiento.
- **Notificaciones del sistema**: botón para solicitar permiso y alertas cuando corresponde (requiere contexto seguro; ver más abajo).
- **Lista de tareas** con estados visuales: pendiente, próxima, urgente, completada, y leyenda de prioridades.
- **Filtros**: búsqueda por nombre, estado, fecha, prioridad, periodo rápido (hoy / esta semana) y botón para limpiar filtros.
- **Calendario visual**: vista mensual y semanal, navegación por mes y selección de día para acotar la vista.
- **Área de mensajes** para alertas y recordatorios en la propia página.

## Tecnologías

HTML5, CSS y JavaScript vanilla (sin frameworks ni bundler).

## Cómo usar el proyecto

1. Clona o descarga el repositorio.
2. Abre `index.html` en un navegador moderno **o** sirve la carpeta con un servidor estático (recomendado si quieres probar notificaciones de forma fiable):

   ```bash
   cd cronograma
   python3 -m http.server 8080
   ```

   Luego visita `http://localhost:8080` en el navegador.

Las tareas se almacenan bajo la clave `agenda-tareas-web` en el almacenamiento local del sitio (mismo origen que la página).

## Notificaciones del navegador

La API de notificaciones suele exigir un **contexto seguro** (por ejemplo `https://` o `http://localhost`). Si las notificaciones no aparecen al abrir el archivo directamente desde el disco, usa un servidor local como en el ejemplo anterior.

## Estructura del repositorio

| Archivo      | Rol                          |
| ------------ | ---------------------------- |
| `index.html` | Estructura y textos de la UI |
| `styles.css` | Estilos                      |
| `app.js`     | Lógica, persistencia y UI    |
