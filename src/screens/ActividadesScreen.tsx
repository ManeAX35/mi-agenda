import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarActividades, eliminarActividad } from '../db/actividadesRepo';
import { ActividadRecurrente } from '../types';
import { Paleta } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import ActividadFormModal from '../components/ActividadFormModal';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ActividadesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  const [actividades, setActividades] = useState<ActividadRecurrente[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<ActividadRecurrente | null>(null);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  async function cargar() {
    setActividades(await listarActividades());
  }

  function abrirNuevo() {
    setEditando(null);
    setModalVisible(true);
  }

  function abrirEditar(a: ActividadRecurrente) {
    setEditando(a);
    setModalVisible(true);
  }

  function confirmarEliminar(id: number) {
    Alert.alert('Eliminar actividad', '¿Seguro que quieres quitarla de tu agenda?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await eliminarActividad(id);
          cargar();
        },
      },
    ]);
  }

  return (
    <View style={styles.contenedor}>
      <FlatList
        data={actividades}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        ListEmptyComponent={
          <Text style={styles.vacio}>Aún no tienes actividades recurrentes. Toca "+" para agregar tus clases o trabajo.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tarjeta, { borderLeftColor: item.color || colors.primario }]}
            onPress={() => abrirEditar(item)}
            onLongPress={() => confirmarEliminar(item.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.tituloTarjeta}>{item.titulo}</Text>
              <Text style={styles.subtitulo}>
                {DIAS[item.dia_semana]} · {item.hora_inicio}-{item.hora_fin} · {item.categoria}
              </Text>
              {!!item.lugar && <Text style={styles.subtitulo}>{item.lugar}</Text>}
            </View>
            <TouchableOpacity onPress={() => confirmarEliminar(item.id)}>
              <Text style={styles.eliminar}>Eliminar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={abrirNuevo}>
        <Text style={styles.fabTexto}>+</Text>
      </TouchableOpacity>

      <ActividadFormModal
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
    vacio: { color: colors.textoSecundario, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
    tarjeta: {
      backgroundColor: colors.tarjeta,
      borderLeftWidth: 4,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    tituloTarjeta: { fontWeight: '700', fontSize: 15, color: colors.texto },
    subtitulo: { color: colors.textoSecundario, marginTop: 2 },
    eliminar: { color: colors.peligro, fontWeight: '600', marginLeft: 8 },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primario,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },
    fabTexto: { color: '#fff', fontSize: 28, lineHeight: 30 },
  });
}
