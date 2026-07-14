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

  let recordatorios: { minutos: number; id: string }[] = [];
  try {
    recordatorios = await programarRecordatoriosPendiente(p.titulo, p.fecha_limite, p.recordatoriosMinutos);
  } catch (e) {
    console.error('No se pudieron programar los recordatorios del pendiente (se guardó sin avisos):', e);
  }

  const result = await db.runAsync(
    `INSERT INTO pendientes (titulo, descripcion, fecha_limite, recordatorio_minutos_antes, notification_id, notification_id_2, recordatorios_activados, recordatorios_json, completado, tipo, repetir)
     VALUES (?, ?, ?, NULL, NULL, NULL, ?, ?, 0, ?, ?);`,
    [p.titulo, p.descripcion ?? null, p.fecha_limite, p.recordatoriosMinutos.length > 0 ? 1 : 0, serializarRecordatorios(recordatorios), p.tipo, p.repetir ?? null]
  );
  return result.lastInsertRowId;
}

export async function actualizarPendiente(p: Pendiente & { recordatoriosMinutos: number[] }): Promise<void> {
  const db = await getDb();

  let recordatoriosJson: string | null = p.recordatorios_json ?? null;
  try {
    await cancelarRecordatoriosProgramados(parsearRecordatorios(p.recordatorios_json));
    const recordatorios = await programarRecordatoriosPendiente(p.titulo, p.fecha_limite, p.recordatoriosMinutos);
    recordatoriosJson = serializarRecordatorios(recordatorios);
  } catch (e) {
    console.error('No se pudieron reprogramar los recordatorios del pendiente (se guardó igual):', e);
  }

  await db.runAsync(
    `UPDATE pendientes
     SET titulo = ?, descripcion = ?, fecha_limite = ?, recordatorios_activados = ?, recordatorios_json = ?, tipo = ?, repetir = ?
     WHERE id = ?;`,
    [p.titulo, p.descripcion ?? null, p.fecha_limite, p.recordatoriosMinutos.length > 0 ? 1 : 0, recordatoriosJson, p.tipo, p.repetir ?? null, p.id]
  );
}

function calcularSiguienteFecha(fechaISO: string, repetir: 'semanal' | 'mensual'): string {
  const f = new Date(fechaISO);
  if (repetir === 'semanal') {
    f.setDate(f.getDate() + 7);
  } else {
    f.setMonth(f.getMonth() + 1);
  }
  return f.toISOString();
}

/**
 * Marca un pendiente como completado o no. Si se marca como completado Y el pendiente
 * es recurrente (repetir = 'semanal'|'mensual'), crea automáticamente la siguiente
 * ocurrencia (misma info, nueva fecha), con sus propios recordatorios programados.
 */
export async function marcarCompletado(id: number, completado: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE pendientes SET completado = ? WHERE id = ?;', [completado ? 1 : 0, id]);

  if (completado) {
    const fila = await db.getFirstAsync<Pendiente>('SELECT * FROM pendientes WHERE id = ?;', [id]);
    if (fila?.repetir === 'semanal' || fila?.repetir === 'mensual') {
      const siguienteFecha = calcularSiguienteFecha(fila.fecha_limite, fila.repetir);
      const minutos = parsearRecordatorios(fila.recordatorios_json).map((r) => r.minutos);
      await crearPendiente({
        titulo: fila.titulo,
        descripcion: fila.descripcion,
        fecha_limite: siguienteFecha,
        tipo: fila.tipo,
        repetir: fila.repetir,
        recordatoriosMinutos: minutos,
      });
    }
  }
}

export async function eliminarPendiente(id: number, recordatoriosJson?: string | null): Promise<void> {
  const db = await getDb();
  await cancelarRecordatoriosProgramados(parsearRecordatorios(recordatoriosJson));
  await db.runAsync('DELETE FROM pendientes WHERE id = ?;', [id]);
}
