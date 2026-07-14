import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { listarActividades } from '../db/actividadesRepo';
import { listarPendientes } from '../db/pendientesRepo';
import { ActividadRecurrente, Pendiente } from '../types';
import { colors } from '../utils/theme';

const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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

  // Agrupa actividades recurrentes por día de la semana (0-6)
  const porDia: Record<number, ActividadRecurrente[]> = {};
  for (const a of actividades) {
    if (!porDia[a.dia_semana]) porDia[a.dia_semana] = [];
    porDia[a.dia_semana].push(a);
  }

  // Marca fechas con pendientes en el calendario mensual
  const marcas: Record<string, any> = {};
  for (const p of pendientes) {
    const fecha = p.fecha_limite.slice(0, 10);
    marcas[fecha] = { marked: true, dotColor: colors.acento };
  }
  marcas[fechaSeleccionada] = { ...(marcas[fechaSeleccionada] || {}), selected: true, selectedColor: colors.primario };

  const pendientesDelDia = pendientes.filter((p) => p.fecha_limite.slice(0, 10) === fechaSeleccionada);

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
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {NOMBRES_DIAS.map((nombre, idx) => (
            <View key={idx} style={styles.diaBloque}>
              <Text style={styles.diaTitulo}>{nombre}</Text>
              {(porDia[idx] || []).length === 0 ? (
                <Text style={styles.sinActividades}>Sin actividades</Text>
              ) : (
                porDia[idx].map((a) => (
                  <View key={a.id} style={[styles.actividadItem, { borderLeftColor: a.color || colors.primario }]}>
                    <Text style={styles.actividadTitulo}>{a.titulo}</Text>
                    <Text style={styles.actividadHora}>
                      {a.hora_inicio} - {a.hora_fin} {a.lugar ? `· ${a.lugar}` : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <Calendar
            onDayPress={(day) => setFechaSeleccionada(day.dateString)}
            markedDates={marcas}
            theme={{
              todayTextColor: colors.primario,
              selectedDayBackgroundColor: colors.primario,
              dotColor: colors.acento,
              arrowColor: colors.primario,
            }}
          />
          <View style={styles.diaBloque}>
            <Text style={styles.diaTitulo}>Pendientes de {fechaSeleccionada}</Text>
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
