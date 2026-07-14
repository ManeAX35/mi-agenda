import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './widget-task-handler';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Registra el manejador que renderiza y actualiza los widgets de pantalla de inicio
// (Agenda de hoy, Tareas de hoy) cada vez que Android los agrega, actualiza, o los tocas.
registerWidgetTaskHandler(widgetTaskHandler);
