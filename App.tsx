import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import AgendaScreen from './src/screens/AgendaScreen';
import ActividadesScreen from './src/screens/ActividadesScreen';
import PendientesScreen from './src/screens/PendientesScreen';
import HoyScreen from './src/screens/HoyScreen';
import DiarioScreen from './src/screens/DiarioScreen';
import { pedirPermisos } from './src/utils/notifications';
import { colors } from './src/utils/theme';

const Tab = createBottomTabNavigator();

const ICONOS: Record<string, string> = {
  Hoy: '📝',
  Agenda: '📅',
  Recurrentes: '🔁',
  Pendientes: '⏰',
  Diario: '📔',
};

export default function App() {
  useEffect(() => {
    pedirPermisos();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: colors.primario },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          tabBarActiveTintColor: colors.primario,
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONOS[route.name]}</Text>,
        })}
      >
        <Tab.Screen name="Hoy" component={HoyScreen} options={{ title: 'Hoy' }} />
        <Tab.Screen name="Agenda" component={AgendaScreen} options={{ title: 'Agenda' }} />
        <Tab.Screen name="Recurrentes" component={ActividadesScreen} options={{ title: 'Actividades' }} />
        <Tab.Screen name="Pendientes" component={PendientesScreen} options={{ title: 'Pendientes' }} />
        <Tab.Screen name="Diario" component={DiarioScreen} options={{ title: 'Diario' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
