import { getDb } from './database';
import { EntradaDiario } from '../types';

export async function obtenerEntrada(fecha: string): Promise<EntradaDiario | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EntradaDiario>('SELECT * FROM diario WHERE fecha = ?;', [fecha]);
  return row ?? null;
}

export async function guardarEntrada(fecha: string, contenido: string): Promise<void> {
  const db = await getDb();
  const ahora = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO diario (fecha, contenido, actualizado_en) VALUES (?, ?, ?)
     ON CONFLICT(fecha) DO UPDATE SET contenido = excluded.contenido, actualizado_en = excluded.actualizado_en;`,
    [fecha, contenido, ahora]
  );
}

export async function listarEntradasRecientes(limite = 30): Promise<EntradaDiario[]> {
  const db = await getDb();
  return db.getAllAsync<EntradaDiario>(
    'SELECT * FROM diario ORDER BY fecha DESC LIMIT ?;',
    [limite]
  );
}
