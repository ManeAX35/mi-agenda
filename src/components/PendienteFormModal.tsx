import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { crearPendiente, actualizarPendiente } from '../db/pendientesRepo';
import { parsearRecordatorios } from '../utils/notifications';
import { Pendiente } from '../types';
import { Paleta } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import SelectorRecordatorios from './SelectorRecordatorios';

const TIPOS: { key: Pendiente['tipo']; label: string }[] = [
  { key: 'pago', label: 'Pago' },
  { key: 'junta', label: 'Junta' },
  { key: 'entrega', label: 'Entrega' },
  { key: 'otro', label: 'Otro' },
];

const OPCIONES_REPETIR: { key: 'nunca' | 'semanal' | 'mensual'; label: string }[] = [
  { key: 'nunca', label: 'No se repite' },
  { key: 'semanal', label: 'Cada semana' },
  { key: 'mensual', label: 'Cada mes' },
];

interface Props {
  visible: boolean;
  editando?: Pendiente | null;
  fechaInicial?: Date;
  onClose: () => void;
  onGuardado: () => void;
}

export default function PendienteFormModal({ visible, editando, fechaInicial, onClose, onGuardado }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<Pendiente['tipo']>('otro');
  const [fecha, setFecha] = useState(new Date());
  const [mostrarPicker, setMostrarPicker] = useState<'fecha' | 'hora' | null>(null);
  const [recordatoriosMinutos, setRecordatoriosMinutos] = useState<number[]>([60, 30]);
  const [repetir, setRepetir] = useState<'nunca' | 'semanal' | 'mensual'>('nunca');

  useEffect(() => {
    if (!visible) return;
    if (editando) {
      setTitulo(editando.titulo);
      setDescripcion(editando.descripcion || '');
      setTipo(editando.tipo);
      setFecha(new Date(editando.fecha_limite));
      const existentes = parsearRecordatorios(editando.recordatorios_json).map((r) => r.minutos);
      setRecordatoriosMinutos(existentes.length > 0 ? existentes : [60, 30]);
      setRepetir(editando.repetir || 'nunca');
    } else {
      setTitulo('');
      setDescripcion('');
      setTipo('otro');
      setFecha(fechaInicial || new Date());
      setRecordatoriosMinutos([60, 30]);
      setRepetir('nunca');
    }
  }, [visible, editando, fechaInicial]);

  async function guardar() {
    if (!titulo.trim()) {
      Alert.alert('Falta el título', 'Escribe qué es este pendiente.');
      return;
    }
    const fechaISO = fecha.toISOString();
    const repetirValor = repetir === 'nunca' ? null : repetir;
    if (editando) {
      await actualizarPendiente({
        ...editando,
        titulo,
        descripcion,
        fecha_limite: fechaISO,
        tipo,
        repetir: repetirValor,
        recordatoriosMinutos,
      });
    } else {
      await crearPendiente({
        titulo,
        descripcion,
        fecha_limite: fechaISO,
        tipo,
        repetir: repetirValor,
        recordatoriosMinutos,
      });
    }
    onGuardado();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalFondo}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <View style={styles.modalContenido}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitulo}>{editando ? 'Editar pendiente' : 'Nuevo pendiente'}</Text>

            <Text style={styles.etiqueta}>Título</Text>
            <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder="Ej. Pagar renta" placeholderTextColor={colors.textoSecundario} />

            <Text style={styles.etiqueta}>Notas (opcional)</Text>
            <TextInput style={styles.input} value={descripcion} onChangeText={setDescripcion} multiline placeholder="Detalles..." placeholderTextColor={colors.textoSecundario} />

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
              <Text style={{ color: colors.texto }}>{fecha.toLocaleDateString('es-MX')} {fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</Text>
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

            <Text style={styles.etiqueta}>Repetir</Text>
            <Text style={styles.ayuda}>Cada vez que lo marques como hecho ✓, se crea el siguiente automáticamente — sigue así sin fin hasta que tú lo borres (no basta con completarlo para que pare).</Text>
            <View style={styles.filaChips}>
              {OPCIONES_REPETIR.map((op) => (
                <TouchableOpacity
                  key={op.key}
                  style={[styles.chip, repetir === op.key && styles.chipActivo]}
                  onPress={() => setRepetir(op.key)}
                >
                  <Text style={repetir === op.key ? styles.chipTextoActivo : styles.chipTexto}>{op.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <SelectorRecordatorios seleccionados={recordatoriosMinutos} onChange={setRecordatoriosMinutos} />

            <View style={styles.filaBotones}>
              <TouchableOpacity style={styles.botonCancelar} onPress={onClose}>
                <Text style={styles.botonCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonGuardar} onPress={guardar}>
                <Text style={styles.botonGuardarTexto}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function crearEstilos(colors: Paleta) {
  return StyleSheet.create({
    modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContenido: { backgroundColor: colors.tarjeta, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '90%' },
    modalTitulo: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: colors.texto },
    etiqueta: { fontWeight: '600', color: colors.texto, marginTop: 10, marginBottom: 4 },
    ayuda: { color: colors.textoSecundario, fontSize: 12, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: colors.borde, borderRadius: 8, padding: 10, color: colors.texto },
    filaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.fondo },
    chipActivo: { backgroundColor: colors.primario },
    chipTexto: { color: colors.texto },
    chipTextoActivo: { color: '#fff', fontWeight: '600' },
    filaBotones: { flexDirection: 'row', marginTop: 20, marginBottom: 10 },
    botonCancelar: { flex: 1, padding: 12, alignItems: 'center', marginRight: 8, borderRadius: 8, backgroundColor: colors.fondo },
    botonCancelarTexto: { color: colors.texto, fontWeight: '600' },
    botonGuardar: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: colors.primario },
    botonGuardarTexto: { color: '#fff', fontWeight: '700' },
  });
}
