import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface TareaWidgetItem {
  id: number;
  titulo: string;
  completado: boolean;
}

interface Props {
  tareas: TareaWidgetItem[];
}

/** Widget con checkboxes tocables para marcar tareas de hoy como hechas.
 *  Agregar tareas nuevas requiere abrir la app (los widgets de Android no soportan
 *  teclado/texto libre), por eso el botón "+" solo abre la app. */
export function TareasWidget({ tareas }: Props) {
  const visibles = tareas.slice(0, 6);

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
    >
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <TextWidget text="Tareas de hoy" style={{ fontSize: 14, fontWeight: 'bold', color: '#111827' }} />
        <FlexWidget
          style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' }}
          clickAction="OPEN_APP"
        >
          <TextWidget text="+" style={{ fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' }} />
        </FlexWidget>
      </FlexWidget>

      {visibles.length === 0 ? (
        <TextWidget text="Sin tareas para hoy. Toca + para agregar una." style={{ fontSize: 12, color: '#6B7280' }} />
      ) : (
        visibles.map((t) => (
          <FlexWidget
            key={t.id}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
            clickAction="TOGGLE_TAREA"
            clickActionData={{ id: t.id, completado: t.completado }}
          >
            <FlexWidget
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 2,
                borderColor: '#4F46E5',
                backgroundColor: t.completado ? '#16A34A' : '#FFFFFF',
                marginRight: 8,
              }}
            />
            <FlexWidget style={{ flex: 1 }}>
              <TextWidget
                text={t.titulo}
                style={{ fontSize: 12, color: t.completado ? '#9CA3AF' : '#111827' }}
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
