import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { AgendaWidget, EventoWidget } from './src/widgets/AgendaWidget';
import { TareasWidget, TareaWidgetItem } from './src/widgets/TareasWidget';
import { listarActividades } from './src/db/actividadesRepo';
import { listarPendientes } from './src/db/pendientesRepo';
import { listarTareasPorFecha, marcarTareaCompletada } from './src/db/tareasRepo';
import { colors } from './src/utils/theme';

const NOMBRES_DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function construirAgendaWidget(): Promise<React.JSX.Element> {
  const hoy = new Date();
  const diaSemanaHoy = hoy.getDay();
  const [actividades, pendientes] = await Promise.all([listarActividades(), listarPendientes()]);

  const hoyISOStr = hoyISO();
  const eventos: EventoWidget[] = [
    ...actividades
      .filter((a) => a.dia_semana === diaSemanaHoy)
      .map((a) => ({ titulo: a.titulo, hora: a.hora_inicio, color: a.color || colors.primario })),
    ...pendientes
      .filter((p) => p.fecha_limite.slice(0, 10) === hoyISOStr)
      .map((p) => ({ titulo: p.titulo, hora: p.fecha_limite.slice(11, 16), color: colors.acento })),
  ].sort((a, b) => a.hora.localeCompare(b.hora));

  const fechaTexto = `${capitalizar(NOMBRES_DIAS_LARGO[diaSemanaHoy])} ${hoy.getDate()}`;

  return <AgendaWidget fechaTexto={fechaTexto} eventos={eventos} />;
}

async function construirTareasWidget(): Promise<React.JSX.Element> {
  const tareas = await listarTareasPorFecha(hoyISO());
  const items: TareaWidgetItem[] = tareas.map((t) => ({ id: t.id, titulo: t.titulo, completado: !!t.completado }));
  return <TareasWidget tareas={items} />;
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction, clickAction, clickActionData, renderWidget } = props;

  // Cuando tocas el checkbox de una tarea en el widget de Tareas, esta acción llega
  // aquí como WIDGET_CLICK con clickAction = "TOGGLE_TAREA"; se actualiza la base de
  // datos y se vuelve a renderizar el widget con el nuevo estado.
  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'TOGGLE_TAREA') {
    const id = clickActionData?.id as number | undefined;
    const completadoActual = !!clickActionData?.completado;
    if (id != null) {
      await marcarTareaCompletada(id, !completadoActual);
    }
    renderWidget(await construirTareasWidget());
    return;
  }

  switch (widgetInfo.widgetName) {
    case 'AgendaWidget':
      renderWidget(await construirAgendaWidget());
      break;
    case 'TareasWidget':
      renderWidget(await construirTareasWidget());
      break;
    default:
      break;
  }
}
