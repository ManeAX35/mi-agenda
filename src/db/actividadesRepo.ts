import { getDb } from './database';
import { ActividadRecurrente, DiaSemana } from '../types';
import { seTraslapan } from '../utils/tiempo';
import {
  programarRecordatoriosActividad,
  cancelarRecordatoriosProgramados,
  parsearRecordatorios,
  serializarRecordatorios,
} from '../utils/notifications';

/**
 * Regresa las actividades del mismo día que se traslapan en horario con el rango dado.
 * Se usa para bloquear la creación/edición de una actividad recurrente que chocaría
 * con otra ya existente (p. ej. dos clases al mismo tiempo el mismo día).
 */
export function actividadesEnConflicto(
  actividades: ActividadRecurrente[],
  diaSemana: DiaSemana,
  horaInicio: string,
  horaFin: string,
  excludeId?: number
): ActividadRecurrente[] {
  return actividades.filter(
    (a) =>
      a.dia_semana === diaSemana &&
      a.id !== excludeId &&
      seTraslapan(horaInicio, horaFin, a.hora_inicio, a.hora_fin)
  );
}

export async function listarActividades(): Promise<ActividadRecurrente[]> {
  const db = await getDb();
  return db.getAllAsync<ActividadRecurrente>(
    'SELECT * FROM actividades_recurrentes WHERE activo = 1 ORDER BY dia_semana, hora_inicio;'
  );
}

type DatosActividad = Omit<ActividadRecurrente, 'id' | 'activo' | 'recordatorios_json'> & {
  recordatoriosMinutos: number[];
};

export async function crearActividad(a: DatosActividad): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO actividades_recurrentes (titulo, categoria, dia_semana, hora_inicio, hora_fin, lugar, color, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1);`,
    [a.titulo, a.categoria, a.dia_semana, a.hora_inicio, a.hora_fin, a.lugar ?? null, a.color ?? null]
  );
  const id = result.lastInsertRowId;

  // Si programar los recordatorios falla (ej. falta el permiso de "Alarmas y
  // recordatorios" en Android), la actividad IGUAL se guarda — simplemente sin avisos.
  // Nunca debe perderse el registro por un problema de notificaciones.
  try {
    const recordatorios = await programarRecordatoriosActividad(a.titulo, a.dia_semana, a.hora_inicio, a.recordatoriosMinutos);
    await db.runAsync('UPDATE actividades_recurrentes SET recordatorios_json = ? WHERE id = ?;', [
      serializarRecordatorios(recordatorios),
      id,
    ]);
  } catch (e) {
    console.error('No se pudieron programar los recordatorios de la actividad (se guardó sin avisos):', e);
  }

  return id;
}

/**
 * Crea la misma actividad (mismo título, horario, categoría) en varios días de la
 * semana a la vez, para no tener que repetir el alta día por día.
 * Retorna los ids de las filas creadas, una por cada día seleccionado.
 */
export async function crearActividadEnVariosDias(
  base: Omit<DatosActividad, 'dia_semana'>,
  dias: ActividadRecurrente['dia_semana'][]
): Promise<number[]> {
  const ids: number[] = [];
  for (const dia of dias) {
    const id = await crearActividad({ ...base, dia_semana: dia });
    ids.push(id);
  }
  return ids;
}

export async function actualizarActividad(a: ActividadRecurrente & { recordatoriosMinutos: number[] }): Promise<void> {
  const db = await getDb();

  let recordatoriosJson: string | null = a.recordatorios_json ?? null;
  try {
    // Cancela los recordatorios viejos (con el horario/día anterior) y programa los nuevos
    await cancelarRecordatoriosProgramados(parsearRecordatorios(a.recordatorios_json));
    const recordatorios = await programarRecordatoriosActividad(a.titulo, a.dia_semana, a.hora_inicio, a.recordatoriosMinutos);
    recordatoriosJson = serializarRecordatorios(recordatorios);
  } catch (e) {
    console.error('No se pudieron reprogramar los recordatorios de la actividad (se guardó igual):', e);
  }

  await db.runAsync(
    `UPDATE actividades_recurrentes
     SET titulo = ?, categoria = ?, dia_semana = ?, hora_inicio = ?, hora_fin = ?, lugar = ?, color = ?, recordatorios_json = ?
     WHERE id = ?;`,
    [a.titulo, a.categoria, a.dia_semana, a.hora_inicio, a.hora_fin, a.lugar ?? null, a.color ?? null, recordatoriosJson, a.id]
  );
}

export async function eliminarActividad(id: number): Promise<void> {
  const db = await getDb();
  const fila = await db.getFirstAsync<ActividadRecurrente>('SELECT * FROM actividades_recurrentes WHERE id = ?;', [id]);
  if (fila) {
    await cancelarRecordatoriosProgramados(parsearRecordatorios(fila.recordatorios_json));
  }
  // Borrado lógico: se marca inactivo en lugar de eliminar la fila
  await db.runAsync('UPDATE actividades_recurrentes SET activo = 0 WHERE id = ?;', [id]);
}
