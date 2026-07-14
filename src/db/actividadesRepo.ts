import { getDb } from './database';
import { ActividadRecurrente } from '../types';

export async function listarActividades(): Promise<ActividadRecurrente[]> {
  const db = await getDb();
  return db.getAllAsync<ActividadRecurrente>(
    'SELECT * FROM actividades_recurrentes WHERE activo = 1 ORDER BY dia_semana, hora_inicio;'
  );
}

export async function crearActividad(a: Omit<ActividadRecurrente, 'id' | 'activo'>): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO actividades_recurrentes (titulo, categoria, dia_semana, hora_inicio, hora_fin, lugar, color, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1);`,
    [a.titulo, a.categoria, a.dia_semana, a.hora_inicio, a.hora_fin, a.lugar ?? null, a.color ?? null]
  );
  return result.lastInsertRowId;
}

/**
 * Crea la misma actividad (mismo título, horario, categoría) en varios días de la
 * semana a la vez, para no tener que repetir el alta día por día.
 * Retorna los ids de las filas creadas, una por cada día seleccionado.
 */
export async function crearActividadEnVariosDias(
  base: Omit<ActividadRecurrente, 'id' | 'activo' | 'dia_semana'>,
  dias: ActividadRecurrente['dia_semana'][]
): Promise<number[]> {
  const ids: number[] = [];
  for (const dia of dias) {
    const id = await crearActividad({ ...base, dia_semana: dia });
    ids.push(id);
  }
  return ids;
}

export async function actualizarActividad(a: ActividadRecurrente): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE actividades_recurrentes
     SET titulo = ?, categoria = ?, dia_semana = ?, hora_inicio = ?, hora_fin = ?, lugar = ?, color = ?
     WHERE id = ?;`,
    [a.titulo, a.categoria, a.dia_semana, a.hora_inicio, a.hora_fin, a.lugar ?? null, a.color ?? null, a.id]
  );
}

export async function eliminarActividad(id: number): Promise<void> {
  const db = await getDb();
  // Borrado lógico: se marca inactivo en lugar de eliminar la fila
  await db.runAsync('UPDATE actividades_recurrentes SET activo = 0 WHERE id = ?;', [id]);
}
