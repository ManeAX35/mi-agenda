import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface EventoWidget {
  titulo: string;
  hora: string;
  color: string;
}

interface Props {
  fechaTexto: string; // ej. "Lunes 14 de julio"
  eventos: EventoWidget[];
}

/** Widget de solo lectura: muestra hasta 5 actividades/pendientes de hoy. Tocarlo abre la app. */
export function AgendaWidget({ fechaTexto, eventos }: Props) {
  const visibles = eventos.slice(0, 5);

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'column',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'miagenda://agenda' }}
    >
      <TextWidget
        text="Mi Agenda"
        style={{ fontSize: 12, fontWeight: 'bold', color: '#6B7280' }}
      />
      <TextWidget
        text={fechaTexto}
        style={{ fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}
        truncate="END"
        maxLines={1}
      />

      {visibles.length === 0 ? (
        <TextWidget text="Sin actividades ni pendientes hoy" style={{ fontSize: 12, color: '#6B7280' }} />
      ) : (
        visibles.map((ev, idx) => (
          <FlexWidget
            key={idx}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
          >
            <FlexWidget
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ev.color as any, marginRight: 8 }}
            />
            <TextWidget text={ev.hora} style={{ fontSize: 11, color: '#6B7280', width: 44 }} />
            <FlexWidget style={{ flex: 1 }}>
              <TextWidget
                text={ev.titulo}
                style={{ fontSize: 12, color: '#111827' }}
                truncate="END"
                maxLines={1}
              />
            </FlexWidget>
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
