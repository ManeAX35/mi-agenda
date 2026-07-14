import { getDb } from './database';
import { TareaDia } from '../types';

export async function listarTareasPorFecha(fecha: string): Promise<TareaDia[]> {
  const db = await getDb();
  return db.getAllAsync<TareaDia>('SELECT * FROM tareas_dia WHERE fecha = ? ORDER BY id;', [fecha]);
}

export async function crearTarea(titulo: string, fecha: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO tareas_dia (titulo, fecha, completado) VALUES (?, ?, 0);',
    [titulo, fecha]
  );
  return result.lastInsertRowId;
}

export async function marcarTareaCompletada(id: number, completado: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE tareas_dia SET completado = ? WHERE id = ?;', [completado ? 1 : 0, id]);
}

export async function eliminarTarea(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tareas_dia WHERE id = ?;', [id]);
}
