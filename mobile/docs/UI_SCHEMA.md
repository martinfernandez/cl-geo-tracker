# PeeK App - Esquema de Interfaces UI

## Resumen General

**Nombre:** PeeK
**Tipo:** App de rastreo GPS y comunidad vecinal
**Stack:** React Native + Expo
**Navegacion:** React Navigation (Bottom Tabs + Stack)

---

## Sistema de Diseno

### Paleta de Colores

```
Primary (Electric Purple):
- main: #8B5CF6
- light: #A78BFA
- dark: #7C3AED

Secondary (Electric Blue):
- main: #06B6D4
- light: #22D3EE
- dark: #0891B2

Accent (Vibrant Green):
- main: #10B981
- light: #34D399
- dark: #059669

Tertiary (Soft Pink/Magenta):
- main: #EC4899
- light: #F472B6
- dark: #DB2777

Semantic:
- success: #22C55E
- error: #EF4444
- warning: #F59E0B
- info: #3B82F6
```

### Temas
- **Dark Mode:** Fondo #0A0A0F, glassmorphism con bordes rgba(255,255,255,0.1)
- **Light Mode:** Fondo #FFFFFF, bordes sutiles rgba(0,0,0,0.08)

### Tipografia
- Escala: xs(11), sm(13), base(15), md(17), lg(20), xl(24), 2xl(28), 3xl(34)
- Fuente del sistema

### Border Radius
- sm: 6, md: 10, lg: 14, xl: 18, 2xl: 24, 3xl: 32, full: 9999

---

## Estructura de Navegacion

### Bottom Tab Navigator (5 tabs)

```
[Mapa] [Grupos] [+] [Mensajes] [Eventos]
```

1. **Map** - Pantalla principal con mapa
2. **Groups** - Stack de grupos
3. **CreateEvent** - FAB central para crear evento
4. **Messages** - Bandeja de entrada
5. **Events** - Stack de eventos

### Stacks Anidados

**DevicesStack:**
- DevicesList
- AddDevice
- AddTaggedObject
- DeviceDetail
- DeviceQR

**EventsStack:**
- EventsList
- AddEvent
- EditEvent

**GroupsStack:**
- GroupsList
- GroupDetail
- CreateGroup
- GroupInvite

**AuthStack:**
- Login
- Register

---

## Pantallas Principales

### 1. LoginScreen

**Proposito:** Autenticacion de usuarios

**Layout:**
```
[Fondo con gradiente + orbes decorativos]
    [Logo PeeK - centrado]
    [Subtitulo: "Tu comunidad, conectada"]

    [Card glassmorphism]
        [Input Email]
        [Input Password]
        [Boton "Iniciar sesion" - gradiente primary]
    [/Card]

    [Link "No tienes cuenta? Registrate"]
```

**Componentes:**
- PeekLogo (variante large)
- TextInput x2 (email, password)
- LinearGradient (fondo y boton)
- BlurView (card)

**Estados:**
- loading: ActivityIndicator en boton
- error: Toast con mensaje

---

### 2. MapScreen

**Proposito:** Vista principal del mapa con dispositivos, eventos y areas

**Layout:**
```
[MapView - fullscreen]
    [Markers: dispositivos, eventos, miembros de grupo]
    [Circles: area de interes, area seleccionada]
    [Polylines: rutas de eventos tracked]

[Overlay superior izquierda]
    [Logo PeeK / GroupModeChip]

[Overlay superior derecha]
    [Menu hamburguesa]

[Overlay inferior izquierda]
    [PeekModeBanner - toggle modo peek]

[Overlay inferior derecha]
    [Boton centrar ubicacion]
    [Boton toggle rutas]

[SlidingEventFeed - bottom sheet deslizable]
    [Lista de eventos con cards]
```

**Componentes:**
- MapView (react-native-maps)
- Marker, Circle, Polyline
- PeekLogo
- GroupModeChip
- GroupMembersModal
- PeekModeBanner
- SlidingEventFeed
- EventFilterModal
- PulsingMarker (animado para eventos urgentes)

**Menu Modal (Bottom Sheet):**
```
[Handle bar]
[Header usuario con avatar]
[Divider]
[Menu Items:]
    - Mis Areas de Interes (con badge)
    - Buscar Areas
    - Notificaciones
    ---
    - Mis Dispositivos
    - Agregar Dispositivo
[Boton Cancelar]
```

---

### 3. DevicesScreen

**Proposito:** Gestion de dispositivos GPS y objetos etiquetados

**Layout:**
```
[Header]
    [Back] [Titulo: "Dispositivos"] [Spacer]

[Content - FlatList]
    [Card: Objetos Encontrados]
        [Icon naranja] [Info] [Chevron]

    [Section: Dispositivos GPS]
        [Header + Boton Add]
        [DeviceCard x N]
            [StatusIndicator pulsante]
            [Info: nombre, IMEI, estado, velocidad]
            [Chevron]
        [Empty state si vacio]

    [Section: Objetos Etiquetados]
        [Header + Boton Add]
        [TaggedObjectCard x N]
            [Icon tag] [Info] [QR badge]
        [Empty state si vacio]
```

