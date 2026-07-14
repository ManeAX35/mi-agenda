import { getDb } from './database';
import { Pendiente } from '../types';
import {
  cancelarRecordatoriosProgramados,
  programarRecordatoriosPendiente,
  parsearRecordatorios,
  serializarRecordatorios,
} from '../utils/notifications';

export async function listarPendientes(incluirCompletados = false): Promise<Pendiente[]> {
  const db = await getDb();
  if (incluirCompletados) {
    return db.getAllAsync<Pendiente>('SELECT * FROM pendientes ORDER BY fecha_limite ASC;');
  }
  return db.getAllAsync<Pendiente>(
    'SELECT * FROM pendientes WHERE completado = 0 ORDER BY fecha_limite ASC;'
  );
}

type DatosPendiente = Omit<
  Pendiente,
  'id' | 'completado' | 'notification_id' | 'notification_id_2' | 'recordatorio_minutos_antes' | 'recordatorios_json' | 'recordatorios_activados'
> & {
  recordatoriosMinutos: number[];
};

export async function crearPendiente(p: DatosPendiente): Promise<number> {
  const db = await getDb();
  const recordatorios = await programarRecordatoriosPendiente(p.titulo, p.fecha_limite, p.recordatoriosMinutos);

  const result = await db.runAsync(
    `INSERT INTO pendientes (titulo, descripcion, fecha_limite, recordatorio_minutos_antes, notification_id, notification_id_2, recordatorios_activados, recordatorios_json, completado, tipo)
     VALUES (?, ?, ?, NULL, NULL, NULL, ?, ?, 0, ?);`,
    [p.titulo, p.descripcion ?? null, p.fecha_limite, p.recordatoriosMinutos.length > 0 ? 1 : 0, serializarRecordatorios(recordatorios), p.tipo]
  );
  return result.lastInsertRowId;
}

export async function actualizarPendiente(p: Pendiente & { recordatoriosMinutos: number[] }): Promise<void> {
  const db = await getDb();
  await cancelarRecordatoriosProgramados(parsearRecordatorios(p.recordatorios_json));
  const recordatorios = await programarRecordatoriosPendiente(p.titulo, p.fecha_limite, p.recordatoriosMinutos);

  await db.runAsync(
    `UPDATE pendientes
     SET titulo = ?, descripcion = ?, fecha_limite = ?, recordatorios_activados = ?, recordatorios_json = ?, tipo = ?
     WHERE id = ?;`,
    [p.titulo, p.descripcion ?? null, p.fecha_limite, p.recordatoriosMinutos.length > 0 ? 1 : 0, serializarRecordatorios(recordatorios), p.tipo, p.id]
  );
}

export async function marcarCompletado(id: number, completado: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE pendientes SET completado = ? WHERE id = ?;', [completado ? 1 : 0, id]);
}

export async function eliminarPendiente(id: number, recordatoriosJson?: string | null): Promise<void> {
  const db = await getDb();
  await cancelarRecordatoriosProgramados(parsearRecordatorios(recordatoriosJson));
  await db.runAsync('DELETE FROM pendientes WHERE id = ?;', [id]);
}
