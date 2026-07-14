import { getDb } from './database';

export async function obtenerConfig(clave: string): Promise<string | null> {
  const db = await getDb();
  const fila = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM configuracion WHERE clave = ?;', [clave]);
  return fila?.valor ?? null;
}

export async function guardarConfig(clave: string, valor: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor;`,
    [clave, valor]
  );
}
