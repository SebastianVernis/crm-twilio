# CRM Básico con Integración de Twilio

Un CRM web funcional para la gestión de contactos y la comunicación a través de llamadas y SMS, integrado con la API de Twilio.

## Características

- **Roles de Usuario:** Admin (vista completa y dashboard) y Asesor (vista restringida).
- **Integración con Twilio:** Click-to-Call y envío de SMS.
- **Flujo "After Call":** Registro de notas y actualización de estado de contactos.
- **Dashboard de Administrador:** Métricas en tiempo real sobre el rendimiento.
- **Seguridad:** Autenticación, bloqueo de copiado y anti-captura de pantalla.

## Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla JS)
- **Backend:** Node.js, Express.js
- **API:** Twilio (Voz y SMS)

## Configuración

1.  **Backend:**
    - `cd backend`
    - `npm install`
    - Crea un archivo `.env` a partir de `.env.example` y añade tus credenciales de Twilio.
    - `node server.js`
2.  **Frontend:**
    - Abre `/frontend/index.html` en tu navegador.
