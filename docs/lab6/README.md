# Laboratorio 6 — Memoria, Harness y Autenticación Social en UNA Chat

**Institución:** Universidad Nacional de Costa Rica (UNA)
**Sede:** Regional Chorotega — Campus Nicoya
**Carrera:** Ingeniería en Sistemas de la Información
**Curso:** Paradigmas de Programación
**Profesor:** Ing. Alex Villegas Carranza, M.Sc.
**Estudiante:** Andrey Tijerino Hernández
**Valor:** 4% de la calificación total del curso
**Documento Oficial de Referencia:** `Lab8.docx` (*Memoria y harness para UNA Chat*)
**Despliegue en Producción:** [https://lab5-paradigmas-ten.vercel.app/](https://lab5-paradigmas-ten.vercel.app/)
**Pull Request Fusionado:** [#17 en GitHub](https://github.com/andreyhrndz/Lab5Paradigmas/pull/17)

---

## 1. Contexto Académico y Correspondencia de Numeración

> [!NOTE]
> El documento oficial proporcionado por la cátedra para esta práctica se titula formalmente `Lab8.docx` (*Memoria y harness para UNA Chat*). Sin embargo, dentro del programa evaluativo y la secuencia de avance del curso, esta entrega representa formalmente el **Laboratorio 6**, actuando como la continuación directa del **Laboratorio 5** (*Seguridad Informática y Testing Automatizado*).
> Para efectos de transparencia académica y trazabilidad, se conservan los nombres originales de los documentos de especificación sin alterar sus títulos internos.

El propósito central de esta práctica consiste en:
1. Preparar un espacio de trabajo colaborativo para agentes de inteligencia artificial dotado de **memoria persistente** (Second Brain).
2. Adaptar y operar un **harness de ingeniería agéntica** (Software Factory) gobernado por especificaciones ejecutables (*Spec-Driven Development*).
3. Continuar la evolución de UNA Chat mediante la implementación de la historia de usuario **US-01: Autenticación social con Auth0 + Google**.
4. Desplegar la solución asegurada en **Vercel** y verificar el ciclo completo en ambiente de producción.

---

## 2. Etapa 1 — Preparación del Espacio de Trabajo Agéntico

En concordancia con la Sección 1 de `Lab8.docx`:

### 2.1. Arquitectura de Directorios y Principio de *Progressive Disclosure*
El espacio de trabajo `my-team-workspace` fue diseñado para que agentes autónomos naveguen de forma eficiente minimizando el consumo de contexto mediante **divulgación progresiva**:

```text
my-team-workspace/
├── AGENTS.md                  # Índice y reglas globales del espacio de trabajo
├── .gitignore                 # Reglas de exclusión para aislar repositorios y datos locales
├── Repos/                     # Directorio de repositorios clonados
│   ├── AGENTS.md              # Propósito de Repos/ y directrices de navegación
│   └── UNA-Chat/
│       └── Lab5Paradigmas/    # Repositorio oficial del proyecto (git-tracked de forma autónoma)
├── Knowledge/                 # Documentación técnica durable, guías y notas de dominio
├── Skills/                    # Playbooks reutilizables para tareas especializadas
├── Machine/                   # Scripts y configuraciones específicas de la máquina local
├── brain/                     # Segundo cerebro persistente del proyecto en formato Obsidian
└── factory/                   # Software Factory agéntica con compuertas de calidad
```

### 2.2. Aislamiento de Control de Versiones en `Repos/`
El `.gitignore` del espacio de trabajo excluye el contenido de `Repos/` a excepción de su archivo descriptor:
```gitignore
# Excluir repositorios clonados conservando su propio Git
Repos/*
!Repos/AGENTS.md
```
Esto garantiza que `Repos/UNA-Chat/Lab5Paradigmas` mantenga su propio historial de Git, ramas y vínculos remotos con GitHub (`andreyhrndz/Lab5Paradigmas`) sin colisionar con el workspace general.

---

## 3. Etapa 2 — Memoria del Proyecto (Obsidian Second Brain)

En concordancia con la Sección 2 de `Lab8.docx` y las instrucciones de `obsidian-brain-instructions 1.md`:

### 3.1. Estructura de `brain/`
Se configuró un vault de Obsidian en `brain/` para almacenar memoria persistente que trasciende las sesiones de desarrollo de los agentes:

- **`brain/daily-log/YYYY-MM-DD.md`:** Bitácora diaria estructurada con marcas de tiempo en la zona horaria del propietario (`America/Costa_Rica`). Cada hito, decisión o hallazgo se registra conforme ocurre.
- **`brain/daily-log/status.md`:** Instantánea dinámica del estado de avance, foco inmediato, elementos abiertos y dependencias activas. Se reescribe al inicio y al final de cada sesión.
- **`brain/INDEX.md` y `brain/Home.md`:** Índice general estructurado con `[[wikilinks]]` bidireccionales hacia notas temáticas (`Working/Tickets and recent work.md`, `Working/How I work.md`, etc.).
- **Regla Estricta de Confidencialidad:** Prohibición absoluta de almacenar secretos, tokens o credenciales dentro de las notas de la memoria.

---

## 4. Etapa 3 — Harness y Software Factory Agéntica

En concordancia con la Sección 3 de `Lab8.docx`:

### 4.1. Gobernanza Spec-Driven Development (SDD)
El harness y la Software Factory (`factory/`) estructuran el ciclo de desarrollo agéntico mediante especificaciones formales y compuertas automáticas:

1. **Intake y Especificación (`openspec/`):** Definición rigurosa de propuestas, requerimientos y especificaciones ejecutables antes de escribir código funcional.
2. **Desarrollo Guiado por Pruebas (TDD):** Separación de roles donde los tests se bloquean criptográficamente (`TEST-LOCK.json` con hashes SHA-256) antes de permitir al agente desarrollador implementar la solución.
3. **Compuertas de Calidad Automatizadas:**
   - `trace-gate`: Verificación de correspondencia 1:1 entre criterios de aceptación y casos de prueba.
   - `test-lock`: Prevención de manipulaciones en las aserciones de prueba.
   - `secret-scan`: Escaneo contra credenciales o variables privadas antes de cualquier confirmación.
4. **Comité de Revisores Independientes:** Cada cambio de alto impacto es sometido a 4 revisiones independientes:
   - **Security Reviewer:** Auditoría de vulnerabilidades OWASP, flujo OAuth, validación de sesiones y manejo de cookies.
   - **UX Reviewer:** Auditoría de usabilidad, mensajes de error, flujos de reintento y claridad de la interacción.
   - **UI Reviewer:** Auditoría de componentes visuales, consistencia tipográfica, estados de carga y feedback visual.
   - **Code Reviewer:** Auditoría de calidad de código, modularidad, patrones limpios y cobertura de pruebas.
5. **Compuerta Humana:** Los cambios clasificados como de riesgo alto (backend, autenticación y despliegue) exigen aprobación humana obligatoria antes de generar el manifiesto `release.json` y proceder al merge.

---

## 5. Etapa 4 — Implementación de la Historia de Usuario US-01

En concordancia con la Sección 4 de `Lab8.docx`:

### 5.1. Definición de la Historia de Usuario
> **US-01: Autenticación social en UNA Chat**
> *Como usuario de UNA Chat, quiero iniciar sesión con una cuenta de una red social mediante OAuth, utilizando Auth0, para acceder al chat sin crear ni recordar una contraseña adicional.*

### 5.2. Verificación de los Criterios de Aceptación (1 al 9)

| # | Criterio de Aceptación Oficial | Implementación Técnica y Resultado | Evidencia |
|:---:|---|---|:---:|
| **1** | El estudiante crea una cuenta personal en Auth0 y configura una aplicación para UNA Chat. | Configurada aplicación *Regular Web Application* en tenant `dev-0cns5htp3msxjw75`. | [evidencia-6.png](../evidence/evidencia-6.png) |
| **2** | Se habilita al menos un proveedor de autenticacin social. | Conexión social `google-oauth2` configurada y operando con consentimiento OAuth. | [01-consentimiento-auth0-redactada.png](../evidence/us-01-auth0/01-consentimiento-auth0-redactada.png) |
| **3** | Se configuran las URLs de retorno, cierre de sesión y orígenes permitidos para local y Vercel. | Configurados `Allowed Callback URLs`, `Allowed Logout URLs` y `Allowed Web Origins` para `localhost:3000` y `https://lab5-paradigmas-ten.vercel.app`. | [evidencia-6.png](../evidence/evidencia-6.png) |
| **4** | En el ambiente local, el usuario puede iniciar sesión con el proveedor y regresar autenticado. | Flujo local OIDC con PKCE verificado de punta a punta con suite E2E e integración. | [02-chat-autenticado-redactada.png](../evidence/us-01-auth0/02-chat-autenticado-redactada.png) |
| **5** | UNA Chat muestra la identidad del usuario autenticado y permite cerrar sesión. | Encabezado muestra avatar y nombre provenientes de `req.oidc.user`. Enlace `/logout` destruye sesión local y de Auth0. | [02-chat-autenticado-redactada.png](../evidence/us-01-auth0/02-chat-autenticado-redactada.png) |
| **6** | El acceso al chat requiere autenticación; si no ha iniciado sesión, se solicita hacerlo. | `/chat` protegido con `requiresAuth()`. Landing `/` presenta botón de login. Handshake Socket.IO autenticado con cookie `appSession`. | [evidencia-7.png](../evidence/evidencia-7.png) |
| **7** | La aplicación se despliega en Vercel y permite completar el mismo flujo de inicio y cierre de sesión. | Desplegado y verificado en **Vercel Production** (`lab5-paradigmas-ten.vercel.app`) en estado **Ready**. | [evidencia-7.png](../evidence/evidencia-7.png) |
| **8** | Configuración administrada por variables de entorno sin secretos en repositorio ni navegador. | `.env` excluido; `.env.example` versionado con marcadores limpios; credenciales configuradas privadamente en Vercel; 0 secretos expuestos. | `despues/.env.example` |
| **9** | Si el usuario cancela o se produce un error, se muestra un mensaje claro y permite reintentarlo. | Manejador de error en callback captura denegaciones y errores OAuth, redirigiendo a landing con mensaje seguro y botón de reintento. | Suites unitarias e integración |

---

## 6. Arquitectura de Seguridad y Solución de Sincronización Socket.IO

### 6.1. OIDC Confidencial en Servidor con `express-openid-connect`
- Las credenciales privadas (`AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`) se custodian en el backend.
- El navegador jamás recibe tokens de acceso (Access Tokens) ni tokens de identidad (ID Tokens).
- La sesión se mantiene mediante una cookie cifrada (`appSession`), con flags `HttpOnly`, `SameSite=Lax`, duración de 7 días y `Secure` en producción.

### 6.2. Innovación en Seguridad: Renovación Periódica de Permisos Socket.IO
Una vulnerabilidad clásica al integrar WebSockets con OAuth es que el handshake solo se valida al establecer la conexión, permitiendo que un socket permanezca activo indefinidamente aunque la sesión HTTP haya expirado o se haya cerrado en otra pestaña.

Para remediarlo, se implementó una arquitectura de **permisos con expiración temporal**:
1. **Endpoint `POST /api/socket/session`:** El navegador invoca periódicamente este endpoint mediante peticiones HTTP autenticadas con la cookie fresca de sesión.
2. **Validación de Identidad:** El servidor valida que el sujeto de la sesión HTTP (`user.sub`) coincida estrictamente con la identidad asociada al socket (`socket.data.user.sub`).
3. **TTL Estricto:** Si la validación es exitosa, se otorga un permiso temporal (`sessionVerifiedUntil = now + 30s`). El cliente solicita renovación cada 15 segundos.
4. **Desconexión Forzada:** Todo intento de enviar un mensaje sin permiso vigente provoca la desconexión inmediata del socket (`socket.disconnect(true)`).

---

## 7. Despliegue en Vercel Serverless

### 7.1. Compatibilidad con WebSocket Functions
- `despues/server.js` exporta directamente la instancia `http.Server` requerida por el preset de Vercel.
- Se implementó `functions.includeFiles` en `vercel.json` con `{index.html,private-assets/**}` para garantizar que los assets estáticos se incluyan en el bundle serverless dentro de `/var/task`, eliminando errores de tipo `ENOENT`.
- Los recursos privados bajo `private-assets/` se entregan mediante streaming controlado con `fs.createReadStream` tras verificar autenticación, sustituyendo `express.static()`.

---

## 8. Resumen de Entregables Oficiales

| Entregable Solicitado en `Lab8.docx` | Ubicación / Estado |
|---|---|
| **Repositorio con la implementación** | [https://github.com/andreyhrndz/Lab5Paradigmas](https://github.com/andreyhrndz/Lab5Paradigmas) |
| **URL de UNA Chat desplegado en Vercel** | [https://lab5-paradigmas-ten.vercel.app/](https://lab5-paradigmas-ten.vercel.app/) |
| **README con pasos de configuración y ejecución** | [README.md](../../README.md) y [docs/us-01-auth0/README.md](../us-01-auth0/README.md) |
| **Archivo `.env.example` sin credenciales reales** | [despues/.env.example](../../despues/.env.example) |
| **Evidencias de inicio de sesión en local y Vercel** | [docs/evidence/README.md](../evidence/README.md) ([evidencia-6.png](../evidence/evidencia-6.png), [evidencia-7.png](../evidence/evidencia-7.png), [us-01-auth0/](../evidence/us-01-auth0/)) |
