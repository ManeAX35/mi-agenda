import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { listarActividades } from '../db/actividadesRepo';
import { listarPendientes } from '../db/pendientesRepo';
import { ActividadRecurrente, Pendiente } from '../types';
import { colors } from '../utils/theme';
import HorarioSemanal from '../components/HorarioSemanal';

export default function AgendaScreen() {
  const [modo, setModo] = useState<'semana' | 'mes'>('semana');
  const [actividades, setActividades] = useState<ActividadRecurrente[]>([]);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  async function cargar() {
    setActividades(await listarActividades());
    setPendientes(await listarPendientes());
  }

  // Agrupa actividades recurrentes por día de la semana (0-6), para la cuadrícula semanal
  const porDia: Record<number, ActividadRecurrente[]> = {};
  for (const a of actividades) {
    if (!porDia[a.dia_semana]) porDia[a.dia_semana] = [];
    porDia[a.dia_semana].push(a);
  }

  // Marca en el calendario mensual: puntos para pendientes (naranja) y para días con
  // actividades recurrentes (morado), combinando ambos con "dots" de react-native-calendars.
  const marcas: Record<string, any> = {};
  for (const p of pendientes) {
    const fecha = p.fecha_limite.slice(0, 10);
    const dots = marcas[fecha]?.dots || [];
    marcas[fecha] = { ...marcas[fecha], dots: [...dots, { key: 'pendiente', color: colors.acento }] };
  }
  // Para marcar recurrentes en el mes, se revisa qué día de la semana cae cada fecha visible
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0); // incluye el mes siguiente por si se navega
  for (let d = new Date(inicioMes); d <= finMes; d.setDate(d.getDate() + 1)) {
    const diaSemana = d.getDay();
    if (porDia[diaSemana]?.length) {
      const fechaStr = d.toISOString().slice(0, 10);
      const dots = marcas[fechaStr]?.dots || [];
      marcas[fechaStr] = { ...marcas[fechaStr], dots: [...dots, { key: 'recurrente', color: colors.primario }] };
    }
  }
  marcas[fechaSeleccionada] = { ...(marcas[fechaSeleccionada] || {}), selected: true, selectedColor: colors.primario };

  const pendientesDelDia = pendientes.filter((p) => p.fecha_limite.slice(0, 10) === fechaSeleccionada);
  const diaSemanaSeleccionado = new Date(fechaSeleccionada + 'T00:00:00').getDay();
  const recurrentesDelDia = porDia[diaSemanaSeleccionado] || [];

  function mostrarDetalle(a: ActividadRecurrente) {
    Alert.alert(a.titulo, `${a.hora_inicio} - ${a.hora_fin}${a.lugar ? '\n' + a.lugar : ''}\n${a.categoria}`);
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.selectorModo}>
        <TouchableOpacity
          style={[styles.botonModo, modo === 'semana' && styles.botonModoActivo]}
          onPress={() => setModo('semana')}
        >
          <Text style={modo === 'semana' ? styles.textoModoActivo : styles.textoModo}>Semana</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.botonModo, modo === 'mes' && styles.botonModoActivo]}
          onPress={() => setModo('mes')}
        >
          <Text style={modo === 'mes' ? styles.textoModoActivo : styles.textoModo}>Mes</Text>
        </TouchableOpacity>
      </View>

      {modo === 'semana' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
          <Text style={styles.ayuda}>Desliza a los lados para ver todos los días →</Text>
          <HorarioSemanal actividadesPorDia={porDia} onPressActividad={mostrarDetalle} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <Calendar
            onDayPress={(day) => setFechaSeleccionada(day.dateString)}
            markingType="multi-dot"
            markedDates={marcas}
            theme={{
              todayTextColor: colors.primario,
              selectedDayBackgroundColor: colors.primario,
              arrowColor: colors.primario,
            }}
          />
          <View style={styles.leyenda}>
            <View style={styles.leyendaItem}>
              <View style={[styles.dotLeyenda, { backgroundColor: colors.primario }]} />
              <Text style={styles.leyendaTexto}>Actividad recurrente</Text>
            </View>
            <View style={styles.leyendaItem}>
              <View style={[styles.dotLeyenda, { backgroundColor: colors.acento }]} />
              <Text style={styles.leyendaTexto}>Pendiente</Text>
            </View>
          </View>

          <View style={styles.diaBloque}>
            <Text style={styles.diaTitulo}>Actividades recurrentes ({fechaSeleccionada})</Text>
            {recurrentesDelDia.length === 0 ? (
              <Text style={styles.sinActividades}>Sin actividades recurrentes este día</Text>
            ) : (
              recurrentesDelDia.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.actividadItem, { borderLeftColor: a.color || colors.primario }]}
                  onPress={() => mostrarDetalle(a)}
                >
                  <Text style={styles.actividadTitulo}>{a.titulo}</Text>
                  <Text style={styles.actividadHora}>
                    {a.hora_inicio} - {a.hora_fin} {a.lugar ? `· ${a.lugar}` : ''}
                  </Text>
                </TouchableOpacity>
              ))
            )}

            <Text style={[styles.diaTitulo, { marginTop: 16 }]}>Pendientes</Text>
            {pendientesDelDia.length === 0 ? (
              <Text style={styles.sinActividades}>Sin pendientes este día</Text>
            ) : (
              pendientesDelDia.map((p) => (
                <View key={p.id} style={[styles.actividadItem, { borderLeftColor: colors.acento }]}>
                  <Text style={styles.actividadTitulo}>{p.titulo}</Text>
                  <Text style={styles.actividadHora}>{p.fecha_limite.slice(11, 16)} · {p.tipo}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.fondo },
  selectorModo: { flexDirection: 'row', margin: 12, backgroundColor: colors.tarjeta, borderRadius: 10, padding: 4 },
  botonModo: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  botonModoActivo: { backgroundColor: colors.primario },
  textoModo: { color: colors.textoSecundario, fontWeight: '600' },
  textoModoActivo: { color: '#fff', fontWeight: '600' },
  ayuda: { color: colors.textoSecundario, fontSize: 12, marginLeft: 16, marginBottom: 6 },
  leyenda: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dotLeyenda: { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { color: colors.textoSecundario, fontSize: 12 },
  diaBloque: { paddingHorizontal: 16, marginTop: 12 },
  diaTitulo: { fontSize: 16, fontWeight: '700', color: colors.texto, marginBottom: 6 },
  sinActividades: { color: colors.textoSecundario, fontStyle: 'italic', marginBottom: 8 },
  actividadItem: {
    backgroundColor: colors.tarjeta,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  actividadTitulo: { fontWeight: '700', color: colors.texto },
  actividadHora: { color: colors.textoSecundario, marginTop: 2 },
});
