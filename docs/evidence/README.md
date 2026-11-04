# Registro Consolidado de Evidencias — UNA Chat

**Institución:** Universidad Nacional de Costa Rica (UNA)
**Sede:** Regional Chorotega — Campus Nicoya
**Carrera:** Ingeniería en Sistemas de la Información
**Curso:** Paradigmas de Programación
**Profesor:** Ing. Alex Villegas Carranza, M.Sc.
**Estudiante:** Andrey Tijerino Hernández
**Entregas:** Laboratorios 5 y 6 (Seguridad, Testing, Harness, Memoria y Autenticación Social)

---

## 1. Índice General de Evidencias

A continuación se presenta la tabla integral de evidencias de aseguramiento de calidad, remediación de seguridad, pruebas automatizadas, memoria y despliegue en producción para ambos laboratorios:

### Evidencias del Laboratorio 5 (Seguridad y Testing)

| # | Evidencia | Descripción Técnica | Archivo en Repositorio | Estado |
|:---:|---|---|---|:---:|
| 1 | **Evidencia 1 (XSS)** | Reproducción de inyección de scripts JavaScript en la aplicación original (`antes/`). | [evidencia1.png](evidencia1.png) | **COMPLETADA** |
| 2 | **Evidencia 2 (Unit)** | Ejecución exitosa de la suite de pruebas unitarias sobre `unalib.js` con Mocha (41 pruebas). | [evidencia-2.png](evidencia-2.png) | **COMPLETADA** |
| 3 | **Evidencia 3 (Integration)** | Pruebas de integración sobre Socket.IO con servidor real en puerto efímero (8 pruebas). | [evidencia-3.png](evidencia-3.png) | **COMPLETADA** |
| 4 | **Evidencia 4 (E2E)** | Pruebas End-to-End con Playwright en Chromium automatizando flujos de usuario (5 pruebas). | [evidencia-4.png](evidencia-4.png) | **COMPLETADA** |
| 5 | **Evidencia 5 (Chat Seguro)** | Chat en ejecución con video de YouTube embebido de forma segura y payloads XSS neutralizados. | [evidencia-5.png](evidencia-5.png) | **COMPLETADA** |
| 6 | **Evidencia Snyk** | Auditoría de Software Composition Analysis (SCA) con Snyk demostrando 0 vulnerabilidades en 82 dependencias. | [evidencia-snyk.png](evidencia-snyk.png) | **COMPLETADA** |

### Evidencias del Laboratorio 6 (Memoria, Harness y US-01 Auth0)

| # | Evidencia | Descripción Técnica | Archivo en Repositorio | Estado |
|:---:|---|---|---|:---:|
| 7 | **Evidencia 6 (Auth0 Dashboard)** | Configuración en Auth0 de Allowed Callback URLs, Allowed Logout URLs y Allowed Web Origins para Vercel Production. | [evidencia-6.png](evidencia-6.png) | **COMPLETADA** |
| 8 | **Evidencia 7 (Vercel Production)** | Deployment en Vercel (`lab5-paradigmas-ten.vercel.app`) en estado **Ready** en Production tras fusionar el PR #17. | [evidencia-7.png](evidencia-7.png) | **COMPLETADA** |
| 9 | **Evidencia US-01-A (OAuth Consent)** | Pantalla de consentimiento y autorización de la aplicación UNA Chat en Auth0 ("Authorize App"). | [us-01-auth0/01-consentimiento-auth0-redactada.png](us-01-auth0/01-consentimiento-auth0-redactada.png) | **COMPLETADA** |
| 10 | **Evidencia US-01-B (Chat Autenticado)** | Interfaz de UNA Chat mostrando la identidad autenticada asignada desde el servidor y opción de cerrar sesión. | [us-01-auth0/02-chat-autenticado-redactada.png](us-01-auth0/02-chat-autenticado-redactada.png) | **COMPLETADA** |
| 11 | **Evidencia US-01-C (Mensajería Segura)** | Mensajes enviados en la sala de chat con identidad verificada ("Con esto damos por completado el laboratorio #6"). | [us-01-auth0/03-chat-mensajes-redactada.png](us-01-auth0/03-chat-mensajes-redactada.png) | **COMPLETADA** |

