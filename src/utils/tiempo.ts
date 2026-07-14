export function minutosDesdeMedianoche(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Fecha "YYYY-MM-DD" en hora LOCAL de un objeto Date.
 *
 * IMPORTANTE: nunca uses `date.toISOString().slice(0, 10)` para esto — toISOString()
 * convierte a UTC primero, así que en zonas horarias detrás de UTC (como México,
 * UTC-6) el resultado se adelanta un día durante la tarde/noche (ej. las 8pm de hoy
 * en Morelia ya son las 2am de "mañana" en UTC). Esta función usa los getters locales
 * de Date (getFullYear/getMonth/getDate) para evitar ese corrimiento.
 */
export function fechaLocalDesdeDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Fecha "YYYY-MM-DD" de HOY en hora local (ver nota de fechaLocalDesdeDate). */
export function hoyLocalISO(): string {
  return fechaLocalDesdeDate(new Date());
}

/**
 * Extrae la fecha "YYYY-MM-DD" en hora LOCAL de un ISO string guardado en la base de
 * datos (ej. fecha_limite de un pendiente, que se guarda con toISOString() = UTC).
 * Nunca uses `.slice(0, 10)` directo sobre ese string — daría la fecha en UTC, no la
 * fecha/hora que el usuario realmente eligió.
 */
export function fechaLocalDesdeISO(iso: string): string {
  return fechaLocalDesdeDate(new Date(iso));
}

/** Extrae la hora "HH:MM" en hora LOCAL de un ISO string guardado en la base de datos. */
export function horaLocalDesdeISO(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Dos rangos [inicio1,fin1) y [inicio2,fin2) se traslapan si uno empieza antes de que el otro termine, en ambos sentidos. */
export function seTraslapan(inicio1: string, fin1: string, inicio2: string, fin2: string): boolean {
  return minutosDesdeMedianoche(inicio1) < minutosDesdeMedianoche(fin2) &&
    minutosDesdeMedianoche(inicio2) < minutosDesdeMedianoche(fin1);
}
