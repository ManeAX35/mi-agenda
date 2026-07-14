import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { listarFechasConActividad, calcularRachaDiario } from '../db/diarioRepo';
import { hoyLocalISO, fechaLocalDesdeDate } from '../utils/tiempo';
import { Paleta } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import DiaCompletoEditor from '../components/DiaCompletoEditor';

function hoyISO(): string {
  return hoyLocalISO();
}

function formatearFechaCorta(fecha: string): string {
  const f = new Date(fecha + 'T00:00:00');
  return f.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function DiarioScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  const hoy = hoyISO();
  const [fechasHistorial, setFechasHistorial] = useState<string[]>([]);
  const [fechaAbierta, setFechaAbierta] = useState<string | null>(null);
  const [racha, setRacha] = useState(0);
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarHistorial();
      calcularRachaDiario().then(setRacha);
    }, [])
  );

  async function cargarHistorial() {
    const fechas = await listarFechasConActividad(60);
    setFechasHistorial(fechas.filter((f) => f !== hoy));
  }

  return (
    <View style={styles.contenedor}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        data={fechasHistorial}
        keyExtractor={(item) => item}
        ListHeaderComponent={
          <>
            {racha > 0 && (
              <View style={styles.rachaBanner}>
                <Text style={styles.rachaTexto}>🔥 {racha} día{racha === 1 ? '' : 's'} seguido{racha === 1 ? '' : 's'} escribiendo</Text>
              </View>
            )}
            <View style={styles.tarjetaHoy}>
              <DiaCompletoEditor fecha={hoy} />
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <>
            {index === 0 && (
              <View style={styles.filaSeccionHistorial}>
                <Text style={styles.seccionTitulo}>Días anteriores</Text>
                <TouchableOpacity style={styles.botonBuscarFecha} onPress={() => setMostrarSelectorFecha(true)}>
                  <Text style={styles.botonBuscarFechaTexto}>📅 Buscar fecha</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.tarjeta} onPress={() => setFechaAbierta(item)}>
              <Text style={styles.fecha}>{formatearFechaCorta(item)}</Text>
              <Text style={styles.verMas}>Ver / editar →</Text>
            </TouchableOpacity>
          </>
        )}
        ListEmptyComponent={
          <View>
            <TouchableOpacity style={styles.botonBuscarFecha} onPress={() => setMostrarSelectorFecha(true)}>
              <Text style={styles.botonBuscarFechaTexto}>📅 Buscar fecha</Text>
            </TouchableOpacity>
            <Text style={styles.vacio}>Aún no tienes días anteriores registrados. Empieza escribiendo hoy arriba, o busca una fecha específica.</Text>
          </View>
        }
      />

      {mostrarSelectorFecha && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onChange={(_, fechaElegida) => {
            setMostrarSelectorFecha(false);
            if (fechaElegida) {
              setFechaAbierta(fechaLocalDesdeDate(fechaElegida));
            }
          }}
        />
      )}

      <Modal visible={!!fechaAbierta} animationType="slide" transparent onRequestClose={() => setFechaAbierta(null)}>
        <KeyboardAvoidingView
          style={styles.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContenido}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {fechaAbierta && <DiaCompletoEditor fecha={fechaAbierta} />}
              <TouchableOpacity style={styles.botonCerrar} onPress={() => setFechaAbierta(null)}>
                <Text style={styles.botonCerrarTexto}>Cerrar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function crearEstilos(colors: Paleta) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: colors.fondo },
    rachaBanner: { backgroundColor: colors.acento + '22', borderRadius: 10, padding: 10, marginBottom: 12, alignItems: 'center' },
    rachaTexto: { color: colors.texto, fontWeight: '700' },
    tarjetaHoy: { backgroundColor: colors.tarjeta, borderRadius: 12, padding: 16, marginBottom: 16 },
    seccionTitulo: { fontSize: 15, fontWeight: '700', color: colors.texto, marginBottom: 8, marginTop: 4 },
    filaSeccionHistorial: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 },
    botonBuscarFecha: { backgroundColor: colors.primario + '22', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 8 },
    botonBuscarFechaTexto: { color: colors.primario, fontWeight: '700', fontSize: 12 },
    tarjeta: {
      backgroundColor: colors.tarjeta,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fecha: { fontWeight: '700', color: colors.texto, textTransform: 'capitalize' },
    verMas: { color: colors.primario, fontWeight: '600', fontSize: 12 },
    vacio: { color: colors.textoSecundario, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContenido: { backgroundColor: colors.tarjeta, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '90%' },
    botonCerrar: { backgroundColor: colors.fondo, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 20, marginBottom: 10 },
    botonCerrarTexto: { color: colors.texto, fontWeight: '600' },
  });
}
