import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  crearActividadEnVariosDias,
  actualizarActividad,
  listarActividades,
  actividadesEnConflicto,
} from '../db/actividadesRepo';
import { parsearRecordatorios } from '../utils/notifications';
import { ActividadRecurrente, DiaSemana } from '../types';
import { colors } from '../utils/theme';
import SelectorRecordatorios from './SelectorRecordatorios';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const CATEGORIAS = ['Clase', 'Trabajo', 'Otro'];
const PALETA = ['#4F46E5', '#DC2626', '#16A34A', '#F59E0B', '#0891B2', '#9333EA'];

interface Props {
  visible: boolean;
  editando?: ActividadRecurrente | null;
  diaInicial?: DiaSemana;
  horaInicioInicial?: string;
  horaFinInicial?: string;
  onClose: () => void;
  onGuardado: () => void;
}

export default function ActividadFormModal({
  visible,
  editando,
  diaInicial,
  horaInicioInicial,
  horaFinInicial,
  onClose,
  onGuardado,
}: Props) {
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [diaSemana, setDiaSemana] = useState<DiaSemana>(1); // usado al editar (un registro = un día)
  const [diasSeleccionados, setDiasSeleccionados] = useState<DiaSemana[]>([1]); // usado al crear
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [lugar, setLugar] = useState('');
  const [color, setColor] = useState(PALETA[0]);
  const [recordatoriosMinutos, setRecordatoriosMinutos] = useState<number[]>([60, 30]);

  // Cada vez que se abre el modal, recalcula los valores iniciales según si es
  // edición, o si viene de tocar una hora en la Agenda (diaInicial/horaInicioInicial).
  useEffect(() => {
    if (!visible) return;
    if (editando) {
      setTitulo(editando.titulo);
      setCategoria(editando.categoria);
      setDiaSemana(editando.dia_semana);
      setHoraInicio(editando.hora_inicio);
      setHoraFin(editando.hora_fin);
      setLugar(editando.lugar || '');
      setColor(editando.color || PALETA[0]);
      const existentes = parsearRecordatorios(editando.recordatorios_json).map((r) => r.minutos);
      setRecordatoriosMinutos(existentes.length > 0 ? existentes : [60, 30]);
    } else {
      setTitulo('');
      setCategoria(CATEGORIAS[0]);
      const dia = diaInicial ?? 1;
      setDiaSemana(dia);
      setDiasSeleccionados([dia]);
      setHoraInicio(horaInicioInicial || '09:00');
      setHoraFin(horaFinInicial || '10:00');
      setLugar('');
      setColor(PALETA[0]);
      setRecordatoriosMinutos([60, 30]);
    }
  }, [visible, editando, diaInicial, horaInicioInicial, horaFinInicial]);

  function validarHora(h: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
  }

  function minutosInvalidos(inicio: string, fin: string): boolean {
    const [hi, mi] = inicio.split(':').map(Number);
    const [hf, mf] = fin.split(':').map(Number);
    return hi * 60 + mi >= hf * 60 + mf;
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
    if (minutosInvalidos(horaInicio, horaFin)) {
      Alert.alert('Horario inválido', 'La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    const existentes = await listarActividades();

    if (editando) {
      const conflictos = actividadesEnConflicto(existentes, diaSemana, horaInicio, horaFin, editando.id);
      if (conflictos.length > 0) {
        Alert.alert(
          'Ya tienes algo en ese horario',
          `Se cruza con "${conflictos[0].titulo}" (${conflictos[0].hora_inicio}-${conflictos[0].hora_fin}) el ${DIAS[diaSemana]}. Cambia el horario o el día para guardar.`
        );
        return;
      }
      await actualizarActividad({
        ...editando,
        titulo,
        categoria,
        dia_semana: diaSemana,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        lugar,
        color,
        recordatoriosMinutos,
      });
    } else {
      if (diasSeleccionados.length === 0) {
        Alert.alert('Elige al menos un día', 'Marca los días de la semana en que ocurre esta actividad.');
        return;
      }
      // Revisa traslapes en TODOS los días seleccionados antes de crear cualquiera
      for (const dia of diasSeleccionados) {
        const conflictos = actividadesEnConflicto(existentes, dia, horaInicio, horaFin);
        if (conflictos.length > 0) {
          Alert.alert(
            'Ya tienes algo en ese horario',
            `Se cruza con "${conflictos[0].titulo}" (${conflictos[0].hora_inicio}-${conflictos[0].hora_fin}) el ${DIAS[dia]}. Cambia el horario o quita ese día para guardar.`
          );
          return;
        }
      }
      await crearActividadEnVariosDias(
        { titulo, categoria, hora_inicio: horaInicio, hora_fin: horaFin, lugar, color, recordatoriosMinutos },
        diasSeleccionados
      );
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

const styles = StyleSheet.create({
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
