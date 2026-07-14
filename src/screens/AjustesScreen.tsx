import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, ModoColor } from '../context/ThemeContext';
import { Paleta, TEMAS, TemaId } from '../utils/theme';
import { obtenerConfig, guardarConfig } from '../db/configRepo';
import { activarResumenMatutino, obtenerConfigResumenMatutino } from '../utils/resumenMatutino';
import { generarRespaldoJSON, restaurarDesdeJSON } from '../db/backupRepo';
import { hoyLocalISO } from '../utils/tiempo';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const OPCIONES_TEMA: { key: ModoColor; nombre: string }[] = [
  { key: 'automatico', nombre: 'Automático (sigue tu teléfono)' },
  ...(Object.keys(TEMAS) as TemaId[]).map((id) => ({ key: id as ModoColor, nombre: TEMAS[id].nombre })),
];

export default function AjustesScreen() {
  const { colors, modo, setModo } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  const [horaInicioSemana, setHoraInicioSemana] = useState('6');
  const [horaFinSemana, setHoraFinSemana] = useState('22');
  const [resumenActivado, setResumenActivado] = useState(false);
  const [resumenHora, setResumenHora] = useState('07:00');

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [])
  );

  async function cargar() {
    const desde = await obtenerConfig('semana_hora_inicio');
    const hasta = await obtenerConfig('semana_hora_fin');
    setHoraInicioSemana(desde || '6');
    setHoraFinSemana(hasta || '22');

    const { activado, hora } = await obtenerConfigResumenMatutino();
    setResumenActivado(activado);
    setResumenHora(hora);
  }

  async function guardarRangoHoras() {
    const desde = parseInt(horaInicioSemana, 10);
    const hasta = parseInt(horaFinSemana, 10);
    if (isNaN(desde) || isNaN(hasta) || desde < 0 || hasta > 24 || desde >= hasta) {
      Alert.alert('Rango inválido', 'Usa horas entre 0 y 24, con "Desde" menor que "Hasta".');
      return;
    }
    await guardarConfig('semana_hora_inicio', String(desde));
    await guardarConfig('semana_hora_fin', String(hasta));
    Alert.alert('Listo', 'El rango de horas se actualizó. Se verá reflejado al volver a la pestaña Agenda.');
  }

  async function alternarResumen(valor: boolean) {
    setResumenActivado(valor);
    await activarResumenMatutino(valor, resumenHora);
  }

  async function guardarHoraResumen() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(resumenHora)) {
      Alert.alert('Hora inválida', 'Usa el formato HH:MM, ej. 07:00');
      return;
    }
    await activarResumenMatutino(resumenActivado, resumenHora);
    Alert.alert('Listo', 'Se reprogramó el resumen matutino con la nueva hora.');
  }

  async function exportarRespaldo() {
    try {
      const json = await generarRespaldoJSON();
      const nombreArchivo = `mi-agenda-respaldo-${hoyLocalISO()}.json`;
      const archivo = new File(Paths.cache, nombreArchivo);
      if (archivo.exists) archivo.delete();
      archivo.create();
      archivo.write(json);

      const disponible = await Sharing.isAvailableAsync();
      if (disponible) {
        await Sharing.shareAsync(archivo.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Guardar respaldo de Mi Agenda',
        });
      } else {
        Alert.alert('Respaldo generado', `Se guardó en: ${archivo.uri}`);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar el respaldo. Intenta de nuevo.');
    }
  }

  async function importarRespaldo() {
    try {
      const resultado = await File.pickFileAsync({ mimeTypes: ['application/json'] });
      if (resultado.canceled) return;
      const contenido = await resultado.result.text();

      Alert.alert(
        'Restaurar respaldo',
        'Esto va a REEMPLAZAR todos tus datos actuales (actividades, pendientes, tareas y diario) con los del archivo elegido. Esta acción no se puede deshacer. ¿Seguro que quieres continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: async () => {
              try {
                await restaurarDesdeJSON(contenido);
                Alert.alert('Listo', 'Tus datos se restauraron correctamente. Cierra y vuelve a abrir la app para verlo todo actualizado.');
              } catch (e: any) {
                Alert.alert('Error al restaurar', e?.message || 'No se pudo restaurar el respaldo.');
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir el archivo. Asegúrate de elegir un .json exportado por Mi Agenda.');
    }
  }

  return (
    <ScrollView style={styles.contenedor} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.seccion}>Tema de color</Text>
      <Text style={styles.ayuda}>10 temas para elegir, o Automático para seguir el modo de tu teléfono.</Text>
      <View style={styles.grillaTemas}>
        {OPCIONES_TEMA.map((op) => {
          const paletaPreview = op.key === 'automatico' ? TEMAS.claro.paleta : TEMAS[op.key as TemaId].paleta;
          const activo = modo === op.key;
          return (
            <TouchableOpacity
              key={op.key}
              style={[styles.tarjetaTema, activo && { borderColor: colors.primario, borderWidth: 2 }]}
              onPress={() => setModo(op.key)}
            >
              <View style={styles.filaSwatches}>
                <View style={[styles.swatch, { backgroundColor: paletaPreview.primario }]} />
                <View style={[styles.swatch, { backgroundColor: paletaPreview.acento }]} />
                <View style={[styles.swatch, { backgroundColor: paletaPreview.fondo, borderWidth: 1, borderColor: colors.borde }]} />
              </View>
              <Text style={styles.nombreTema} numberOfLines={1}>{op.nombre}</Text>
              {activo && <Text style={styles.checkTema}>✓ Activo</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.seccion}>Horario semanal visible</Text>
      <Text style={styles.ayuda}>Rango de horas que se muestra en Agenda → Semana (0 a 24).</Text>
      <View style={styles.filaHoras}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.etiqueta}>Desde</Text>
          <TextInput
            style={styles.input}
            value={horaInicioSemana}
            onChangeText={setHoraInicioSemana}
            keyboardType="number-pad"
            placeholder="6"
            placeholderTextColor={colors.textoSecundario}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.etiqueta}>Hasta</Text>
          <TextInput
            style={styles.input}
            value={horaFinSemana}
            onChangeText={setHoraFinSemana}
            keyboardType="number-pad"
            placeholder="22"
            placeholderTextColor={colors.textoSecundario}
          />
        </View>
      </View>
      <TouchableOpacity style={styles.boton} onPress={guardarRangoHoras}>
        <Text style={styles.botonTexto}>Guardar rango de horas</Text>
      </TouchableOpacity>

      <Text style={styles.seccion}>Resumen matutino</Text>
      <View style={styles.filaSwitch}>
        <Text style={styles.etiqueta}>Avisarme cada mañana</Text>
        <Switch value={resumenActivado} onValueChange={alternarResumen} />
      </View>
      {resumenActivado && (
        <>
          <Text style={styles.etiqueta}>Hora del aviso</Text>
          <TextInput
            style={styles.input}
            value={resumenHora}
            onChangeText={setResumenHora}
            placeholder="07:00"
            placeholderTextColor={colors.textoSecundario}
          />
          <TouchableOpacity style={styles.boton} onPress={guardarHoraResumen}>
            <Text style={styles.botonTexto}>Guardar hora</Text>
          </TouchableOpacity>
          <Text style={styles.ayuda}>
            Se reprograma cada vez que abres la app, con tus actividades y pendientes de ese día. Si Android
            retrasa notificaciones en segundo plano por ahorro de batería, puede no llegar exactamente a la hora.
          </Text>
        </>
      )}

      <Text style={styles.seccion}>Respaldo de datos</Text>
      <Text style={styles.ayuda}>
        Todo vive solo en este teléfono. "Exportar" junta actividades, pendientes, tareas y diario en un
        archivo que puedes guardar donde quieras (Drive, WhatsApp, correo). "Restaurar" lee ese archivo y
        reemplaza los datos actuales — úsalo si cambias de teléfono o algo se pierde.
      </Text>
      <TouchableOpacity style={styles.boton} onPress={exportarRespaldo}>
        <Text style={styles.botonTexto}>⬆️ Exportar respaldo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.boton, styles.botonSecundario]} onPress={importarRespaldo}>
        <Text style={[styles.botonTexto, styles.botonSecundarioTexto]}>⬇️ Restaurar desde respaldo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function crearEstilos(colors: Paleta) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: colors.fondo },
    seccion: { fontSize: 16, fontWeight: '700', color: colors.texto, marginTop: 20, marginBottom: 8 },
    ayuda: { color: colors.textoSecundario, fontSize: 12, marginBottom: 8 },
    etiqueta: { fontWeight: '600', color: colors.texto, marginTop: 8, marginBottom: 4 },
    filaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.tarjeta },
    chipActivo: { backgroundColor: colors.primario },
    chipTexto: { color: colors.texto },
    chipTextoActivo: { color: '#fff', fontWeight: '600' },
    grillaTemas: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tarjetaTema: {
      width: '31%',
      backgroundColor: colors.tarjeta,
      borderRadius: 10,
      padding: 10,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
    },
    filaSwatches: { flexDirection: 'row', gap: 4, marginBottom: 6 },
    swatch: { width: 16, height: 16, borderRadius: 8 },
    nombreTema: { fontSize: 11, fontWeight: '600', color: colors.texto, textAlign: 'center' },
    checkTema: { fontSize: 10, color: colors.primario, fontWeight: '700', marginTop: 2 },
    filaHoras: { flexDirection: 'row', marginTop: 4 },
    filaSwitch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    input: { borderWidth: 1, borderColor: colors.borde, borderRadius: 8, padding: 10, color: colors.texto, backgroundColor: colors.tarjeta },
    boton: { backgroundColor: colors.primario, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12 },
    botonTexto: { color: '#fff', fontWeight: '700' },
    botonSecundario: { backgroundColor: colors.tarjeta, borderWidth: 1, borderColor: colors.peligro },
    botonSecundarioTexto: { color: colors.peligro },
  });
}