**Componentes:**
- StatusIndicator (animado con pulso)
- DeviceCard
- TaggedObjectCard
- SectionHeader

---

### 4. GroupsScreen

**Proposito:** Gestion de grupos y invitaciones

**Layout:**
```
[Background: ObjectsPatternBackground]

[Header]
    [Titulo: "Grupos"] [Boton Add]

[Tabs]
    [Mis Grupos] [Invitaciones (con badge)]

[Tab: Mis Grupos - FlatList]
    [GroupCard]
        [Icon grupo] [Info: nombre, descripcion, miembros]
        [Badge Admin]
        [Badge "Compartiendo" si location sharing]
        [Boton "Ver en Mapa"]
    [Empty state]

[Tab: Invitaciones - FlatList]
    [InvitationCard]
        [Info grupo + quien invito]
        [Botones: Rechazar | Aceptar]
    [Empty state]
```

**Componentes:**
- ObjectsPatternBackground (SVG decorativo)
- Tab selector
- GroupCard
- InvitationCard
- Badge (Admin, invitaciones)

---

### 5. InboxScreen (Mensajes)

**Proposito:** Bandeja de mensajes y chats de objetos encontrados

**Layout:**
```
[Background: ObjectsPatternBackground]

[Header]
    [Back] [Titulo + subtitulo conteo] [Spacer]

[Tabs]
    [Mensajes (con badge)] [Objetos (con badge naranja)]

[Search Bar]
    [Icon buscar] [Input] [Clear button]

[Lista - FlatList]
    [SwipeableConversation] (swipe para eliminar)
        [Avatar con inicial/icon]
        [Badge evento (tipo)]
        [Info: nombre, ultimo mensaje, tiempo]
        [UnreadBadge si hay]

    [Empty state animado]
```

**Componentes:**
- SwipeableConversation (react-native-gesture-handler)
- UnreadBadge
- AnimatedEmptyIllustration (SVG + animaciones)
- Search bar con estados

---

### 6. EventsScreen

**Proposito:** Lista de eventos del usuario

**Layout:**
```
[Background: ObjectsPatternBackground]

[Header]
    [Titulo: "Mis Eventos"]
    [Subtitulo: "N eventos registrados"]

[Filter Tabs - horizontal]
    [Todos (N)] [Activos (N)] [Cerrados (N)]

[Lista - FlatList]
    [EventCard]
        [Image (opcional, full width)]
        [Time badge sobre imagen]
        [Content]
            [Badges: Tipo (coloreado) + Estado]
            [Descripcion (2 lineas)]
            [Device info]
        [Interaction Bar]
            [Left: Heart + count, Comment + count, Share]
            [Right: Edit, Close/Reopen button]

    [Empty state animado]
```

**Tipos de Evento (con colores):**
- THEFT (Robo): #FF3B30
- LOST (Extravio): #FF9500
- ACCIDENT (Accidente): #F59E0B
- FIRE (Incendio): #FF2D55
- GENERAL: #007AFF

---

### 7. AddEventScreen

**Proposito:** Crear nuevo evento (flujo de 2 pasos)

**Layout Step 0 - Detalles:**
```
[Header]
    [Close X] [Titulo: "Nuevo Evento"] [Step dots]

[Scroll Content]
    [Section: Tipo de evento]
        [Chips selectables: General, Robo, Extravio, Accidente, Incendio]

    [Section: Descripcion]
        [TextArea con contador 0/500]

    [Section: Foto (opcional)]
        [Botones: Camara | Galeria]
        [Preview con boton remove si hay imagen]

    [Section: Vincular dispositivo (si hay)]
        [Chips horizontales]

    [Section: Publicar en (si admin de grupos)]
        [Chips: Publico | Grupos...]

[Bottom Action]
    [Boton "Continuar" - disabled si no hay descripcion]
```

**Layout Step 1 - Ubicacion:**
```
[Back button]

[Location Card]
    [Titulo: "Ubicacion del evento"]
    [Estado: Loading | Success | Error]
    [Coordenadas si success]
    [Boton "Cambiar ubicacion"]

[Summary Card]
    [Badge tipo]
    [Descripcion preview]
    [Badge imagen si hay]

[Bottom Action]
    [Boton "Publicar evento" - verde]
```

---

### 8. ChatScreen

**Proposito:** Chat 1-a-1 o grupal

**Layout:**
```
[Background: ObjectsPatternBackground]

[Header]
    [Back] [Avatar + nombre/grupo + subtitulo] [Spacer]

[Messages List - FlatList]
    [MessageBubble]
        [Contenido]
        [Timestamp]
        [Sender name si grupo]
    [Empty state]

[TypingIndicator]

[ChatInput]
    [TextInput multilinea]
    [Send button]
```

