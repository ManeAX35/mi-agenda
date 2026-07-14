import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { obtenerConfig, guardarConfig } from '../db/configRepo';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function pedirPermisos(): Promise<boolean> {
  const { status: existente } = await Notifications.getPermissionsAsync();
  let status = existente;
  if (existente !== 'granted') {
    const { status: nuevo } = await Notifications.requestPermissionsAsync();
    status = nuevo;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Recordatorios de Agenda',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  return status === 'granted';
}

/**
 * Programa un recordatorio local para una fecha límite, X minutos antes.
 * Retorna el id de la notificación (para poder cancelarla luego) o null si la
 * fecha calculada ya pasó.
 */
export async function programarRecordatorio(
  titulo: string,
  fechaLimiteISO: string,
  minutosAntes: number
): Promise<string | null> {
  const fechaLimite = new Date(fechaLimiteISO);
  const fechaDisparo = new Date(fechaLimite.getTime() - minutosAntes * 60 * 1000);

  if (fechaDisparo.getTime() <= Date.now()) {
    // La fecha de recordatorio ya pasó, no se programa nada
    return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recordatorio: ' + titulo,
      body:
        minutosAntes >= 1440
          ? `Vence en ${Math.round(minutosAntes / 1440)} día(s)`
          : minutosAntes >= 60
          ? `Vence en ${Math.round(minutosAntes / 60)} hora(s)`
          : `Vence en ${minutosAntes} minuto(s)`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fechaDisparo,
    },
  });
  return id;
}

export async function cancelarRecordatorio(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Si ya no existe, no pasa nada
  }
}

/** Opciones de recordatorio disponibles para elegir (en minutos antes del evento). */
export const OPCIONES_RECORDATORIO_MINUTOS = [15, 30, 60, 120, 1440, 2880];

export function etiquetaRecordatorio(minutos: number): string {
  if (minutos < 60) return `${minutos} min antes`;
  if (minutos < 1440) return `${minutos / 60} hora${minutos === 60 ? '' : 's'} antes`;
  return `${minutos / 1440} día${minutos === 1440 ? '' : 's'} antes`;
}

export interface RecordatorioProgramado {
  minutos: number;
  id: string;
}

export function serializarRecordatorios(lista: RecordatorioProgramado[]): string {
  return JSON.stringify(lista);
}

export function parsearRecordatorios(json: string | null | undefined): RecordatorioProgramado[] {
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export async function cancelarRecordatoriosProgramados(lista: RecordatorioProgramado[] | null | undefined): Promise<void> {
  if (!lista) return;
  for (const r of lista) {
    await cancelarRecordatorio(r.id);
  }
}

/**
 * Programa varios recordatorios puntuales (uno por cada valor en minutosAntes) para un
 * pendiente con fecha límite fija. Los que ya hubieran pasado se omiten automáticamente.
 */
export async function programarRecordatoriosPendiente(
  titulo: string,
  fechaLimiteISO: string,
  minutosAntesLista: number[]
): Promise<RecordatorioProgramado[]> {
  const resultado: RecordatorioProgramado[] = [];
  for (const minutos of minutosAntesLista) {
    const id = await programarRecordatorio(titulo, fechaLimiteISO, minutos);
    if (id) resultado.push({ minutos, id });
  }
  return resultado;
}

/**
 * Programa un recordatorio SEMANAL recurrente (se repite cada semana, indefinidamente)
 * para una actividad recurrente, un número de minutos antes de su hora de inicio.
 * Usa el tipo de trigger "weekly" de expo-notifications: weekday va de 1 (domingo) a 7
 * (sábado), igual que Date.getDay() + 1.
 */
async function programarRecordatorioSemanal(
  titulo: string,
  diaSemana: number,
  horaInicio: string,
  minutosAntes: number
): Promise<string> {
  const [h, m] = horaInicio.split(':').map(Number);
  let totalMin = h * 60 + m - minutosAntes;
  let diaAjustado = diaSemana;
  if (totalMin < 0) {
    // El recordatorio cae el día anterior (ej. clase a las 6am, recordatorio de 1 día antes)
    const diasAtras = Math.ceil(-totalMin / (24 * 60));
    totalMin += diasAtras * 24 * 60;
    diaAjustado = (((diaSemana - diasAtras) % 7) + 7) % 7;
  }
  const horaFinal = Math.floor(totalMin / 60) % 24;
  const minFinal = totalMin % 60;
  const weekday = diaAjustado + 1; // expo-notifications: 1=domingo ... 7=sábado

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recordatorio: ' + titulo,
      body: minutosAntes >= 60 ? `Empieza en ${Math.round(minutosAntes / 60)} hora(s)` : `Empieza en ${minutosAntes} minuto(s)`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour: horaFinal,
      minute: minFinal,
    },
  });
  return id;
}

/** Programa varios recordatorios semanales (uno por cada valor en minutosAntes) para una actividad recurrente. */
export async function programarRecordatoriosActividad(
  titulo: string,
  diaSemana: number,
  horaInicio: string,
  minutosAntesLista: number[]
): Promise<RecordatorioProgramado[]> {
  const resultado: RecordatorioProgramado[] = [];
  for (const minutos of minutosAntesLista) {
    const id = await programarRecordatorioSemanal(titulo, diaSemana, horaInicio, minutos);
    resultado.push({ minutos, id });
  }
  return resultado;
}
