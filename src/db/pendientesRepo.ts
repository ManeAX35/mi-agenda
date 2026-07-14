import { getDb } from './database';
import { Pendiente } from '../types';
import { cancelarRecordatorio, programarRecordatorio } from '../utils/notifications';

export async function listarPendientes(incluirCompletados = false): Promise<Pendiente[]> {
  const db = await getDb();
  if (incluirCompletados) {
    return db.getAllAsync<Pendiente>('SELECT * FROM pendientes ORDER BY fecha_limite ASC;');
  }
  return db.getAllAsync<Pendiente>(
    'SELECT * FROM pendientes WHERE completado = 0 ORDER BY fecha_limite ASC;'
  );
}

export async function crearPendiente(
  p: Omit<Pendiente, 'id' | 'completado' | 'notification_id'>
): Promise<number> {
  const db = await getDb();
  let notificationId: string | null = null;
  if (p.recordatorio_minutos_antes != null) {
    notificationId = await programarRecordatorio(p.titulo, p.fecha_limite, p.recordatorio_minutos_antes);
  }
  const result = await db.runAsync(
    `INSERT INTO pendientes (titulo, descripcion, fecha_limite, recordatorio_minutos_antes, notification_id, completado, tipo)
     VALUES (?, ?, ?, ?, ?, 0, ?);`,
    [p.titulo, p.descripcion ?? null, p.fecha_limite, p.recordatorio_minutos_antes, notificationId, p.tipo]
  );
  return result.lastInsertRowId;
}

export async function actualizarPendiente(p: Pendiente): Promise<void> {
  const db = await getDb();
  if (p.notification_id) {
    await cancelarRecordatorio(p.notification_id);
  }
  let notificationId: string | null = null;
  if (p.recordatorio_minutos_antes != null) {
    notificationId = await programarRecordatorio(p.titulo, p.fecha_limite, p.recordatorio_minutos_antes);
  }
  await db.runAsync(
    `UPDATE pendientes
     SET titulo = ?, descripcion = ?, fecha_limite = ?, recordatorio_minutos_antes = ?, notification_id = ?, tipo = ?
     WHERE id = ?;`,
    [p.titulo, p.descripcion ?? null, p.fecha_limite, p.recordatorio_minutos_antes, notificationId, p.tipo, p.id]
  );
}

export async function marcarCompletado(id: number, completado: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE pendientes SET completado = ? WHERE id = ?;', [completado ? 1 : 0, id]);
}

export async function eliminarPendiente(id: number, notificationId?: string | null): Promise<void> {
  const db = await getDb();
  if (notificationId) {
    await cancelarRecordatorio(notificationId);
  }
  await db.runAsync('DELETE FROM pendientes WHERE id = ?;', [id]);
}