---

## 2. Detalle y Reproducción de las Evidencias del Laboratorio 5

### 2.1. Evidencia 1 — Vulnerabilidad Cross-Site Scripting (XSS)
- **Archivo:** [evidencia1.png](evidencia1.png)
- **Descripción:** Demuestra la existencia de la vulnerabilidad crítica CWE-79 en la versión original `antes/`. Al enviar el mensaje `<script>alert('Inyección de script');</script>`, el cliente original utilizaba `$('#messages').append($('<li>').html(mensajeDisplay))`, provocando la ejecución no controlada del script en el contexto de la ventana del navegador.
- **Reproducción:**
  ```powershell
  cd antes
  npm start
  ```
  Abrir `http://localhost:3000`, ingresar el payload en el campo de texto y observar la alerta JavaScript modal.

### 2.2. Evidencia 2 — Pruebas Unitarias de Validación y Seguridad
- **Archivo:** [evidencia-2.png](evidencia-2.png)
- **Descripción:** Captura de consola ejecutando `npm run test:unit` sobre `despues/libs/unalib.js`.
- **Métricas:** 41 pruebas ejecutadas, **41 aprobadas (100%)**, 0 fallidas en 41ms.
- **Cobertura:**
  1. Validación y saneamiento de números de teléfono (`is_valid_phone`).
  2. Validación estricta de extensiones de imagen (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`) y rechazo de esquemas maliciosos (`javascript:`, `data:`).
  3. Detección segura de URLs de YouTube estándar, cortas y embebidas (`youtu.be`, `/watch?v=`, `/embed/`).
  4. Extracción segura del ID de 11 caracteres de videos.
  5. Manejo robusto de payloads no-JSON, nulos o de tipos inesperados sin caídas de proceso.
  6. Saneamiento estricto contra inyección de HTML y atributos peligrosos (`onerror`, `onload`).

### 2.3. Evidencia 3 — Pruebas de Integración con Socket.IO
- **Archivo:** [evidencia-3.png](evidencia-3.png)
- **Descripción:** Captura de consola ejecutando `npm run test:integration` sobre `despues/test/integration/chat.integration.test.js`.
- **Métricas:** 8 pruebas ejecutadas, **8 aprobadas (100%)**, 0 fallidas en 212ms.
- **Cobertura:**
  - Comunicación bidireccional sobre `'Evento-Mensaje-Server'`.
  - Retransmisión segura de texto validado y objetos multimedia.
  - Neutralización en tiempo real de scripts maliciosos y atributos de eventos.
  - Retransmisión limpia entre múltiples sockets concurrentes.

### 2.4. Evidencia 4 — Pruebas End-to-End con Playwright
- **Archivo:** [evidencia-4.png](evidencia-4.png)
- **Descripción:** Captura de consola ejecutando `npm run test:e2e` con Playwright sobre Chromium (`despues/test/e2e/chat.spec.js`).
- **Métricas:** 5 pruebas ejecutadas en 1 worker, **5 aprobadas (100%)**, 0 fallidas en 12.0s.
- **Cobertura:**
  - Interacción real con el DOM del navegador.
  - Envío y recepción visual de mensajes.
  - Renderizado de imagen real con verificación de carga (`sample.png`).
  - Renderizado de reproductor de video de YouTube mediante iframe seguro.
  - Verificación en navegador real de la neutralización de XSS sin ejecución de scripts.

### 2.5. Evidencia 5 — Chat Seguro en Ejecución
- **Archivo:** [evidencia-5.png](evidencia-5.png)
- **Descripción:** Captura de la interfaz de usuario en `http://localhost:3000` mostrando una sesión interactiva:
  - Video de YouTube embebido y reproduciéndose correctamente.
  - Mensajes de prueba con payloads `<script>` e `<img onerror=...>` renderizados como texto escapado inofensivo en la lista de mensajes.

### 2.6. Evidencia Snyk — Auditoría de Vulnerabilidades de Dependencias
- **Archivo:** [evidencia-snyk.png](evidencia-snyk.png)
- **Descripción:** Resultado del escaneo SCA mediante `npx snyk test` sobre `despues/package-lock.json`.
- **Métricas:** 82 dependencias analizadas, **0 vulnerabilidades encontradas**, 0 rutas vulnerables.

---

## 3. Detalle y Reproducción de las Evidencias del Laboratorio 6 (Memoria, Harness y US-01)

### 3.1. Evidencia 6 — Configuración en Auth0 Dashboard
- **Archivo:** [evidencia-6.png](evidencia-6.png)
- **Descripción:** Muestra la configuración de la Regular Web Application "UNA Chat" en el tenant de Auth0 (`dev-0cns5htp3msxjw75`):
  - **Allowed Callback URLs:** `https://lab5-paradigmas-ten.vercel.app/callback`
  - **Allowed Logout URLs:** `https://lab5-paradigmas-ten.vercel.app`
  - **Allowed Web Origins:** `https://lab5-paradigmas-ten.vercel.app`

### 3.2. Evidencia 7 — Despliegue en Vercel Production
- **Archivo:** [evidencia-7.png](evidencia-7.png)
- **Descripción:** Muestra la consola de Vercel del proyecto `lab5-paradigmas`:
  - **Estado:** Ready (Latest)
  - **Entorno:** Production (Current)
  - **Dominio:** `lab5-paradigmas-ten.vercel.app`
  - **Origen:** Rama `main`, commit `92dd8d7` (Merge del Pull Request #17).
  - **Vista previa:** Pantalla de bienvenida oficial de UNA Chat con el botón para autenticación OAuth con Auth0.

### 3.3. Evidencias Redactadas de US-01 (Privacidad Protegida)
En cumplimiento con las buenas prácticas de protección de datos personales, los datos de identidad (nombre completo y dirección de correo electrónico del estudiante) han sido redaccionados:

1. **[01-consentimiento-auth0-redactada.png](us-01-auth0/01-consentimiento-auth0-redactada.png):**
   - Diálogo OIDC de Auth0 ("Authorize App").
   - La aplicación UNA Chat solicita acceso al perfil de usuario mediante Google.
   - Opciones para aceptar o denegar el acceso.

2. **[02-chat-autenticado-redactada.png](us-01-auth0/02-chat-autenticado-redactada.png):**
   - Interfaz principal de UNA Chat tras completar exitosamente el login con Google vía Auth0.
   - Encabezado con avatar, nombre verificado y botón "Cerrar sesión".
   - Sala de conversación inicializada bajo la directriz: *"Tu identidad se asigna desde el servidor"*.

3. **[03-chat-mensajes-redactada.png](us-01-auth0/03-chat-mensajes-redactada.png):**
   - Intercambio de mensajes en tiempo real dentro de la sala de conversación.
   - Cada mensaje lleva el nombre del usuario autenticado impuesto exclusivamente por el backend mediante la sesión validada.
   - Mensaje de prueba visible: *"Con esto damos por completado el laboratorio #6"*.

---

## 4. Métricas Globales Consolidadas de Pruebas

Tras completar la implementación del Laboratorio 5, el arnés autónomo y la historia US-01 Auth0 del Laboratorio 6, la aplicación cuenta con un arnés de **105 pruebas automatizadas**, todas pasando con éxito:

```text
Suite                             Total Pruebas    Aprobadas    Fallidas    Eficacia
-------------------------------------------------------------------------------------
Unitarias (unalib + auth-session)            54           54           0        100%
Integración (Express + Socket.IO)            40           40           0        100%
End-to-End (Playwright Chromium)             11           11           0        100%
-------------------------------------------------------------------------------------
Total Pruebas de Aplicación                 105          105           0        100%
Pruebas de Software Factory                  20           20           0        100%
-------------------------------------------------------------------------------------
Total Consolidado                           125          125           0        100%
```
