import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { listarActividades } from '../db/actividadesRepo';
import { listarPendientes } from '../db/pendientesRepo';
import { ActividadRecurrente, Pendiente, DiaSemana } from '../types';
import { colors } from '../utils/theme';
import HorarioSemanal from '../components/HorarioSemanal';
import ActividadFormModal from '../components/ActividadFormModal';
import PendienteFormModal from '../components/PendienteFormModal';
import DiaTimeline, { EventoDia } from '../components/DiaTimeline';

const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default function AgendaScreen() {
  const [modo, setModo] = useState<'semana' | 'mes'>('semana');
  const [actividades, setActividades] = useState<ActividadRecurrente[]>([]);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Un solo modal de actividad, que sirve tanto para crear (tocando un slot vacío)
  // como para editar (tocando un bloque existente)
  const [modalActividadVisible, setModalActividadVisible] = useState(false);
  const [actividadEditando, setActividadEditando] = useState<ActividadRecurrente | null>(null);
  const [slotTocado, setSlotTocado] = useState<{ dia: DiaSemana; hora: number } | null>(null);

  // Modal de pendiente, para editar tocando un bloque en la línea de tiempo del día,
  // o para crear uno nuevo (desde el botón "+" del mes, o eligiendo "Pendiente" al tocar un slot de la semana)
  const [modalPendienteVisible, setModalPendienteVisible] = useState(false);
  const [pendienteEditando, setPendienteEditando] = useState<Pendiente | null>(null);
  const [fechaInicialPendiente, setFechaInicialPendiente] = useState<Date | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  async function cargar() {
    setActividades(await listarActividades());
    setPendientes(await listarPendientes());
  }

  // Agrupa actividades recurrentes por día de la semana (0-6), para la cuadrícula semanal
  const porDia: Record<number, ActividadRecurrente[]> = {};
  for (const a of actividades) {
    if (!porDia[a.dia_semana]) porDia[a.dia_semana] = [];
    porDia[a.dia_semana].push(a);
  }

  // Marca en el calendario mensual: puntos para pendientes (naranja) y para días con
  // actividades recurrentes (morado), combinando ambos con "dots" de react-native-calendars.
  const marcas: Record<string, any> = {};
  for (const p of pendientes) {
    const fecha = p.fecha_limite.slice(0, 10);
    const dots = marcas[fecha]?.dots || [];
    marcas[fecha] = { ...marcas[fecha], dots: [...dots, { key: 'pendiente', color: colors.acento }] };
  }
  // Para marcar recurrentes en el mes, se revisa qué día de la semana cae cada fecha visible
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0); // incluye el mes siguiente por si se navega
  for (let d = new Date(inicioMes); d <= finMes; d.setDate(d.getDate() + 1)) {
    const diaSemana = d.getDay();
    if (porDia[diaSemana]?.length) {
      const fechaStr = d.toISOString().slice(0, 10);
      const dots = marcas[fechaStr]?.dots || [];
      marcas[fechaStr] = { ...marcas[fechaStr], dots: [...dots, { key: 'recurrente', color: colors.primario }] };
    }
  }
  marcas[fechaSeleccionada] = { ...(marcas[fechaSeleccionada] || {}), selected: true, selectedColor: colors.primario };

  const pendientesDelDia = pendientes.filter((p) => p.fecha_limite.slice(0, 10) === fechaSeleccionada);
  const diaSemanaSeleccionado = new Date(fechaSeleccionada + 'T00:00:00').getDay();
  const recurrentesDelDia = porDia[diaSemanaSeleccionado] || [];

  const eventosDelDia: EventoDia[] = [
    ...recurrentesDelDia.map((a) => ({
      id: `r-${a.id}`,
      titulo: a.titulo,
      subtitulo: `${a.hora_inicio}-${a.hora_fin}${a.lugar ? ' · ' + a.lugar : ''}`,
      horaInicio: a.hora_inicio,
      horaFin: a.hora_fin,
      color: a.color || colors.primario,
    })),
    ...pendientesDelDia.map((p) => ({
      id: `p-${p.id}`,
      titulo: p.titulo,
      subtitulo: `${p.tipo} · pendiente`,
      horaInicio: p.fecha_limite.slice(11, 16),
      horaFin: sumarMediaHora(p.fecha_limite.slice(11, 16)),
      color: colors.acento,
    })),
  ];

  /** Al tocar una actividad ya existente (en el horario semanal o en la línea del día), la abre para editar. */
  function editarActividad(a: ActividadRecurrente) {
    setActividadEditando(a);
    setSlotTocado(null);
    setModalActividadVisible(true);
  }

  /** Al tocar una hora vacía del horario semanal, pregunta si quiere una actividad recurrente
   *  o un pendiente puntual, ya que el horario semanal es un molde (no fechas reales). */
  function abrirNuevaDesdeSlot(dia: DiaSemana, hora: number) {
    Alert.alert('¿Qué quieres agregar?', `${DIAS_LARGOS[dia]} a las ${horaFormateada(hora)}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Pendiente',
        onPress: () => {
          setPendienteEditando(null);
          setFechaInicialPendiente(proximaFechaParaDia(dia, hora));
          setModalPendienteVisible(true);
        },
      },
      {
        text: 'Actividad recurrente',
        onPress: () => {
          setActividadEditando(null);
          setSlotTocado({ dia, hora });
          setModalActividadVisible(true);
        },
      },
    ]);
  }

  /** Calcula la próxima fecha real (a partir de hoy) que cae en un día de la semana y hora dados. */
  function proximaFechaParaDia(diaSemana: DiaSemana, hora: number): Date {
    const ahora = new Date();
    const resultado = new Date(ahora);
    const diff = (diaSemana - ahora.getDay() + 7) % 7;
    resultado.setDate(ahora.getDate() + diff);
    resultado.setHours(hora, 0, 0, 0);
    if (diff === 0 && resultado.getTime() < ahora.getTime()) {
      resultado.setDate(resultado.getDate() + 7); // si ya pasó hoy, salta a la próxima semana
    }
    return resultado;
  }

  /** Botón "+" del día en la vista mensual: solo crea un pendiente (una actividad recurrente
   *  no tiene sentido aquí porque no está atada a una fecha específica). */
  function abrirNuevoPendienteDelDia() {
    const base = new Date(fechaSeleccionada + 'T12:00:00');
    setPendienteEditando(null);
    setFechaInicialPendiente(base);
    setModalPendienteVisible(true);
  }

  function horaFormateada(hora: number): string {
    return `${String(hora).padStart(2, '0')}:00`;
  }

  function sumarMediaHora(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number);
    const totalMin = h * 60 + m + 30;
    const hh = Math.floor(totalMin / 60) % 24;
    const mm = totalMin % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  /** Al tocar un bloque en la línea de tiempo del día (mes), abre el editor correspondiente. */
  function editarEventoDelDia(id: string) {
    if (id.startsWith('r-')) {
      const real = recurrentesDelDia.find((a) => `r-${a.id}` === id);
      if (real) editarActividad(real);
    } else {
      const real = pendientesDelDia.find((p) => `p-${p.id}` === id);
      if (real) {
        setPendienteEditando(real);
        setFechaInicialPendiente(undefined);
        setModalPendienteVisible(true);
      }
    }
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.selectorModo}>
        <TouchableOpacity
          style={[styles.botonModo, modo === 'semana' && styles.botonModoActivo]}
          onPress={() => setModo('semana')}
        >
          <Text style={modo === 'semana' ? styles.textoModoActivo : styles.textoModo}>Semana</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.botonModo, modo === 'mes' && styles.botonModoActivo]}
          onPress={() => setModo('mes')}
        >
          <Text style={modo === 'mes' ? styles.textoModoActivo : styles.textoModo}>Mes</Text>
        </TouchableOpacity>
      </View>

      {modo === 'semana' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
          <Text style={styles.ayuda}>Desliza a los lados para ver todos los días →</Text>
          <HorarioSemanal
            actividadesPorDia={porDia}
            onPressActividad={editarActividad}
            onPressSlot={abrirNuevaDesdeSlot}
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <Calendar
            onDayPress={(day) => setFechaSeleccionada(day.dateString)}
            markingType="multi-dot"
            markedDates={marcas}
            theme={{
              todayTextColor: colors.primario,
              selectedDayBackgroundColor: colors.primario,
              arrowColor: colors.primario,
            }}
          />
          <View style={styles.leyenda}>
            <View style={styles.leyendaItem}>
              <View style={[styles.dotLeyenda, { backgroundColor: colors.primario }]} />
              <Text style={styles.leyendaTexto}>Actividad recurrente</Text>
            </View>
            <View style={styles.leyendaItem}>
              <View style={[styles.dotLeyenda, { backgroundColor: colors.acento }]} />
              <Text style={styles.leyendaTexto}>Pendiente</Text>
            </View>
          </View>

          <View style={styles.diaBloque}>
            <View style={styles.filaTituloDia}>
              <Text style={styles.diaTitulo}>Tu día · {fechaSeleccionada}</Text>
              <TouchableOpacity style={styles.botonAgregarPendiente} onPress={abrirNuevoPendienteDelDia}>
                <Text style={styles.botonAgregarPendienteTexto}>+ Pendiente</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.ayuda}>Actividades recurrentes y pendientes juntos. Si se cruzan en horario, se ven lado a lado.</Text>
            <DiaTimeline eventos={eventosDelDia} onPressEvento={editarEventoDelDia} esHoy={fechaSeleccionada === new Date().toISOString().slice(0, 10)} />
          </View>
        </ScrollView>
      )}

      <ActividadFormModal
        visible={modalActividadVisible}
        editando={actividadEditando}
        diaInicial={slotTocado?.dia}
        horaInicioInicial={slotTocado ? horaFormateada(slotTocado.hora) : undefined}
        horaFinInicial={slotTocado ? horaFormateada(slotTocado.hora + 1) : undefined}
        onClose={() => setModalActividadVisible(false)}
        onGuardado={() => {
          setModalActividadVisible(false);
          cargar();
        }}
      />

      <PendienteFormModal
        visible={modalPendienteVisible}
        editando={pendienteEditando}
        fechaInicial={fechaInicialPendiente}
        onClose={() => setModalPendienteVisible(false)}
        onGuardado={() => {
          setModalPendienteVisible(false);
          setFechaInicialPendiente(undefined);
          cargar();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.fondo },
  selectorModo: { flexDirection: 'row', margin: 12, backgroundColor: colors.tarjeta, borderRadius: 10, padding: 4 },
  botonModo: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  botonModoActivo: { backgroundColor: colors.primario },
  textoModo: { color: colors.textoSecundario, fontWeight: '600' },
  textoModoActivo: { color: '#fff', fontWeight: '600' },
  ayuda: { color: colors.textoSecundario, fontSize: 12, marginLeft: 16, marginBottom: 6 },
  leyenda: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dotLeyenda: { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { color: colors.textoSecundario, fontSize: 12 },
  diaBloque: { paddingHorizontal: 16, marginTop: 12 },
  filaTituloDia: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  botonAgregarPendiente: { backgroundColor: colors.acento, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  botonAgregarPendienteTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  diaTitulo: { fontSize: 16, fontWeight: '700', color: colors.texto, marginBottom: 6 },
  sinActividades: { color: colors.textoSecundario, fontStyle: 'italic', marginBottom: 8 },
  actividadItem: {
    backgroundColor: colors.tarjeta,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  actividadTitulo: { fontWeight: '700', color: colors.texto },
  actividadHora: { color: colors.textoSecundario, marginTop: 2 },
});
