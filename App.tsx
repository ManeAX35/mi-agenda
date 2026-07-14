import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import AgendaScreen from './src/screens/AgendaScreen';
import ActividadesScreen from './src/screens/ActividadesScreen';
import PendientesScreen from './src/screens/PendientesScreen';
import DiarioScreen from './src/screens/DiarioScreen';
import AjustesScreen from './src/screens/AjustesScreen';
import { pedirPermisos } from './src/utils/notifications';
import { reprogramarResumenMatutino } from './src/utils/resumenMatutino';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Tab = createBottomTabNavigator();

const ICONOS: Record<string, string> = {
  Agenda: '📅',
  Recurrentes: '🔁',
  Pendientes: '⏰',
  Diario: '📔',
  Ajustes: '⚙️',
};

// Mapa de deep links: "miagenda://agenda" abre directo la pestaña Agenda, etc.
// Lo usan los widgets (Agenda de hoy → Agenda, Tareas de hoy → Diario) para abrir
// la app justo donde corresponde en vez de donde se haya quedado la última vez.
const linking: LinkingOptions<any> = {
  prefixes: ['miagenda://'],
  config: {
    screens: {
      Agenda: 'agenda',
      Recurrentes: 'recurrentes',
      Pendientes: 'pendientes',
      Diario: 'diario',
      Ajustes: 'ajustes',
    },
  },
};

function AppInner() {
  const { colors, esOscuro } = useTheme();

  useEffect(() => {
    pedirPermisos();
    // Al abrir la app, se refresca el resumen matutino de mañana con los datos más
    // recientes (ver utils/notifications.ts para el porqué de este enfoque).
    reprogramarResumenMatutino();
  }, []);

  const temaNavegacion = esOscuro
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.fondo, card: colors.tarjeta, text: colors.texto, primary: colors.primario } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.fondo, card: colors.tarjeta, text: colors.texto, primary: colors.primario } };

  return (
    <NavigationContainer linking={linking} theme={temaNavegacion}>
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: colors.primario },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          tabBarActiveTintColor: colors.primario,
          tabBarInactiveTintColor: colors.textoSecundario,
          tabBarStyle: { backgroundColor: colors.tarjeta, borderTopColor: colors.borde },
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONOS[route.name]}</Text>,
        })}
      >
        <Tab.Screen name="Agenda" component={AgendaScreen} options={{ title: 'Agenda' }} />
        <Tab.Screen name="Recurrentes" component={ActividadesScreen} options={{ title: 'Actividades' }} />
        <Tab.Screen name="Pendientes" component={PendientesScreen} options={{ title: 'Pendientes' }} />
        <Tab.Screen name="Diario" component={DiarioScreen} options={{ title: 'Diario' }} />
        <Tab.Screen name="Ajustes" component={AjustesScreen} options={{ title: 'Ajustes' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
