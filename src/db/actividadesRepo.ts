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
