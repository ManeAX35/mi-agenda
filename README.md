# Mi Agenda

App de agenda personal para Android hecha con **Expo (React Native) + TypeScript**.
Todos los datos se guardan **localmente en el teléfono** con SQLite (`expo-sqlite`), sin nube ni cuenta.

## Funciones incluidas (Fase 1)

- **Actividades recurrentes** (clases, trabajo, etc.): crear, editar, eliminar, con día de la semana, horario y color. Pestaña "Recurrentes".
- **Pendientes con fecha límite y recordatorios** (pagos, juntas, entregas): notificación local programada X tiempo antes de vencer. Pestaña "Pendientes".
- **Tareas del día a día** (sin fecha límite): checklist simple que vive en la pestaña "Hoy".
- **Diario de actividades**: cuadro de texto libre por día, en la misma pestaña "Hoy", para ir registrando qué hiciste.
- **Vista de Agenda**: semanal (todas tus actividades recurrentes por día) y mensual (calendario con los días que tienen pendientes marcados).

## Cómo correrla en tu teléfono AHORA (modo desarrollo)

Requisitos: Node.js y Android Studio (ya los tienes, igual que en `finanzas-app`).

```bash
npm install
```

Con el emulador de Android Studio abierto, o tu teléfono conectado por USB con depuración habilitada:

```bash
npx expo start --android
```

## Cómo generar el APK instalable (build local, sin cuenta de Expo)

Esto genera las carpetas nativas `android/` e `ios/` y compila el APK con Gradle, usando tu Android Studio local — no requiere internet a servidores de Expo ni cuenta EAS.

```bash
npx expo prebuild --platform android
```

```bash
cd android && ./gradlew assembleRelease
```

El APK queda en:

```
android/app/build/outputs/apk/release/app-release.apk
```

Cópialo a tu teléfono (por USB, Drive, WhatsApp, etc.) e instálalo directamente. Si Android bloquea la instalación, habilita "Instalar apps desconocidas" para la app que uses para abrir el archivo.

> Nota: `app-release.apk` sale sin firmar con una key de Play Store (usa la debug key de Android). Para uso personal, sin publicarla en Play Store, esto es suficiente e instala sin problema.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Primera versión: agenda, pendientes, recurrentes, diario"
git branch -M main
git remote add origin https://github.com/ManeAX35/mi-agenda.git
git push -u origin main
```

(`node_modules/`, `android/`, `ios/` y `.expo/` ya están en `.gitignore`, así el repo queda ligero — cualquiera que lo clone corre `npm install` y `npx expo prebuild` para regenerarlos.)

## Estructura del proyecto

```
src/
  db/            -> SQLite: schema + repositorios (CRUD) por entidad
  screens/       -> Las 4 pantallas (Hoy, Agenda, Recurrentes, Pendientes)
  types/         -> Tipos TypeScript compartidos
  utils/         -> notifications.ts (recordatorios locales), theme.ts (colores)
App.tsx          -> Navegación por pestañas
```

## Pendiente para Fase 2: Widget de pantalla de inicio

**¡Ya implementado!** Ver sección "Widgets" abajo.

## Widgets de pantalla de inicio

Hay 2 widgets listos:

- **Agenda de hoy**: solo lectura, muestra tus actividades recurrentes y pendientes de hoy ordenados por hora. Tocarlo abre la app.
- **Tareas de hoy**: checkboxes tocables para marcar tareas como hechas directo desde el widget, sin abrir la app. El botón "+" abre la app para agregar una tarea nueva (los widgets de Android no permiten escribir texto, por eso ese paso sí necesita la app).

Para probarlos, después de `npx expo prebuild --platform android` y compilar el APK (con Gradle o con EAS), instala la app, mantén presionado en tu pantalla de inicio → Widgets → busca "Mi Agenda" → arrastra "Agenda de hoy" o "Tareas de hoy".

Si haces cambios a los widgets (`src/widgets/*.tsx` o `widget-task-handler.tsx`), vuelve a compilar el APK para verlos reflejados — no se actualizan solo con `expo start`.

## Recordatorios configurables

Al crear o editar una actividad recurrente o un pendiente, puedes elegir uno o varios recordatorios: 15 min, 30 min, 1 hora, 2 horas, 1 día o 2 días antes. Por default vienen marcados "1 hora" y "30 min", pero puedes agregar o quitar los que quieras.

## Próximas ideas (no incluidas todavía)

- Editar/eliminar entradas de diario pasadas (por ahora solo edita la de hoy).
- Exportar/respaldar la base de datos a un archivo.
- Repetir actividades recurrentes con excepciones (ej. "esta semana no hay clase").
