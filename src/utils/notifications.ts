import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
