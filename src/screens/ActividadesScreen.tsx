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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  listarActividades,
  crearActividad,
  crearActividadEnVariosDias,
  actualizarActividad,
  eliminarActividad,
} from '../db/actividadesRepo';
import { ActividadRecurrente, DiaSemana } from '../types';
import { colors } from '../utils/theme';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const CATEGORIAS = ['Clase', 'Trabajo', 'Otro'];
const PALETA = ['#4F46E5', '#DC2626', '#16A34A', '#F59E0B', '#0891B2', '#9333EA'];

export default function ActividadesScreen() {
  const [actividades, setActividades] = useState<ActividadRecurrente[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<ActividadRecurrente | null>(null);

  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [diaSemana, setDiaSemana] = useState<DiaSemana>(1); // usado solo al editar (un registro = un día)
  const [diasSeleccionados, setDiasSeleccionados] = useState<DiaSemana[]>([1]); // usado al crear (varios días a la vez)
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [lugar, setLugar] = useState('');
  const [color, setColor] = useState(PALETA[0]);

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
    setTitulo('');
    setCategoria(CATEGORIAS[0]);
    setDiaSemana(1);
    setDiasSeleccionados([1]);
    setHoraInicio('09:00');
    setHoraFin('10:00');
    setLugar('');
    setColor(PALETA[0]);
    setModalVisible(true);
  }

  function abrirEditar(a: ActividadRecurrente) {
    setEditando(a);
    setTitulo(a.titulo);
    setCategoria(a.categoria);
    setDiaSemana(a.dia_semana);
    setHoraInicio(a.hora_inicio);
    setHoraFin(a.hora_fin);
    setLugar(a.lugar || '');
    setColor(a.color || PALETA[0]);
    setModalVisible(true);
  }

  function validarHora(h: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
  }

  function alternarDia(dia: DiaSemana) {
    setDiasSeleccionados((actuales) =>
      actuales.includes(dia) ? actuales.filter((d) => d !== dia) : [...actuales, dia]
    );
  }

  async function guardar() {
    if (!titulo.trim()) {
      Alert.alert('Falta el título', 'Escribe un nombre para la actividad.');
      return;
    }
    if (!validarHora(horaInicio) || !validarHora(horaFin)) {
      Alert.alert('Formato de hora inválido', 'Usa el formato HH:MM, ej. 09:30');
      return;
    }
    if (editando) {
      // Al editar, cada registro sigue representando un solo día
      await actualizarActividad({
        ...editando,
        titulo,
        categoria,
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        lugar,
        color,
      });
    } else {
      if (diasSeleccionados.length === 0) {
        Alert.alert('Elige al menos un día', 'Marca los días de la semana en que ocurre esta actividad.');
        return;
      }
      // Al crear, se puede elegir varios días: se crea un registro por cada uno
      await crearActividadEnVariosDias(
        { titulo, categoria, hora_inicio: horaInicio, hora_fin: horaFin, lugar, color },
        diasSeleccionados
      );
    }
    setModalVisible(false);
    cargar();
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

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalFondo}>
          <View style={styles.modalContenido}>
            <ScrollView>
              <Text style={styles.modalTitulo}>{editando ? 'Editar actividad' : 'Nueva actividad'}</Text>

              <Text style={styles.etiqueta}>Título</Text>
              <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder="Ej. Cálculo III" />

              <Text style={styles.etiqueta}>Categoría</Text>
              <View style={styles.filaChips}>
                {CATEGORIAS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, categoria === c && styles.chipActivo]}
                    onPress={() => setCategoria(c)}
                  >
                    <Text style={categoria === c ? styles.chipTextoActivo : styles.chipTexto}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {editando ? (
                <>
                  <Text style={styles.etiqueta}>Día de la semana</Text>
                  <View style={styles.filaChips}>
                    {DIAS.map((d, idx) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.chip, diaSemana === idx && styles.chipActivo]}
                        onPress={() => setDiaSemana(idx as DiaSemana)}
                      >
                        <Text style={diaSemana === idx ? styles.chipTextoActivo : styles.chipTexto}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.etiqueta}>Días de la semana (elige uno o varios)</Text>
                  <View style={styles.filaChips}>
                    {DIAS.map((d, idx) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.chip, diasSeleccionados.includes(idx as DiaSemana) && styles.chipActivo]}
                        onPress={() => alternarDia(idx as DiaSemana)}
                      >
                        <Text style={diasSeleccionados.includes(idx as DiaSemana) ? styles.chipTextoActivo : styles.chipTexto}>
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.ayudaTexto}>
                    Se creará "{titulo || 'la actividad'}" en {diasSeleccionados.length || 0} día(s) con el mismo horario.
                  </Text>
                </>
              )}

              <View style={styles.filaHoras}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.etiqueta}>Hora inicio</Text>
                  <TextInput style={styles.input} value={horaInicio} onChangeText={setHoraInicio} placeholder="09:00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.etiqueta}>Hora fin</Text>
                  <TextInput style={styles.input} value={horaFin} onChangeText={setHoraFin} placeholder="10:00" />
                </View>
              </View>

              <Text style={styles.etiqueta}>Lugar (opcional)</Text>
              <TextInput style={styles.input} value={lugar} onChangeText={setLugar} placeholder="Ej. Salón 4, Oficina" />

              <Text style={styles.etiqueta}>Color</Text>
              <View style={styles.filaChips}>
                {PALETA.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActivo]}
                    onPress={() => setColor(c)}
                  />
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
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitulo: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: colors.texto },
  etiqueta: { fontWeight: '600', color: colors.texto, marginTop: 10, marginBottom: 4 },
  ayudaTexto: { color: colors.textoSecundario, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, color: colors.texto },
  filaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E5E7EB' },
  chipActivo: { backgroundColor: colors.primario },
  chipTexto: { color: colors.texto },
  chipTextoActivo: { color: '#fff', fontWeight: '600' },
  filaHoras: { flexDirection: 'row', marginTop: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorDotActivo: { borderColor: colors.texto },
  filaBotones: { flexDirection: 'row', marginTop: 20, marginBottom: 10 },
  botonCancelar: { flex: 1, padding: 12, alignItems: 'center', marginRight: 8, borderRadius: 8, backgroundColor: '#E5E7EB' },
  botonCancelarTexto: { color: colors.texto, fontWeight: '600' },
  botonGuardar: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: colors.primario },
  botonGuardarTexto: { color: '#fff', fontWeight: '700' },
});
