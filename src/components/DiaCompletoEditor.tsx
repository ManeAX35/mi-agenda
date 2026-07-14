import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { listarTareasPorFecha, crearTarea, marcarTareaCompletada, eliminarTarea } from '../db/tareasRepo';
import { obtenerEntrada, guardarEntrada } from '../db/diarioRepo';
import { TareaDia } from '../types';
import { colors } from '../utils/theme';

interface Props {
  fecha: string; // "YYYY-MM-DD"
}

function formatearFecha(fecha: string): string {
  const f = new Date(fecha + 'T00:00:00');
  return f.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function DiaCompletoEditor({ fecha }: Props) {
  const [tareas, setTareas] = useState<TareaDia[]>([]);
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [diario, setDiario] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setTareas(await listarTareasPorFecha(fecha));
    const entrada = await obtenerEntrada(fecha);
    setDiario(entrada?.contenido || '');
  }, [fecha]);

  useEffect(() => {
    cargar();
  }, [cargar]);

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
    Alert.alert('Eliminar tarea', '¿Quitar esta tarea?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await eliminarTarea(id); cargar(); } },
    ]);
  }

  const hechas = tareas.filter((t) => t.completado).length;

  return (
    <View>
      <Text style={styles.fechaTitulo}>{formatearFecha(fecha)}</Text>

      <Text style={styles.seccionTitulo}>
        Tareas {tareas.length > 0 ? `(${hechas}/${tareas.length})` : ''}
      </Text>
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

      {tareas.length === 0 ? (
        <Text style={styles.vacio}>Sin tareas agregadas para este día.</Text>
      ) : (
        tareas.map((item) => (
          <View key={item.id} style={styles.tareaFila}>
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
        ))
      )}

      <Text style={[styles.seccionTitulo, { marginTop: 20 }]}>Diario</Text>
      <Text style={styles.ayuda}>¿Qué hiciste este día? Escribe libremente.</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
