export interface Paleta {
  primario: string;
  acento: string;
  fondo: string;
  tarjeta: string;
  texto: string;
  textoSecundario: string;
  peligro: string;
  exito: string;
  borde: string;
  oscuro: boolean; // true = usar StatusBar/iconos claros (para saber si el fondo es oscuro)
}

export type TemaId =
  | 'claro'
  | 'oscuro'
  | 'neon'
  | 'oceano'
  | 'atardecer'
  | 'bosque'
  | 'lavanda'
  | 'cafe'
  | 'medianoche'
  | 'menta';

export const TEMAS: Record<TemaId, { nombre: string; paleta: Paleta }> = {
  claro: {
    nombre: 'Claro',
    paleta: {
      primario: '#4F46E5',
      acento: '#F59E0B',
      fondo: '#F3F4F6',
      tarjeta: '#FFFFFF',
      texto: '#111827',
      textoSecundario: '#6B7280',
      peligro: '#DC2626',
      exito: '#16A34A',
      borde: '#E5E7EB',
      oscuro: false,
    },
  },
  oscuro: {
    nombre: 'Oscuro',
    paleta: {
      primario: '#818CF8',
      acento: '#FBBF24',
      fondo: '#111827',
      tarjeta: '#1F2937',
      texto: '#F3F4F6',
      textoSecundario: '#9CA3AF',
      peligro: '#F87171',
      exito: '#4ADE80',
      borde: '#374151',
      oscuro: true,
    },
  },
  neon: {
    nombre: 'Neón',
    paleta: {
      primario: '#F0ABFC',
      acento: '#22D3EE',
      fondo: '#0A0A0F',
      tarjeta: '#171722',
      texto: '#F5F3FF',
      textoSecundario: '#A78BFA',
      peligro: '#FB7185',
      exito: '#34D399',
      borde: '#2E1065',
      oscuro: true,
    },
  },
  oceano: {
    nombre: 'Océano',
    paleta: {
      primario: '#0891B2',
      acento: '#F97316',
      fondo: '#F0F9FF',
      tarjeta: '#FFFFFF',
      texto: '#0C4A6E',
      textoSecundario: '#64748B',
      peligro: '#DC2626',
      exito: '#059669',
      borde: '#BAE6FD',
      oscuro: false,
    },
  },
  atardecer: {
    nombre: 'Atardecer',
    paleta: {
      primario: '#EA580C',
      acento: '#DB2777',
      fondo: '#FFF7ED',
      tarjeta: '#FFFFFF',
      texto: '#7C2D12',
      textoSecundario: '#9A5B3D',
      peligro: '#B91C1C',
      exito: '#65A30D',
      borde: '#FED7AA',
      oscuro: false,
    },
  },
  bosque: {
    nombre: 'Bosque',
    paleta: {
      primario: '#15803D',
      acento: '#CA8A04',
      fondo: '#F0FDF4',
      tarjeta: '#FFFFFF',
      texto: '#14532D',
      textoSecundario: '#5B7A64',
      peligro: '#DC2626',
      exito: '#16A34A',
      borde: '#BBF7D0',
      oscuro: false,
    },
  },
  lavanda: {
    nombre: 'Lavanda',
    paleta: {
      primario: '#9333EA',
      acento: '#EC4899',
      fondo: '#FAF5FF',
      tarjeta: '#FFFFFF',
      texto: '#581C87',
      textoSecundario: '#8B6FA8',
      peligro: '#DC2626',
      exito: '#16A34A',
      borde: '#E9D5FF',
      oscuro: false,
    },
  },
  cafe: {
    nombre: 'Café',
    paleta: {
      primario: '#92400E',
      acento: '#B45309',
      fondo: '#FDF6EC',
      tarjeta: '#FFFFFF',
      texto: '#451A03',
      textoSecundario: '#8B7355',
      peligro: '#DC2626',
      exito: '#4D7C0F',
      borde: '#E7D4B5',
      oscuro: false,
    },
  },
  medianoche: {
    nombre: 'Medianoche',
    paleta: {
      primario: '#60A5FA',
      acento: '#FBBF24',
      fondo: '#020617',
      tarjeta: '#0F172A',
      texto: '#E2E8F0',
      textoSecundario: '#64748B',
      peligro: '#F87171',
      exito: '#4ADE80',
      borde: '#1E293B',
      oscuro: true,
    },
  },
  menta: {
    nombre: 'Menta',
    paleta: {
      primario: '#0D9488',
      acento: '#F472B6',
      fondo: '#F0FDFA',
      tarjeta: '#FFFFFF',
      texto: '#134E4A',
      textoSecundario: '#5F8A85',
      peligro: '#DC2626',
      exito: '#059669',
      borde: '#99F6E4',
      oscuro: false,
    },
  },
};

// Compatibilidad con código viejo que importaba "colors" directo (paleta clara por default).
export const colors = TEMAS.claro.paleta;
