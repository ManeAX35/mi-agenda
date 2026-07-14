import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  listarPendientes,
  crearPendiente,
  actualizarPendiente,
  marcarCompletado,
  eliminarPendiente,
} from '../db/pendientesRepo';
import { pedirPermisos } from '../utils/notifications';
import { Pendiente } from '../types';
import { colors } from '../utils/theme';

const TIPOS: { key: Pendiente['tipo']; label: string }[] = [
  { key: 'pago', label: 'Pago' },
  { key: 'junta', label: 'Junta' },
  { key: 'entrega', label: 'Entrega' },
  { key: 'otro', label: 'Otro' },
];

const OPCIONES_RECORDATORIO = [
  { label: 'Sin recordatorio', minutos: null as number | null },
  { label: '30 min antes', minutos: 30 },
  { label: '1 hora antes', minutos: 60 },
  { label: '1 día antes', minutos: 1440 },
  { label: '2 días antes', minutos: 2880 },
];

export default function PendientesScreen() {
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [mostrarCompletados, setMostrarCompletados] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<Pendiente | null>(null);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<Pendiente['tipo']>('otro');
  const [fecha, setFecha] = useState(new Date());
  const [mostrarPicker, setMostrarPicker] = useState<'fecha' | 'hora' | null>(null);
  const [recordatorioMin, setRecordatorioMin] = useState<number | null>(1440);

  useFocusEffect(
    useCallback(() => {
      cargar();
      pedirPermisos();
    }, [mostrarCompletados])
  );

  async function cargar() {
    setPendientes(await listarPendientes(mostrarCompletados));
  }

  function abrirNuevo() {
    setEditando(null);
    setTitulo('');
    setDescripcion('');
    setTipo('otro');
    setFecha(new Date());
    setRecordatorioMin(1440);
    setModalVisible(true);
  }

  function abrirEditar(p: Pendiente) {
    setEditando(p);
    setTitulo(p.titulo);
    setDescripcion(p.descripcion || '');
    setTipo(p.tipo);
    setFecha(new Date(p.fecha_limite));
    setRecordatorioMin(p.recordatorio_minutos_antes);
    setModalVisible(true);
  }

  async function guardar() {
    if (!titulo.trim()) {
      Alert.alert('Falta el título', 'Escribe qué es este pendiente.');
      return;
    }
    const fechaISO = fecha.toISOString();
    if (editando) {
      await actualizarPendiente({
        ...editando,
        titulo,
        descripcion,
        fecha_limite: fechaISO,
        recordatorio_minutos_antes: recordatorioMin,
        tipo,
      });
    } else {
      await crearPendiente({
        titulo,
        descripcion,
        fecha_limite: fechaISO,
        recordatorio_minutos_antes: recordatorioMin,
        tipo,
      });
    }
    setModalVisible(false);
    cargar();
  }

  function confirmarEliminar(p: Pendiente) {
    Alert.alert('Eliminar pendiente', `¿Eliminar "${p.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await eliminarPendiente(p.id, p.notification_id);
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

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <ScrollView>
              <Text style={styles.modalTitulo}>{editando ? 'Editar pendiente' : 'Nuevo pendiente'}</Text>

              <Text style={styles.etiqueta}>Título</Text>
              <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder="Ej. Pagar renta" />

              <Text style={styles.etiqueta}>Notas (opcional)</Text>
              <TextInput style={styles.input} value={descripcion} onChangeText={setDescripcion} multiline placeholder="Detalles..." />

              <Text style={styles.etiqueta}>Tipo</Text>
              <View style={styles.filaChips}>
                {TIPOS.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.chip, tipo === t.key && styles.chipActivo]}
                    onPress={() => setTipo(t.key)}
                  >
                    <Text style={tipo === t.key ? styles.chipTextoActivo : styles.chipTexto}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.etiqueta}>Fecha y hora límite</Text>
              <TouchableOpacity style={styles.input} onPress={() => setMostrarPicker('fecha')}>
                <Text>{fecha.toLocaleDateString('es-MX')} {fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
              {mostrarPicker === 'fecha' && (
                <DateTimePicker
                  value={fecha}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, nuevaFecha) => {
                    if (Platform.OS === 'android') setMostrarPicker(null);
                    if (nuevaFecha) {
                      const combinada = new Date(fecha);
                      combinada.setFullYear(nuevaFecha.getFullYear(), nuevaFecha.getMonth(), nuevaFecha.getDate());
                      setFecha(combinada);
                      if (Platform.OS === 'android') setMostrarPicker('hora');
                    }
                  }}
                />
              )}
              {mostrarPicker === 'hora' && (
                <DateTimePicker
                  value={fecha}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, nuevaHora) => {
                    setMostrarPicker(null);
                    if (nuevaHora) {
                      const combinada = new Date(fecha);
                      combinada.setHours(nuevaHora.getHours(), nuevaHora.getMinutes());
                      setFecha(combinada);
                    }
                  }}
                />
              )}

              <Text style={styles.etiqueta}>Recordatorio</Text>
              <View style={styles.filaChips}>
                {OPCIONES_RECORDATORIO.map((op) => (
                  <TouchableOpacity
                    key={op.label}
                    style={[styles.chip, recordatorioMin === op.minutos && styles.chipActivo]}
                    onPress={() => setRecordatorioMin(op.minutos)}
                  >
                    <Text style={recordatorioMin === op.minutos ? styles.chipTextoActivo : styles.chipTexto}>{op.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.filaBotones}>
                <TouchableOpacity style={styles.botonCancelar} onPress={() => setModalVisible(false)}>
                  <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botonGuardar} onPress={guardar}>
                  <Text style={styles.botonGuardarTexto}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitulo: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: colors.texto },
  etiqueta: { fontWeight: '600', color: colors.texto, marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, color: colors.texto },
  filaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E5E7EB' },
  chipActivo: { backgroundColor: colors.primario },
  chipTexto: { color: colors.texto },
  chipTextoActivo: { color: '#fff', fontWeight: '600' },
  filaBotones: { flexDirection: 'row', marginTop: 20, marginBottom: 10 },
  botonCancelar: { flex: 1, padding: 12, alignItems: 'center', marginRight: 8, borderRadius: 8, backgroundColor: '#E5E7EB' },
  botonCancelarTexto: { color: colors.texto, fontWeight: '600' },
  botonGuardar: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: colors.primario },
  botonGuardarTexto: { color: '#fff', fontWeight: '700' },
});
