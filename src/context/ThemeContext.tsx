import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { obtenerConfig, guardarConfig } from '../db/configRepo';
import { Paleta, TemaId, TEMAS } from '../utils/theme';

export type ModoColor = TemaId | 'automatico';

interface ThemeContextValue {
  modo: ModoColor;
  setModo: (m: ModoColor) => void;
  esOscuro: boolean;
  colors: Paleta;
  temaActivo: TemaId; // el tema resuelto de verdad (si modo es "automatico", aquí ya está resuelto a claro u oscuro)
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const CLAVE_CONFIG = 'modo_color';
const IDS_VALIDOS = new Set<ModoColor>([...(Object.keys(TEMAS) as TemaId[]), 'automatico']);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const esquemaDispositivo = useColorScheme(); // 'light' | 'dark' | null
  const [modo, setModoState] = useState<ModoColor>('automatico');

  useEffect(() => {
    obtenerConfig(CLAVE_CONFIG).then((valor) => {
      if (valor && IDS_VALIDOS.has(valor as ModoColor)) {
        setModoState(valor as ModoColor);
      }
    });
  }, []);

  function setModo(m: ModoColor) {
    setModoState(m);
    guardarConfig(CLAVE_CONFIG, m);
  }

  const temaActivo: TemaId = modo === 'automatico' ? (esquemaDispositivo === 'dark' ? 'oscuro' : 'claro') : modo;
  const paleta = TEMAS[temaActivo].paleta;

  return (
    <ThemeContext.Provider value={{ modo, setModo, esOscuro: paleta.oscuro, colors: paleta, temaActivo }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
