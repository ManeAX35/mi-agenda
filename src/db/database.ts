import * as SQLite from 'expo-sqlite';

// IMPORTANTE: se cachea la PROMESA completa (apertura + migraciones), no solo el
// resultado final. Si se cacheara únicamente el objeto `db` after abrir pero antes de
// terminar las migraciones, dos pantallas pidiendo la base casi al mismo tiempo al
// arrancar la app podrían "ganarle" a las migraciones: una espera a que todo termine,
// pero la otra ve que `db` ya existe y sale a consultar contra tablas/columnas que
// todavía no se habían terminado de crear. Cacheando la promesa, TODAS las llamadas
// esperan a que la apertura + migraciones terminen antes de recibir la conexión.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await SQLite.openDatabaseAsync('agenda.db');
      await database.execAsync('PRAGMA journal_mode = WAL;');
      await initSchema(database);
      return database;
    })();
  }
  return dbPromise;
}

async function initSchema(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS actividades_recurrentes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'Otro',
      dia_semana INTEGER NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fin TEXT NOT NULL,
      lugar TEXT,
      color TEXT,
      activo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS pendientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      fecha_limite TEXT NOT NULL,
      recordatorio_minutos_antes INTEGER,
      notification_id TEXT,
      completado INTEGER NOT NULL DEFAULT 0,
      tipo TEXT NOT NULL DEFAULT 'otro'
    );

    CREATE TABLE IF NOT EXISTS tareas_dia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      fecha TEXT NOT NULL,
      completado INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS diario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL UNIQUE,
      contenido TEXT NOT NULL DEFAULT '',
      actualizado_en TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);

  // Migraciones aditivas: agregan columnas nuevas para el recordatorio doble
  // (1 hora y 30 min antes) sin tocar los datos que ya existan.
  // SQLite no soporta "ADD COLUMN IF NOT EXISTS", así que se intenta y se
  // ignora el error si la columna ya fue agregada en una corrida anterior.
  const migraciones = [
    'ALTER TABLE actividades_recurrentes ADD COLUMN notification_id_1h TEXT;',
    'ALTER TABLE actividades_recurrentes ADD COLUMN notification_id_30m TEXT;',
    'ALTER TABLE actividades_recurrentes ADD COLUMN recordatorios_json TEXT;',
    'ALTER TABLE pendientes ADD COLUMN notification_id_2 TEXT;',
    'ALTER TABLE pendientes ADD COLUMN recordatorios_activados INTEGER NOT NULL DEFAULT 1;',
    'ALTER TABLE pendientes ADD COLUMN recordatorios_json TEXT;',
    'ALTER TABLE pendientes ADD COLUMN repetir TEXT;', // null | 'semanal' | 'mensual'
  ];
  for (const sql of migraciones) {
    try {
      await database.execAsync(sql);
    } catch {
      // La columna ya existe (app corrida antes de esta versión) — se ignora.
    }
  }
}
