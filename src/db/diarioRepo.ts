import { getDb } from './database';
import { EntradaDiario } from '../types';
import { fechaLocalDesdeDate } from '../utils/tiempo';

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

/** Fechas (como set de strings "YYYY-MM-DD") que tienen algo escrito en el diario. */
export async function listarFechasConDiarioEscrito(limite = 120): Promise<string[]> {
  const db = await getDb();
  const filas = await db.getAllAsync<{ fecha: string }>(
    "SELECT fecha FROM diario WHERE TRIM(contenido) != '' ORDER BY fecha DESC LIMIT ?;",
    [limite]
  );
  return filas.map((f) => f.fecha);
}

/**
 * Cuenta los días consecutivos más recientes con algo escrito en el diario (racha).
 * Si hoy todavía no escribes nada, no rompe la racha (se cuenta desde ayer) — se
 * "rompe" hasta que pase un día completo sin escribir.
 */
export async function calcularRachaDiario(): Promise<number> {
  const db = await getDb();
  const filas = await db.getAllAsync<{ fecha: string }>(
    "SELECT fecha FROM diario WHERE TRIM(contenido) != '' ORDER BY fecha DESC;"
  );
  const fechasConTexto = new Set(filas.map((f) => f.fecha));

  const cursor = new Date();
  const hoyStr = fechaLocalDesdeDate(cursor);
  if (!fechasConTexto.has(hoyStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let racha = 0;
  while (fechasConTexto.has(fechaLocalDesdeDate(cursor))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

/**
 * Regresa las fechas (más recientes primero) que tienen diario escrito Y/O tareas
 * agregadas, para poder listar el "historial" del día combinando ambas cosas aunque
 * el usuario solo haya usado una de las dos funciones ese día.
 */
export async function listarFechasConActividad(limite = 60): Promise<string[]> {
  const db = await getDb();
  const filas = await db.getAllAsync<{ fecha: string }>(
    `SELECT fecha FROM diario
     UNION
     SELECT DISTINCT fecha FROM tareas_dia
     ORDER BY fecha DESC
     LIMIT ?;`,
    [limite]
  );
  return filas.map((f) => f.fecha);
}
