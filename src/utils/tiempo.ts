export function minutosDesdeMedianoche(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Dos rangos [inicio1,fin1) y [inicio2,fin2) se traslapan si uno empieza antes de que el otro termine, en ambos sentidos. */
export function seTraslapan(inicio1: string, fin1: string, inicio2: string, fin2: string): boolean {
  return minutosDesdeMedianoche(inicio1) < minutosDesdeMedianoche(fin2) &&
    minutosDesdeMedianoche(inicio2) < minutosDesdeMedianoche(fin1);
}
