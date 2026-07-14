# Roadmap — ideas para el futuro

Cosas que quedaron identificadas pero fuera de alcance por ahora, o que podrían valer
la pena más adelante. Ninguna es urgente — la app ya es completamente funcional sin
ellas.

## Con buen impacto, relativamente rápidas de agregar

- **Buscador de texto libre** — encontrar cualquier actividad, pendiente, o entrada de
  diario escribiendo una palabra clave (ej. "renta", "cálculo"). Se descartó por ahora
  porque con el volumen de datos actual no se siente necesario; vale la pena revisitarlo
  en unos meses cuando haya más historial acumulado.
- **Actividades recurrentes con excepciones** — poder decir "esta semana no hay clase"
  sin tener que borrar y volver a crear la actividad.
- **Editar/eliminar entradas de diario pasadas más a fondo** — hoy se puede, pero podría
  tener mejor UX (deshacer, historial de ediciones).
- **Deep link más granular en el widget de Tareas** — que abra directo el día de hoy
  dentro de Diario en vez de solo la pestaña.

## Requieren más trabajo

- **Sincronización en la nube (opcional)** — hoy todo vive local en el teléfono
  (por diseño, y lo mantendría así por default). Si algún día se quiere, la opción más
  simple sería Supabase o Firebase como backend opcional, sin reemplazar el modo local.
- **Vencimiento / calendario de cobranza tipo el de MAOSA Cartera** — aplicar el mismo
  concepto de "días para vencer" a los pendientes de tipo pago, con colores según
  urgencia.
- **Modo tablet / pantallas grandes** — el diseño actual está pensado para teléfono;
  el horario semanal y la línea de tiempo podrían aprovechar más espacio en tablet.
- **Notificaciones más inteligentes** — agrupar varias notificaciones del mismo momento
  en una sola ("3 cosas a las 9am") en vez de mandarlas por separado.

## Ideas más pequeñas / pulido

- Confirmar visualmente cuándo se guardó el diario (ahorita dice "Guardando..." /
  "Guardar entrada", podría dar un check momentáneo de "Guardado ✓").
- Exportar un pendiente o actividad individual a un archivo `.ics` de calendario, para
  importarlo a Google Calendar si algún día se quiere.
- Widget de "próxima actividad" (una sola, la más cercana) para pantallas de reloj/AOD
  o launchers minimalistas.
- Estadísticas simples: cuántos pendientes completaste este mes, cuántos días
  escribiste diario, etc. — un mini dashboard de hábitos.

---

Si alguna de estas te late en el futuro, la retomamos desde aquí.
