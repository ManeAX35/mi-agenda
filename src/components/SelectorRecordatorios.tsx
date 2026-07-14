import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { OPCIONES_RECORDATORIO_MINUTOS, etiquetaRecordatorio } from '../utils/notifications';
import { Paleta } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

interface Props {
  seleccionados: number[];
  onChange: (nuevos: number[]) => void;
}

export default function SelectorRecordatorios({ seleccionados, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  function alternar(minutos: number) {
    if (seleccionados.includes(minutos)) {
      onChange(seleccionados.filter((m) => m !== minutos));
    } else {
      onChange([...seleccionados, minutos].sort((a, b) => a - b));
    }
  }

  return (
    <View>
      <Text style={styles.etiqueta}>Recordatorios (elige uno o varios)</Text>
      <View style={styles.filaChips}>
        {OPCIONES_RECORDATORIO_MINUTOS.map((min) => (
          <TouchableOpacity
            key={min}
            style={[styles.chip, seleccionados.includes(min) && styles.chipActivo]}
            onPress={() => alternar(min)}
          >
            <Text style={seleccionados.includes(min) ? styles.chipTextoActivo : styles.chipTexto}>
              {etiquetaRecordatorio(min)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {seleccionados.length === 0 && (
        <Text style={styles.ayuda}>Sin recordatorios — no se te avisará antes de esto.</Text>
      )}
    </View>
  );
}

function crearEstilos(colors: Paleta) {
  return StyleSheet.create({
    etiqueta: { fontWeight: '600', color: colors.texto, marginTop: 10, marginBottom: 4 },
    filaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.fondo },
    chipActivo: { backgroundColor: colors.primario },
    chipTexto: { color: colors.texto },
    chipTextoActivo: { color: '#fff', fontWeight: '600' },
    ayuda: { color: colors.textoSecundario, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  });
}
