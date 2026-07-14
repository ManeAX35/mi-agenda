import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarTareasPorFecha, crearTarea, marcarTareaCompletada, eliminarTarea } from '../db/tareasRepo';
import { obtenerEntrada, guardarEntrada } from '../db/diarioRepo';
import { TareaDia } from '../types';
import { colors } from '../utils/theme';

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HoyScreen() {
  const fecha = hoyISO();
  const [tareas, setTareas] = useState<TareaDia[]>([]);
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [diario, setDiario] = useState('');
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  async function cargar() {
    setTareas(await listarTareasPorFecha(fecha));
    const entrada = await obtenerEntrada(fecha);
    setDiario(entrada?.contenido || '');
  }

  async function agregarTarea() {
    if (!nuevaTarea.trim()) return;
    await crearTarea(nuevaTarea.trim(), fecha);
    setNuevaTarea('');
    cargar();
  }

  async function guardarDiario() {
    setGuardando(true);
    await guardarEntrada(fecha, diario);
    setGuardando(false);
  }

  function confirmarEliminar(id: number) {
    Alert.alert('Eliminar tarea', '¿Quitar esta tarea de hoy?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await eliminarTarea(id); cargar(); } },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.contenedor}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        data={tareas}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            <Text style={styles.fechaTitulo}>
              Hoy · {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>

            <Text style={styles.seccionTitulo}>Tareas de hoy</Text>
            <View style={styles.filaInput}>
              <TextInput
                style={styles.inputTarea}
                placeholder="Ej. Comprar despensa"
                value={nuevaTarea}
                onChangeText={setNuevaTarea}
                onSubmitEditing={agregarTarea}
              />
              <TouchableOpacity style={styles.botonAgregar} onPress={agregarTarea}>
                <Text style={styles.botonAgregarTexto}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.tareaFila}>
            <TouchableOpacity
              style={[styles.checkbox, !!item.completado && styles.checkboxMarcado]}
              onPress={async () => { await marcarTareaCompletada(item.id, !item.completado); cargar(); }}
            >
              {!!item.completado && <Text style={styles.checkboxTexto}>✓</Text>}
            </TouchableOpacity>
            <Text style={[styles.tareaTexto, !!item.completado && styles.tachado]}>{item.titulo}</Text>
            <TouchableOpacity onPress={() => confirmarEliminar(item.id)}>
              <Text style={styles.eliminar}>×</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vacio}>Sin tareas agregadas todavía hoy.</Text>}
        ListFooterComponent={
          <>
            <Text style={[styles.seccionTitulo, { marginTop: 24 }]}>Diario de hoy</Text>
            <Text style={styles.ayuda}>¿Qué hiciste hoy? Escribe libremente, se guarda automáticamente.</Text>
            <TextInput
              style={styles.diarioInput}
              multiline
              placeholder="Hoy trabajé en..., fui a..., aprendí..."
              value={diario}
              onChangeText={setDiario}
              onBlur={guardarDiario}
            />
            <TouchableOpacity style={styles.botonGuardarDiario} onPress={guardarDiario}>
              <Text style={styles.botonAgregarTexto}>{guardando ? 'Guardando...' : 'Guardar entrada'}</Text>
            </TouchableOpacity>
          </>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.fondo },
  fechaTitulo: { fontSize: 18, fontWeight: '700', color: colors.texto, marginBottom: 12, textTransform: 'capitalize' },
  seccionTitulo: { fontSize: 16, fontWeight: '700', color: colors.texto, marginBottom: 8 },
  ayuda: { color: colors.textoSecundario, marginBottom: 8 },
  filaInput: { flexDirection: 'row', marginBottom: 12 },
  inputTarea: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, backgroundColor: '#fff', marginRight: 8 },
  botonAgregar: { backgroundColor: colors.primario, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  botonAgregarTexto: { color: '#fff', fontWeight: '700' },
  tareaFila: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.tarjeta, borderRadius: 8, padding: 10, marginBottom: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.primario, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxMarcado: { backgroundColor: colors.exito, borderColor: colors.exito },
  checkboxTexto: { color: '#fff', fontWeight: '700', fontSize: 11 },
  tareaTexto: { flex: 1, color: colors.texto },
  tachado: { textDecorationLine: 'line-through', color: colors.textoSecundario },
  eliminar: { color: colors.peligro, fontSize: 20, paddingHorizontal: 6 },
  vacio: { color: colors.textoSecundario, fontStyle: 'italic', marginBottom: 8 },
  diarioInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, backgroundColor: '#fff', minHeight: 140, textAlignVertical: 'top' },
  botonGuardarDiario: { backgroundColor: colors.primario, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 10 },
});
