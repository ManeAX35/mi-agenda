import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ActividadRecurrente, DiaSemana } from '../types';
import { Paleta } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

const ALTURA_POR_HORA = 56;
const ANCHO_COLUMNA_HORA = 46;
const ANCHO_COLUMNA_DIA = 108;

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function minutosDesdeMedianoche(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

interface Props {
  actividadesPorDia: Record<number, ActividadRecurrente[]>;
  onPressActividad: (a: ActividadRecurrente) => void;
  onPressSlot?: (diaSemana: DiaSemana, hora: number) => void;
  horaInicio?: number; // default 6 (6am)
  horaFin?: number; // default 22 (10pm)
}

export default function HorarioSemanal({ actividadesPorDia, onPressActividad, onPressSlot, horaInicio = 6, horaFin = 22 }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  const totalHoras = horaFin - horaInicio;
  const alturaTotal = totalHoras * ALTURA_POR_HORA;
  const horas = Array.from({ length: totalHoras + 1 }, (_, i) => horaInicio + i);

  // El encabezado (nombres de los días) y el cuerpo (horas + actividades) usan
  // scrolls horizontales separados; se sincronizan a mano para que se muevan juntos.
  const headerScrollRef = useRef<ScrollView>(null);
  const bodyScrollRef = useRef<ScrollView>(null);

  function sincronizarDesdeCuerpo(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    headerScrollRef.current?.scrollTo({ x, animated: false });
  }

  function bloqueEstilo(a: ActividadRecurrente) {
    const inicioMin = minutosDesdeMedianoche(a.hora_inicio) - horaInicio * 60;
    const finMin = minutosDesdeMedianoche(a.hora_fin) - horaInicio * 60;
    const top = Math.max(0, (inicioMin / 60) * ALTURA_POR_HORA);
    const alturaCalculada = Math.max(24, ((finMin - inicioMin) / 60) * ALTURA_POR_HORA);
    return { top, height: alturaCalculada };
  }

  // Barrita de "hora actual": solo se dibuja en la columna del día de hoy, si la hora
  // actual cae dentro del rango visible (horaInicio a horaFin).
  const ahora = new Date();
  const diaDeHoy = ahora.getDay();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes() - horaInicio * 60;
  const mostrarLineaAhora = minutosAhora >= 0 && minutosAhora <= totalHoras * 60;
  const topLineaAhora = (minutosAhora / 60) * ALTURA_POR_HORA;

  return (
    <View style={styles.contenedor}>
      {/* Encabezado con nombres de los días. Su scroll NO es tocable por el usuario;
          se mueve solo, siguiendo al scroll del cuerpo de abajo (sincronizado). */}
      <View style={styles.filaEncabezado}>
        <View style={{ width: ANCHO_COLUMNA_HORA }} />
        <ScrollView
          ref={headerScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
        >
          <View style={{ flexDirection: 'row' }}>
            {DIAS_CORTOS.map((d) => (
              <View key={d} style={[styles.celdaEncabezado, { width: ANCHO_COLUMNA_DIA }]}>
                <Text style={styles.textoEncabezado}>{d}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={{ maxHeight: 520 }} nestedScrollEnabled>
        <View style={{ flexDirection: 'row' }}>
          {/* Columna de horas, fija a la izquierda */}
          <View style={{ width: ANCHO_COLUMNA_HORA }}>
            {horas.map((h) => (
              <View key={h} style={[styles.celdaHora, { height: ALTURA_POR_HORA }]}>
                <Text style={styles.textoHora}>{h}:00</Text>
              </View>
            ))}
          </View>

          {/* Columnas de días, con scroll horizontal controlado por el usuario */}
          <ScrollView
            ref={bodyScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={sincronizarDesdeCuerpo}
            scrollEventThrottle={16}
          >
            <View style={{ flexDirection: 'row' }}>
              {DIAS_CORTOS.map((_, diaIdx) => (
                <View key={diaIdx} style={[styles.columnaDia, { width: ANCHO_COLUMNA_DIA, height: alturaTotal }]}>
                  {horas.slice(0, -1).map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.celdaTocable, { top: (h - horaInicio) * ALTURA_POR_HORA, height: ALTURA_POR_HORA }]}
                      activeOpacity={onPressSlot ? 0.5 : 1}
                      onPress={() => onPressSlot && onPressSlot(diaIdx as DiaSemana, h)}
                    >
                      <View style={styles.lineaHora} />
                    </TouchableOpacity>
                  ))}
                  {(actividadesPorDia[diaIdx] || []).map((a) => {
                    const est = bloqueEstilo(a);
                    return (
                      <TouchableOpacity
                        key={a.id}
                        style={[
                          styles.bloqueActividad,
                          { top: est.top, height: est.height, backgroundColor: (a.color || colors.primario) + 'E6' },
                        ]}
                        onPress={() => onPressActividad(a)}
                      >
                        <Text style={styles.bloqueTitulo} numberOfLines={2}>{a.titulo}</Text>
                        {est.height > 34 && (
                          <Text style={styles.bloqueHora} numberOfLines={1}>{a.hora_inicio}-{a.hora_fin}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  {mostrarLineaAhora && diaIdx === diaDeHoy && (
                    <View style={[styles.lineaAhora, { top: topLineaAhora }]} pointerEvents="none">
                      <View style={styles.puntoAhora} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

function crearEstilos(colors: Paleta) {
  return StyleSheet.create({
    contenedor: { backgroundColor: colors.tarjeta, marginHorizontal: 12, borderRadius: 10, overflow: 'hidden' },
    filaEncabezado: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borde, backgroundColor: colors.fondo },
    celdaEncabezado: { alignItems: 'center', paddingVertical: 8 },
    textoEncabezado: { fontWeight: '700', color: colors.texto, fontSize: 12 },
    celdaHora: { justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 4 },
    textoHora: { fontSize: 10, color: colors.textoSecundario, transform: [{ translateY: -6 }] },
    columnaDia: { borderLeftWidth: 1, borderLeftColor: colors.borde },
    celdaTocable: { position: 'absolute', left: 0, right: 0, justifyContent: 'flex-start' },
    lineaHora: { height: 1, backgroundColor: colors.borde },
    bloqueActividad: { position: 'absolute', left: 2, right: 2, borderRadius: 6, padding: 4, overflow: 'hidden' },
    bloqueTitulo: { color: '#fff', fontWeight: '700', fontSize: 11 },
    bloqueHora: { color: '#fff', fontSize: 9, marginTop: 2 },
    lineaAhora: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.peligro },
    puntoAhora: { position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.peligro },
  });
}
