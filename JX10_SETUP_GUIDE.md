# Guía de Configuración del Dispositivo JX10

Esta guía te ayudará a configurar tu dispositivo GPS JX10 para que envíe datos al servidor de tracking.

## 📋 Requisitos Previos

1. Dispositivo JX10 con SIM card activada y con saldo/plan de datos
2. Número de teléfono del SIM card instalado en el JX10
3. Servidor backend funcionando y accesible desde internet

## 🔧 Configuración Básica

### Paso 1: Obtener el IMEI del Dispositivo

Envía el siguiente comando SMS al número del JX10:

```
IMEI#
```

Recibirás una respuesta con el IMEI del dispositivo (15 dígitos). **Guarda este número**, lo necesitarás para registrar el dispositivo en la app.

### Paso 2: Configurar el Servidor

Debes configurar el dispositivo para que envíe datos a tu servidor. Envía el siguiente comando SMS:

```
SERVER#1#TU_SERVIDOR#8841#0#
```

**Reemplaza `TU_SERVIDOR` con:**
- **Para desarrollo local:** Usa tu IP pública o un servicio como ngrok
- **Para producción:** Usa tu dominio o IP del servidor

**Ejemplo para desarrollo:**
```
SERVER#1#192.168.1.100#8841#0#
```

**Ejemplo para producción:**
```
SERVER#1#tracker.midominio.com#8841#0#
```

**Parámetros:**
- `1`: Número de servidor (1-5)
- `TU_SERVIDOR`: IP o dominio del servidor
- `8841`: Puerto TCP (configurado en tu backend)
- `0`: Sin contraseña

### Paso 3: Configurar APN de Internet

El JX10 necesita acceso a internet móvil. Configura el APN de tu operador:

```
APN#NOMBRE_APN#USUARIO#PASSWORD#
```

**Ejemplos por operador en Argentina:**

**Movistar:**
```
APN#internet.movil#WAP@WAP#WAP#
```

**Claro:**
```
APN#igprs.claro.com.ar####
```

**Personal:**
```
APN#datos.personal.com####
```

**Tuenti:**
```
APN#tuenti.com.ar####
```

### Paso 4: Configurar Intervalo de Reporte

Define cada cuánto tiempo el dispositivo enviará su ubicación:

```
TIMER#intervalo#
```

**Valores recomendados:**
- `30`: Cada 30 segundos (alto consumo de batería, precisión máxima)
- `60`: Cada 1 minuto (recomendado para seguimiento en tiempo real)
- `300`: Cada 5 minutos (balance entre batería y precisión)
- `600`: Cada 10 minutos (ahorro de batería)

**Ejemplo para reporte cada minuto:**
```
TIMER#60#
```

### Paso 5: Activar Modo de Seguimiento

Activa el modo de envío continuo de posiciones:

```
GPRSON#
```

Para desactivar:
```
GPRSOFF#
```

## 📱 Registrar el Dispositivo en la App

1. Abre la app GPS Tracker
2. Ve a la pestaña "Dispositivos"
3. Toca el botón "+" (Agregar Dispositivo)
4. Ingresa el **IMEI** obtenido en el Paso 1
5. Opcionalmente, asigna un nombre descriptivo (ej: "Mi Auto")
6. Toca "Agregar Dispositivo"

## ✅ Verificación

### Verificar Configuración

Envía este comando para ver la configuración actual:

```
PARAM#
```

Recibirás un SMS con todos los parámetros configurados.

### Verificar Conexión al Servidor

1. Verifica que el dispositivo tenga señal GPS (puede tardar 1-2 minutos al aire libre)
2. Revisa los logs del servidor backend:
   ```bash
   cd backend
   npm run dev
   ```
3. Deberías ver mensajes como:
   ```
   Device connected: xxx.xxx.xxx.xxx
   Position saved for device IMEI: {...}
   ```

### Verificar en la App

1. Abre la app GPS Tracker
2. Ve a "Dispositivos" - deberías ver tu dispositivo con estado "Activo"
3. Ve al "Mapa" - deberías ver un marcador con la ubicación del dispositivo

## 🔧 Comandos Adicionales Útiles

### Reiniciar el Dispositivo
```
RESET#
```

### Obtener Ubicación Actual (una sola vez)
```
WHERE#
```

### Configurar Zona Horaria
```
GMT#E#3#
```
- Para Argentina/Uruguay: `GMT#W#3#` (UTC-3)
- Para Chile: `GMT#W#4#` (UTC-4)

