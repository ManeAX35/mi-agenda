import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ActividadRecurrente } from '../types';
import { colors } from '../utils/theme';

const HORA_INICIO = 6; // 6:00 am
const HORA_FIN = 22; // 10:00 pm
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
}

export default function HorarioSemanal({ actividadesPorDia, onPressActividad }: Props) {
  const totalHoras = HORA_FIN - HORA_INICIO;
  const alturaTotal = totalHoras * ALTURA_POR_HORA;
  const horas = Array.from({ length: totalHoras + 1 }, (_, i) => HORA_INICIO + i);

  function bloqueEstilo(a: ActividadRecurrente) {
    const inicioMin = minutosDesdeMedianoche(a.hora_inicio) - HORA_INICIO * 60;
    const finMin = minutosDesdeMedianoche(a.hora_fin) - HORA_INICIO * 60;
    const top = Math.max(0, (inicioMin / 60) * ALTURA_POR_HORA);
    const alturaCalculada = Math.max(24, ((finMin - inicioMin) / 60) * ALTURA_POR_HORA);
    return { top, height: alturaCalculada };
  }

  return (
    <View style={styles.contenedor}>
      {/* Encabezado con nombres de los días, alineado con las columnas de abajo */}
      <View style={styles.filaEncabezado}>
        <View style={{ width: ANCHO_COLUMNA_HORA }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {DIAS_CORTOS.map((d) => (
              <View key={d} style={[styles.celdaEncabezado, { width: ANCHO_COLUMNA_DIA }]}>
                <Text style={styles.textoEncabezado}>{d}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView style={{ maxHeight: 520 }}>
        <View style={{ flexDirection: 'row' }}>
          {/* Columna de horas, fija a la izquierda */}
          <View style={{ width: ANCHO_COLUMNA_HORA }}>
            {horas.map((h) => (
              <View key={h} style={[styles.celdaHora, { height: ALTURA_POR_HORA }]}>
                <Text style={styles.textoHora}>{h}:00</Text>
              </View>
            ))}
          </View>

          {/* Columnas de días, con scroll horizontal */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {DIAS_CORTOS.map((_, diaIdx) => (
                <View key={diaIdx} style={[styles.columnaDia, { width: ANCHO_COLUMNA_DIA, height: alturaTotal }]}>
                  {horas.slice(0, -1).map((h) => (
                    <View key={h} style={[styles.lineaHora, { top: (h - HORA_INICIO) * ALTURA_POR_HORA }]} />
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
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { backgroundColor: colors.tarjeta, marginHorizontal: 12, borderRadius: 10, overflow: 'hidden' },
  filaEncabezado: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  celdaEncabezado: { alignItems: 'center', paddingVertical: 8 },
  textoEncabezado: { fontWeight: '700', color: colors.texto, fontSize: 12 },
  celdaHora: { justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 4 },
  textoHora: { fontSize: 10, color: colors.textoSecundario, transform: [{ translateY: -6 }] },
  columnaDia: { borderLeftWidth: 1, borderLeftColor: '#F0F0F0' },
  lineaHora: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#F0F0F0' },
  bloqueActividad: { position: 'absolute', left: 2, right: 2, borderRadius: 6, padding: 4, overflow: 'hidden' },
  bloqueTitulo: { color: '#fff', fontWeight: '700', fontSize: 11 },
  bloqueHora: { color: '#fff', fontSize: 9, marginTop: 2 },
});