**Componentes:**
- MessageBubble (own vs other, colores diferentes)
- ChatInput
- TypingIndicator (3 puntos animados)

---

### 9. SettingsScreen

**Proposito:** Perfil y configuracion del usuario

**Layout:**
```
[Header]
    [Back] [Titulo: "Perfil"] [Spacer]

[Profile Header]
    [Avatar grande con inicial]
    [Edit camera button]
    [Nombre]
    [Email]

[Section: Cuenta]
    [MenuItem: Editar perfil]
    [MenuItem: Area de interes]

[Section: Privacidad]
    [SwitchItem: Mostrar mi nombre]
    [SwitchItem: Mostrar mi email]
    [SwitchItem: Eventos publicos]

[Section: Apariencia]
    [MenuItem: Seguir sistema (checkmark)]
    [MenuItem: Modo claro]
    [MenuItem: Modo oscuro]

[Section: General]
    [MenuItem: Notificaciones]
    [MenuItem: Ayuda]
    [MenuItem: Acerca de]

[Section: Tutoriales]
    [Banner promocional si hay no vistos]
    [MenuItem x4: tutoriales con badge "Nuevo"]

[Logout Button - rojo]

[Version text]
```

**Componentes:**
- MenuItem (icon + title + subtitle + chevron)
- SwitchItem (MenuItem con Switch)
- AreaOfInterestPicker (modal con mapa)

---

## Componentes Reutilizables

### Headers
- **ScreenHeader:** Back + Title + Right action

### Cards
- **DeviceCard:** Status indicator + info
- **EventCard:** Image + badges + description + actions
- **GroupCard:** Icon + info + "Ver en Mapa"
- **ConversationCard:** Avatar + info + time + unread badge

### Inputs
- **TextInput:** Styled con bordes glass
- **ChatInput:** Multilinea + send button
- **SearchBar:** Icon + input + clear

### Badges
- **TypeBadge:** Coloreado segun tipo de evento
- **StatusBadge:** En progreso / Cerrado
- **UnreadBadge:** Contador circular
- **AdminBadge:** Azul con texto "Admin"

### Buttons
- **PrimaryButton:** Gradiente primary
- **SecondaryButton:** Outline
- **FAB:** Floating Action Button central
- **IconButton:** Solo icono

### Modals
- **BottomSheet:** Modal desde abajo con handle
- **EventFilterModal:** Filtros de eventos
- **GroupMembersModal:** Lista de miembros
- **MapLocationPicker:** Selector de ubicacion en mapa
- **AreaOfInterestPicker:** Config de area

### Indicators
- **StatusIndicator:** Punto pulsante (verde/rojo)
- **PulsingMarker:** Marker animado para eventos urgentes
- **TypingIndicator:** 3 puntos animados
- **ActivityIndicator:** Loading spinner

### Backgrounds
- **ObjectsPatternBackground:** SVG pattern decorativo
- **LinearGradient:** Fondos degradados

### Feedback
- **Toast:** Notificacion temporal (success/error/warning)
- **MessageNotification:** Banner de nuevo mensaje

---

## Patrones de Interaccion

### Navegacion
- Tab bar inferior con 5 items
- FAB central para accion principal (crear evento)
- Back button en headers para volver
- Bottom sheets para menus y opciones

### Gestos
- Pull to refresh en listas
- Swipe to delete en conversaciones
- Tap on markers para callouts
- Slide up/down en event feed

### Feedback
- Haptic feedback en acciones importantes
- Toast notifications
- Loading states con ActivityIndicator
- Empty states con ilustraciones animadas

### Temas
- Soporte dark/light mode
- Colores semanticos consistentes
- Glassmorphism en dark mode
- Transiciones suaves entre temas

---

## Iconografia

**Libreria:** @expo/vector-icons (Ionicons)

**Iconos principales:**
- map / map-outline
- people / people-outline
- add
- chatbubble / chatbubble-outline
- alert-circle / alert-circle-outline
- hardware-chip / hardware-chip-outline
- location / location-outline
- settings / settings-outline
- heart / heart-outline
- send
- camera
- image
- search
- close
- chevron-forward / chevron-back
- menu
- pricetag
- qr-code

---

## Animaciones

### Transiciones
- Slide horizontal entre steps (AddEventScreen)
- Fade in/out para modals
- Spring animations para el event feed

### Loops
- Pulse animation en StatusIndicator
- Float animation en empty states
- Pulse en PulsingMarker

### Gestures
- Swipeable con scale en delete button
- Smooth scrolling en listas

---

## Estados Vacios

Todas las listas incluyen empty states con:
- Ilustracion SVG animada (float + pulse)
- Titulo descriptivo
- Mensaje explicativo
- CTA opcional (boton de accion)

---

## Consideraciones de Accesibilidad

- Contraste adecuado en ambos temas
- Tamanos de touch targets minimo 44x44
- Labels en inputs
- Estados de focus visibles
- Soporte para VoiceOver (pendiente)
