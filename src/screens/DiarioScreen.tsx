import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarEntradasRecientes, guardarEntrada } from '../db/diarioRepo';
import { EntradaDiario } from '../types';
import { colors } from '../utils/theme';

function formatearFecha(fechaISO: string): string {
  const fecha = new Date(fechaISO + 'T00:00:00');
  return fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DiarioScreen() {
  const [entradas, setEntradas] = useState<EntradaDiario[]>([]);
  const [entradaAbierta, setEntradaAbierta] = useState<EntradaDiario | null>(null);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  async function cargar() {
    setEntradas(await listarEntradasRecientes(90));
  }

  function abrir(entrada: EntradaDiario) {
    setEntradaAbierta(entrada);
    setTexto(entrada.contenido);
  }

  async function guardarCambios() {
    if (!entradaAbierta) return;
    setGuardando(true);
    await guardarEntrada(entradaAbierta.fecha, texto);
    setGuardando(false);
    setEntradaAbierta(null);
    cargar();
  }

  return (
    <View style={styles.contenedor}>
      <FlatList
        data={entradas}
        keyExtractor={(item) => item.fecha}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={styles.vacio}>
            Aún no tienes entradas de diario. Escribe algo en la pestaña "Hoy" y aparecerá aquí.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.tarjeta} onPress={() => abrir(item)}>
            <Text style={styles.fecha}>{formatearFecha(item.fecha)}</Text>
            <Text style={styles.contenido} numberOfLines={3}>
              {item.contenido.trim() || '(sin escribir nada ese día)'}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!entradaAbierta} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContenido}>
            {entradaAbierta && (
              <>
                <Text style={styles.modalTitulo}>{formatearFecha(entradaAbierta.fecha)}</Text>
                <TextInput
                  style={styles.textarea}
                  multiline
                  value={texto}
                  onChangeText={setTexto}
                  placeholder="Escribe qué hiciste ese día..."
                  autoFocus
                />
                <View style={styles.filaBotones}>
                  <TouchableOpacity style={styles.botonCancelar} onPress={() => setEntradaAbierta(null)}>
                    <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.botonGuardar} onPress={guardarCambios}>
                    <Text style={styles.botonGuardarTexto}>{guardando ? 'Guardando...' : 'Guardar'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.fondo },
  vacio: { color: colors.textoSecundario, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
  tarjeta: { backgroundColor: colors.tarjeta, borderRadius: 10, padding: 14, marginBottom: 10 },
  fecha: { fontWeight: '700', color: colors.texto, marginBottom: 4, textTransform: 'capitalize' },
  contenido: { color: colors.textoSecundario },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, minHeight: '60%' },
  modalTitulo: { fontSize: 16, fontWeight: '700', color: colors.texto, marginBottom: 12, textTransform: 'capitalize' },
  textarea: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, textAlignVertical: 'top', minHeight: 200 },
  filaBotones: { flexDirection: 'row', marginTop: 16 },
  botonCancelar: { flex: 1, padding: 12, alignItems: 'center', marginRight: 8, borderRadius: 8, backgroundColor: '#E5E7EB' },
  botonCancelarTexto: { color: colors.texto, fontWeight: '600' },
  botonGuardar: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: colors.primario },
  botonGuardarTexto: { color: '#fff', fontWeight: '700' },
});
