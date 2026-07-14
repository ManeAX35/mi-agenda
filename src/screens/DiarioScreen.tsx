import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarFechasConActividad } from '../db/diarioRepo';
import { colors } from '../utils/theme';
import DiaCompletoEditor from '../components/DiaCompletoEditor';

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatearFechaCorta(fecha: string): string {
  const f = new Date(fecha + 'T00:00:00');
  return f.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function DiarioScreen() {
  const hoy = hoyISO();
  const [fechasHistorial, setFechasHistorial] = useState<string[]>([]);
  const [fechaAbierta, setFechaAbierta] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      cargarHistorial();
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
          <View style={styles.tarjetaHoy}>
            <DiaCompletoEditor fecha={hoy} />
          </View>
        }
        renderItem={({ item, index }) => (
          <>
            {index === 0 && <Text style={styles.seccionTitulo}>Días anteriores</Text>}
            <TouchableOpacity style={styles.tarjeta} onPress={() => setFechaAbierta(item)}>
              <Text style={styles.fecha}>{formatearFechaCorta(item)}</Text>
              <Text style={styles.verMas}>Ver / editar →</Text>
            </TouchableOpacity>
          </>
        )}
        ListEmptyComponent={
          <Text style={styles.vacio}>Aún no tienes días anteriores registrados. Empieza escribiendo hoy arriba.</Text>
        }
      />

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

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.fondo },
  tarjetaHoy: { backgroundColor: colors.tarjeta, borderRadius: 12, padding: 16, marginBottom: 16 },
  seccionTitulo: { fontSize: 15, fontWeight: '700', color: colors.texto, marginBottom: 8, marginTop: 4 },
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
  modalContenido: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '90%' },
  botonCerrar: { backgroundColor: '#E5E7EB', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  botonCerrarTexto: { color: colors.texto, fontWeight: '600' },
});
