import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('agenda.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await initSchema(db);
  return db;
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
  `);
}
