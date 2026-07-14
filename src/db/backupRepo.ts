import { getDb } from './database';
import {
  parsearRecordatorios,
  serializarRecordatorios,
  programarRecordatoriosPendiente,
  programarRecordatoriosActividad,
} from '../utils/notifications';

interface RespaldoJSON {
  version: number;
  exportado_en: string;
  actividades_recurrentes: any[];
  pendientes: any[];
  tareas_dia: any[];
  diario: any[];
  configuracion: any[];
}

/** Junta todas las tablas en un solo objeto JSON, listo para compartir/guardar. */
export async function generarRespaldoJSON(): Promise<string> {
  const db = await getDb();
  const [actividades, pendientes, tareas, diario, configuracion] = await Promise.all([
    db.getAllAsync<any>('SELECT * FROM actividades_recurrentes;'),
    db.getAllAsync<any>('SELECT * FROM pendientes;'),
    db.getAllAsync<any>('SELECT * FROM tareas_dia;'),
    db.getAllAsync<any>('SELECT * FROM diario;'),
    db.getAllAsync<any>('SELECT * FROM configuracion;'),
  ]);
  const respaldo: RespaldoJSON = {
    version: 1,
    exportado_en: new Date().toISOString(),
    actividades_recurrentes: actividades,
    pendientes,
    tareas_dia: tareas,
    diario,
    configuracion,
  };
  return JSON.stringify(respaldo, null, 2);
}

/**
 * Reemplaza TODOS los datos actuales con los del respaldo. Se asume que la pantalla
 * que llama a esto ya pidió confirmación explícita al usuario antes.
 */
export async function restaurarDesdeJSON(contenido: string): Promise<void> {
  let datos: RespaldoJSON;
  try {
    datos = JSON.parse(contenido);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!datos || typeof datos !== 'object' || !Array.isArray(datos.pendientes)) {
    throw new Error('El archivo no tiene el formato esperado de un respaldo de Mi Agenda.');
  }

  const db = await getDb();

  await db.execAsync(`
    DELETE FROM actividades_recurrentes;
    DELETE FROM pendientes;
    DELETE FROM tareas_dia;
    DELETE FROM diario;
    DELETE FROM configuracion;
  `);

  for (const a of datos.actividades_recurrentes || []) {
    await db.runAsync(
      `INSERT INTO actividades_recurrentes (id, titulo, categoria, dia_semana, hora_inicio, hora_fin, lugar, color, activo, recordatorios_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [a.id, a.titulo, a.categoria, a.dia_semana, a.hora_inicio, a.hora_fin, a.lugar ?? null, a.color ?? null, a.activo, a.recordatorios_json ?? null]
    );
  }
  for (const p of datos.pendientes || []) {
    await db.runAsync(
      `INSERT INTO pendientes (id, titulo, descripcion, fecha_limite, recordatorio_minutos_antes, notification_id, notification_id_2, recordatorios_activados, recordatorios_json, completado, tipo, repetir)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        p.id,
        p.titulo,
        p.descripcion ?? null,
        p.fecha_limite,
        p.recordatorio_minutos_antes ?? null,
        p.notification_id ?? null,
        p.notification_id_2 ?? null,
        p.recordatorios_activados ?? 0,
        p.recordatorios_json ?? null,
        p.completado,
        p.tipo,
        p.repetir ?? null,
      ]
    );
  }
  for (const t of datos.tareas_dia || []) {
    await db.runAsync(
      'INSERT INTO tareas_dia (id, titulo, fecha, completado) VALUES (?, ?, ?, ?);',
      [t.id, t.titulo, t.fecha, t.completado]
    );
  }
  for (const d of datos.diario || []) {
    await db.runAsync(
      'INSERT INTO diario (id, fecha, contenido, actualizado_en) VALUES (?, ?, ?, ?);',
      [d.id, d.fecha, d.contenido, d.actualizado_en]
    );
  }
  for (const c of datos.configuracion || []) {
    await db.runAsync('INSERT INTO configuracion (clave, valor) VALUES (?, ?);', [c.clave, c.valor]);
  }

  // Los ids de notificaciones guardados en el respaldo ya no apuntan a nada real (esas
  // notificaciones no sobreviven a una restauración), así que se reprograman de cero
  // para que los recordatorios sigan funcionando.
  await reprogramarTodosLosRecordatorios();
}

async function reprogramarTodosLosRecordatorios(): Promise<void> {
  const db = await getDb();

  const actividades = await db.getAllAsync<any>('SELECT * FROM actividades_recurrentes WHERE activo = 1;');
  for (const a of actividades) {
    const minutos = parsearRecordatorios(a.recordatorios_json).map((r) => r.minutos);
    const nuevos = await programarRecordatoriosActividad(a.titulo, a.dia_semana, a.hora_inicio, minutos);
    await db.runAsync('UPDATE actividades_recurrentes SET recordatorios_json = ? WHERE id = ?;', [
      serializarRecordatorios(nuevos),
      a.id,
    ]);
  }

  const pendientes = await db.getAllAsync<any>('SELECT * FROM pendientes WHERE completado = 0;');
  for (const p of pendientes) {
    const minutos = parsearRecordatorios(p.recordatorios_json).map((r) => r.minutos);
    if (minutos.length === 0) continue;
    const nuevos = await programarRecordatoriosPendiente(p.titulo, p.fecha_limite, minutos);
    await db.runAsync('UPDATE pendientes SET recordatorios_json = ? WHERE id = ?;', [
      serializarRecordatorios(nuevos),
      p.id,
    ]);
  }
}
