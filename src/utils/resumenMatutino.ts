import * as Notifications from 'expo-notifications';
import { obtenerConfig, guardarConfig } from '../db/configRepo';
import { cancelarRecordatorio } from './notifications';
import { listarActividades } from '../db/actividadesRepo';
import { listarPendientes } from '../db/pendientesRepo';
import { fechaLocalDesdeDate, fechaLocalDesdeISO } from './tiempo';

const CLAVE_ACTIVADO = 'resumen_matutino_activado';
const CLAVE_HORA = 'resumen_matutino_hora'; // "HH:MM"
const CLAVE_NOTIF_ID = 'resumen_matutino_notification_id';

/**
 * Reprograma el resumen matutino de MAÑANA con los datos actuales.
 *
 * Nota de diseño: expo-notifications no permite recalcular el contenido de una
 * notificación ya programada (el texto se fija al momento de programarla), y usar
 * una tarea en segundo plano para recalcularlo cada madrugada es poco confiable en
 * Android (el sistema puede retrasar o saltarse tareas en segundo plano para ahorrar
 * batería). Por eso, en vez de una notificación semanal fija, se reprograma un aviso
 * puntual para "mañana a la hora configurada" cada vez que abres la app — así el
 * contenido casi siempre refleja tus datos más recientes. Si un día no abres la app,
 * simplemente no se reprograma para el día siguiente a ese.
 */
export async function reprogramarResumenMatutino(): Promise<void> {
  const activado = (await obtenerConfig(CLAVE_ACTIVADO)) === '1';
  const idPrevio = await obtenerConfig(CLAVE_NOTIF_ID);
  if (idPrevio) {
    await cancelarRecordatorio(idPrevio);
    await guardarConfig(CLAVE_NOTIF_ID, '');
  }
  if (!activado) return;

  const horaConfig = (await obtenerConfig(CLAVE_HORA)) || '07:00';
  const [h, m] = horaConfig.split(':').map(Number);

  const disparo = new Date();
  disparo.setDate(disparo.getDate() + 1);
  disparo.setHours(h, m, 0, 0);

  const diaSemanaManana = disparo.getDay();
  const fechaManiana = fechaLocalDesdeDate(disparo);

  const [actividades, pendientes] = await Promise.all([listarActividades(), listarPendientes()]);
  const actividadesManiana = actividades.filter((a) => a.dia_semana === diaSemanaManana);
  const pendientesManiana = pendientes.filter((p) => fechaLocalDesdeISO(p.fecha_limite) === fechaManiana && !p.completado);

  let cuerpo: string;
  if (actividadesManiana.length === 0 && pendientesManiana.length === 0) {
    cuerpo = 'Sin actividades ni pendientes agendados. ¡Buen día!';
  } else {
    const partes: string[] = [];
    if (actividadesManiana.length > 0) partes.push(`${actividadesManiana.length} actividad(es)`);
    if (pendientesManiana.length > 0) partes.push(`${pendientesManiana.length} pendiente(s)`);
    cuerpo = `Tienes ${partes.join(' y ')} para hoy.`;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: 'Buenos días 👋', body: cuerpo, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: disparo },
  });
  await guardarConfig(CLAVE_NOTIF_ID, id);
}

export async function activarResumenMatutino(activado: boolean, hora: string): Promise<void> {
  await guardarConfig(CLAVE_ACTIVADO, activado ? '1' : '0');
  await guardarConfig(CLAVE_HORA, hora);
  await reprogramarResumenMatutino();
}

export async function obtenerConfigResumenMatutino(): Promise<{ activado: boolean; hora: string }> {
  const activado = (await obtenerConfig(CLAVE_ACTIVADO)) === '1';
  const hora = (await obtenerConfig(CLAVE_HORA)) || '07:00';
  return { activado, hora };
}