### Habilitar Modo Ahorro de Energía
```
SLEEP#ON#
```

### Deshabilitar Modo Ahorro
```
SLEEP#OFF#
```

### Configurar Contraseña (Opcional)
Por defecto la contraseña es `123456`. Para cambiarla:
```
PASSWORD#contraseña_actual#contraseña_nueva#
```

Ejemplo:
```
PASSWORD#123456#mipassword#
```

Si configuras contraseña, recuerda agregarla a todos los comandos:
```
PASSWORD,mipassword,COMANDO#
```

## 🚨 Solución de Problemas

### El dispositivo no se conecta al servidor

1. **Verifica la cobertura de datos móviles:**
   - Envía `WHERE#` y verifica que recibas respuesta con coordenadas

2. **Verifica la configuración del APN:**
   - Envía `PARAM#` y confirma que el APN esté configurado correctamente

3. **Verifica que el servidor sea accesible:**
   - El puerto 8841 debe estar abierto en tu firewall
   - Si usas desarrollo local, asegúrate de usar tu IP pública o ngrok

4. **Reinicia el dispositivo:**
   ```
   RESET#
   ```

### El dispositivo no obtiene señal GPS

1. **Coloca el dispositivo al aire libre** durante 2-3 minutos
2. Verifica que la antena GPS esté conectada correctamente
3. Envía `WHERE#` para forzar una lectura GPS

### Los datos no aparecen en la app

1. **Verifica que el dispositivo esté registrado:**
   - El IMEI en la app debe coincidir exactamente con el del dispositivo

2. **Revisa los logs del backend:**
   ```bash
   cd backend
   npm run dev
   ```
   Busca errores o mensajes de conexión

3. **Verifica la base de datos:**
   - Asegúrate de que el backend esté conectado a PostgreSQL
   - Puerto 5433 debe estar accesible

### Consumo alto de batería

1. **Aumenta el intervalo de reporte:**
   ```
   TIMER#300#
   ```

2. **Activa el modo ahorro:**
   ```
   SLEEP#ON#
   ```

## 📊 Recomendaciones de Uso

### Para vehículos en movimiento constante:
- Intervalo: 60 segundos
- Modo sleep: OFF
- Conexión: Alimentación del vehículo

### Para rastreo esporádico:
- Intervalo: 300-600 segundos
- Modo sleep: ON
- Batería interna

### Para seguridad/antirrobo:
- Intervalo: 30-60 segundos
- Modo sleep: OFF
- Batería de respaldo + alimentación vehículo

## 🔐 Seguridad

1. **Cambia la contraseña por defecto** si el dispositivo está en un lugar accesible
2. **Usa HTTPS** en producción para el servidor backend
3. **Mantén el IMEI privado** - es el identificador único del dispositivo

## 📞 Soporte

Si necesitas ayuda adicional:
- Revisa los logs del backend en `/backend/logs`
- Verifica la documentación del fabricante del JX10
- Contacta al proveedor del dispositivo

## 🌐 Configuración del Servidor

### Desarrollo Local con ngrok

Si estás desarrollando localmente, usa ngrok para exponer tu servidor:

```bash
# Instala ngrok
brew install ngrok  # macOS
# o descarga desde https://ngrok.com

# Expone el puerto 8841
ngrok tcp 8841
```

Usa la URL de ngrok en el comando SERVER:
```
SERVER#1#X.tcp.ngrok.io#XXXXX#0#
```

### Firewall en Producción

Asegúrate de abrir el puerto TCP 8841:

**Ubuntu/Debian:**
```bash
sudo ufw allow 8841/tcp
sudo ufw reload
```

**CentOS/RHEL:**
```bash
sudo firewall-cmd --permanent --add-port=8841/tcp
sudo firewall-cmd --reload
```

## 📝 Resumen de Comandos Rápidos

```
# Obtener IMEI
IMEI#

# Configurar servidor
SERVER#1#TU_SERVIDOR#8841#0#

# Configurar APN (ejemplo Movistar)
APN#internet.movil#WAP@WAP#WAP#

# Intervalo de reporte (1 minuto)
TIMER#60#

# Activar GPS
GPRSON#

# Verificar configuración
PARAM#

# Ubicación actual
WHERE#
```

¡Tu dispositivo JX10 ya está listo para rastrear! 🎉
