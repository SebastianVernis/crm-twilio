# Instrucciones de Despliegue - CRM Twilio

## Archivos Subidos
- index.html (Frontend principal)
- .htaccess (Configuración del servidor web)
- api/package.json (Dependencias del backend)
- api/server.js (Servidor backend)
- api/.env.example (Plantilla de variables de entorno)

## Configuración Requerida

### 1. Configurar Variables de Entorno
Crear un archivo `.env` en la carpeta `api/` con las siguientes variables:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_xxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+15017122661
AGENT_PHONE_NUMBER=+15551234567
PORT=3001
```

### 2. Instalar Dependencias de Node.js
En la carpeta `api/`, ejecutar:
```bash
npm install
```

### 3. Iniciar el Servidor Backend
```bash
cd api
node server.js
```

### 4. Configurar el Servidor Web
- Asegurar que el archivo .htaccess esté funcionando
- El frontend debe servirse desde la raíz del dominio
- El backend debe ejecutarse en el puerto 3001

## Credenciales de Acceso
- Admin: usuario `admin`, contraseña `admin123`
- Asesor: usuario `asesor`, contraseña `asesor123`

## URL de Acceso
https://chispart.sebastianvernis.com

## Funcionalidades
- Login con roles (Admin/Asesor)
- Dashboard de métricas (solo Admin)
- Gestión de contactos
- Integración con Twilio (SMS y llamadas)
- Flujo post-llamada
- Medidas de seguridad anti-captura

## Soporte
Para configurar las credenciales de Twilio, contactar al administrador del sistema.
