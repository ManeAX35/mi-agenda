import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Paleta } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { minutosDesdeMedianoche } from '../utils/tiempo';

const HORA_INICIO = 0;
const HORA_FIN = 24;
const ALTURA_POR_HORA = 44;

export interface EventoDia {
  id: string; // prefijo por tipo para que no choquen ids entre recurrentes y pendientes, ej. "r-3" o "p-7"
  titulo: string;
  subtitulo: string;
  horaInicio: string;
  horaFin: string;
  color: string;
}

interface Props {
  eventos: EventoDia[];
  onPressEvento?: (id: string) => void;
  esHoy?: boolean;
}

interface EventoPosicionado extends EventoDia {
  top: number;
  height: number;
  columna: number;
  totalColumnas: number;
}

/** Asigna columnas a eventos que se traslapan en el tiempo (estilo Google Calendar),
 *  para que se dibujen lado a lado en vez de encimados. */
function calcularLayout(eventos: EventoDia[]): EventoPosicionado[] {
  const ordenados = [...eventos].sort((a, b) => minutosDesdeMedianoche(a.horaInicio) - minutosDesdeMedianoche(b.horaInicio));

  const resultado: EventoPosicionado[] = [];
  let clusterActual: { evento: EventoDia; columna: number }[] = [];
  let finClusterMax = -1;
  const columnasOcupadasHasta: number[] = []; // fin (en minutos) del último evento por columna, dentro del cluster actual

  function cerrarCluster() {
    if (clusterActual.length === 0) return;
    const totalColumnas = columnasOcupadasHasta.length;
    for (const { evento, columna } of clusterActual) {
      const inicioMin = minutosDesdeMedianoche(evento.horaInicio) - HORA_INICIO * 60;
      const finMin = minutosDesdeMedianoche(evento.horaFin) - HORA_INICIO * 60;
      resultado.push({
        ...evento,
        top: (inicioMin / 60) * ALTURA_POR_HORA,
        height: Math.max(28, ((finMin - inicioMin) / 60) * ALTURA_POR_HORA),
        columna,
        totalColumnas,
      });
    }
    clusterActual = [];
    columnasOcupadasHasta.length = 0;
    finClusterMax = -1;
  }

  for (const evento of ordenados) {
    const inicioMin = minutosDesdeMedianoche(evento.horaInicio);
    const finMin = minutosDesdeMedianoche(evento.horaFin);

    if (clusterActual.length > 0 && inicioMin >= finClusterMax) {
      cerrarCluster();
    }

    let columna = columnasOcupadasHasta.findIndex((finCol) => finCol <= inicioMin);
    if (columna === -1) {
      columna = columnasOcupadasHasta.length;
      columnasOcupadasHasta.push(finMin);
    } else {
      columnasOcupadasHasta[columna] = finMin;
    }

    clusterActual.push({ evento, columna });
    finClusterMax = Math.max(finClusterMax, finMin);
  }
  cerrarCluster();

  return resultado;
}

export default function DiaTimeline({ eventos, onPressEvento, esHoy }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  const alturaTotal = (HORA_FIN - HORA_INICIO) * ALTURA_POR_HORA;
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i);
  const posicionados = calcularLayout(eventos);

  const ahora = new Date();
  const topLineaAhora = ((ahora.getHours() * 60 + ahora.getMinutes() - HORA_INICIO * 60) / 60) * ALTURA_POR_HORA;

  return (
    <View style={styles.contenedor}>
      <ScrollView style={{ maxHeight: 420 }} nestedScrollEnabled>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 42 }}>
            {horas.map((h) => (
              <View key={h} style={[styles.celdaHora, { height: ALTURA_POR_HORA }]}>
                <Text style={styles.textoHora}>{h}:00</Text>
              </View>
            ))}
          </View>
          <View style={[styles.columna, { height: alturaTotal }]}>
            {horas.slice(0, -1).map((h) => (
              <View key={h} style={[styles.lineaHora, { top: (h - HORA_INICIO) * ALTURA_POR_HORA }]} />
            ))}
            {posicionados.map((ev) => {
              const anchoPorc = 100 / ev.totalColumnas;
              const izqPorc = anchoPorc * ev.columna;
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[
                    styles.bloque,
                    {
                      top: ev.top,
                      height: ev.height,
                      left: `${izqPorc}%`,
                      width: `${anchoPorc}%`,
                      backgroundColor: ev.color + 'E6',
                    },
                  ]}
                  onPress={() => onPressEvento && onPressEvento(ev.id)}
                >
                  <Text style={styles.bloqueTitulo} numberOfLines={2}>{ev.titulo}</Text>
                  {ev.height > 34 && <Text style={styles.bloqueSub} numberOfLines={1}>{ev.subtitulo}</Text>}
                </TouchableOpacity>
              );
            })}
            {esHoy && (
              <View style={[styles.lineaAhora, { top: topLineaAhora }]} pointerEvents="none">
                <View style={styles.puntoAhora} />
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      {eventos.length === 0 && <Text style={styles.vacio}>Sin actividades ni pendientes este día</Text>}
    </View>
  );
}

function crearEstilos(colors: Paleta) {
  return StyleSheet.create({
    contenedor: { backgroundColor: colors.tarjeta, borderRadius: 10, overflow: 'hidden', marginTop: 8 },
    celdaHora: { justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 4 },
    textoHora: { fontSize: 10, color: colors.textoSecundario, transform: [{ translateY: -6 }] },
    columna: { flex: 1, borderLeftWidth: 1, borderLeftColor: colors.borde },
    lineaHora: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.borde },
    bloque: { position: 'absolute', borderRadius: 6, padding: 4, overflow: 'hidden' },
    bloqueTitulo: { color: '#fff', fontWeight: '700', fontSize: 11 },
    bloqueSub: { color: '#fff', fontSize: 9, marginTop: 2 },
    lineaAhora: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.peligro },
    puntoAhora: { position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.peligro },
    vacio: { color: colors.textoSecundario, fontStyle: 'italic', padding: 12, textAlign: 'center' },
  });
}
