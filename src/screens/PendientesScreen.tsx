import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarPendientes, marcarCompletado, eliminarPendiente } from '../db/pendientesRepo';
import { Pendiente } from '../types';
import { Paleta } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import PendienteFormModal from '../components/PendienteFormModal';

export default function PendientesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [mostrarCompletados, setMostrarCompletados] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<Pendiente | null>(null);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [mostrarCompletados])
  );

  async function cargar() {
    setPendientes(await listarPendientes(mostrarCompletados));
  }

  function abrirNuevo() {
    setEditando(null);
    setModalVisible(true);
  }

  function abrirEditar(p: Pendiente) {
    setEditando(p);
    setModalVisible(true);
  }

  function confirmarEliminar(p: Pendiente) {
    Alert.alert('Eliminar pendiente', `¿Eliminar "${p.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await eliminarPendiente(p.id, p.recordatorios_json);
          cargar();
        },
      },
    ]);
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.filtroFila}>
        <Text style={styles.filtroTexto}>Mostrar completados</Text>
        <Switch value={mostrarCompletados} onValueChange={setMostrarCompletados} />
      </View>

      <FlatList
        data={pendientes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={styles.vacio}>Sin pendientes por ahora. Toca "+" para agregar uno.</Text>}
        renderItem={({ item }) => {
          const fechaObj = new Date(item.fecha_limite);
          const vencido = !item.completado && fechaObj.getTime() < Date.now();
          return (
            <TouchableOpacity
              style={[styles.tarjeta, vencido && styles.tarjetaVencida]}
              onPress={() => abrirEditar(item)}
            >
              <TouchableOpacity
                style={[styles.checkbox, !!item.completado && styles.checkboxMarcado]}
                onPress={async () => {
                  await marcarCompletado(item.id, !item.completado);
                  cargar();
                }}
              >
                {!!item.completado && <Text style={styles.checkboxTexto}>✓</Text>}
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.tituloTarjeta, !!item.completado && styles.tachado]}>{item.titulo}</Text>
                <Text style={styles.subtitulo}>
                  {fechaObj.toLocaleDateString('es-MX')} {fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · {item.tipo}
                  {vencido ? ' · VENCIDO' : ''}
                  {item.repetir ? ` · 🔁 ${item.repetir}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => confirmarEliminar(item)}>
                <Text style={styles.eliminar}>Eliminar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={abrirNuevo}>
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      <PendienteFormModal
        visible={modalVisible}
        editando={editando}
        onClose={() => setModalVisible(false)}
        onGuardado={() => {
          setModalVisible(false);
          cargar();
        }}
      />
    </View>
  );
}

function crearEstilos(colors: Paleta) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: colors.fondo },
    filtroFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
    filtroTexto: { color: colors.texto, fontWeight: '600' },
    vacio: { color: colors.textoSecundario, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
    tarjeta: { backgroundColor: colors.tarjeta, borderRadius: 10, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
    tarjetaVencida: { borderColor: colors.peligro, borderWidth: 1 },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.primario, alignItems: 'center', justifyContent: 'center' },
    checkboxMarcado: { backgroundColor: colors.exito, borderColor: colors.exito },
    checkboxTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
    tituloTarjeta: { fontWeight: '700', fontSize: 15, color: colors.texto },
    tachado: { textDecorationLine: 'line-through', color: colors.textoSecundario },
    subtitulo: { color: colors.textoSecundario, marginTop: 2 },
    eliminar: { color: colors.peligro, fontWeight: '600', marginLeft: 8 },
    fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primario, alignItems: 'center', justifyContent: 'center', elevation: 4 },
    fabTexto: { color: '#fff', fontSize: 28, lineHeight: 30 },
  });
}
