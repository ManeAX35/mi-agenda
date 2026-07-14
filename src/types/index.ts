// Día de la semana: 0 = Domingo ... 6 = Sábado (igual que Date.getDay())
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ActividadRecurrente {
  id: number;
  titulo: string;
  categoria: string; // "Clase", "Trabajo", "Otro"...
  dia_semana: DiaSemana;
  hora_inicio: string; // "HH:MM"
  hora_fin: string; // "HH:MM"
  lugar?: string | null;
  color?: string | null;
  activo: number; // 1 o 0 (SQLite no tiene boolean nativo)
}

export interface Pendiente {
  id: number;
  titulo: string;
  descripcion?: string | null;
  fecha_limite: string; // ISO string "YYYY-MM-DDTHH:MM:SS"
  recordatorio_minutos_antes: number | null; // null = sin recordatorio
  notification_id?: string | null;
  completado: number; // 1 o 0
  tipo: 'pago' | 'junta' | 'entrega' | 'otro';
}

export interface TareaDia {
  id: number;
  titulo: string;
  fecha: string; // "YYYY-MM-DD"
  completado: number;
}

export interface EntradaDiario {
  id: number;
  fecha: string; // "YYYY-MM-DD"
  contenido: string;
  actualizado_en: string; // ISO timestamp
}
