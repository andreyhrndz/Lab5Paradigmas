# Documento Maestro de Entrega — Laboratorios 5 y 6

**Institución:** Universidad Nacional de Costa Rica (UNA)
**Sede:** Regional Chorotega — Campus Nicoya
**Carrera:** Ingeniería en Sistemas de la Información
**Curso:** Paradigmas de Programación
**Profesor:** Ing. Alex Villegas Carranza, M.Sc.
**Estudiante:** Andrey Tijerino Hernández
**Fecha de Entrega:** Noviembre 2026

---

## Enlaces Principales de la Solución

- 🚀 **Aplicación Desplegada en Producción (Vercel):** [https://lab5-paradigmas-ten.vercel.app/](https://lab5-paradigmas-ten.vercel.app/)
- 📦 **Repositorio Oficial en GitHub:** [https://github.com/andreyhrndz/Lab5Paradigmas](https://github.com/andreyhrndz/Lab5Paradigmas)
- 🔀 **Pull Request de Entrega Académica:** [PR #18 en GitHub](https://github.com/andreyhrndz/Lab5Paradigmas/pull/18)
- 🔀 **Pull Request Principal de Implementación (Merge a main):** [PR #17 en GitHub](https://github.com/andreyhrndz/Lab5Paradigmas/pull/17)
- 📸 **Catálogo Consolidado de Evidencias:** [docs/evidence/README.md](evidence/README.md)
- 🧠 **Informe Técnico del Laboratorio 6 (Memoria y Harness):** [docs/lab6/README.md](lab6/README.md)
- 🔐 **Especificación de US-01 (Auth0 Social OAuth):** [docs/us-01-auth0/README.md](us-01-auth0/README.md)

---

## 1. Declaración de Correspondencia Académica

> [!IMPORTANT]
> **Correspondencia entre la Guía `Lab8.docx` y el Laboratorio 6:**
> La guía oficial provista por la cátedra para la segunda fase de trabajo se titula formalmente `Lab8.docx` (*Memoria y harness para UNA Chat*). En el plan didáctico y cronograma de evaluación de la asignatura, este trabajo corresponde al **Laboratorio 6**, el cual da continuidad inmediata a los avances desarrollados en el **Laboratorio 5** (*Seguridad Informática y Testing Automatizado en UNA Chat*).
> A fin de mantener estricta rigurosidad y trazabilidad académica, los títulos originales de los documentos de especificación se han conservado intactos, integrando ambos hitos en este documento maestro de entrega unificada.

---

## 2. Resumen Ejecutivo de la Solución Integral

El proyecto consistió en la transformación, aseguramiento, orquestación agéntica y despliegue en la nube del sistema de mensajería en tiempo real **UNA Chat**, articulado en dos grandes etapas:

### 2.1. Laboratorio 5 — Seguridad Informática, Testing Automatizado y Harness Autónomo
1. **Remediación de Vulnerabilidades Críticas (XSS):**
   - Diagnóstico y reproducción de inyección de código JavaScript (CWE-79) en la versión original `antes/`.
   - Saneamiento en profundidad en `despues/libs/unalib.js` erradicando llamadas inseguras a `.html()` en el cliente, sustituidas por manipulación segura de nodos DOM y `.text()`.
2. **Soporte Multimedia Seguro:**
   - Detección y renderizado seguro de imágenes mediante etiquetas `<img>` con manejo controlado de errores.
   - Inserción de videos de YouTube a través de elementos `<iframe>` restringidos con directivas de sandbox seguras.
3. **Arnés de Pruebas y Calidad (105 Pruebas Automatizadas):**
   - 54 pruebas unitarias con Mocha y Node.js assert.
   - 40 pruebas de integración con Socket.IO y servidor HTTP real en puertos dinámicos.
   - 11 pruebas End-to-End en Chromium mediante Playwright.
   - Auditoría SCA de dependencias con Snyk y `npm audit` (**0 vulnerabilidades**).
4. **Harness Autónomo (OpenSpec + FoFo):**
   - Orquestación agéntica con separación de roles (Judge vs Author).
   - Bloqueo criptográfico de pruebas (`test-lock` con hashes SHA-256 en `TEST-LOCK.json`).
   - Implementación concurrente y aislada en Git Worktrees de los requerimientos:
     - **REQ-010:** Impedir mensajes vacíos.
     - **REQ-011:** Exigir nombre de usuario.
     - **REQ-012:** Limitar mensajes a 280 caracteres.
   - Verificación de integración conjunta exitosa (`verify/joint-integration`).

### 2.2. Laboratorio 6 — Memoria Persistente, Software Factory y Autenticación Social (US-01)
1. **Espacio de Trabajo Agéntico con Divulgación Progresiva:**
   - Estructuración del workspace en carpetas desacopladas (`Repos/`, `Knowledge/`, `Skills/`, `brain/`, `factory/`) gobernadas por descriptores `AGENTS.md`.
   - Aislamiento de control de versiones en `Repos/` mediante reglas de exclusión progresiva en `.gitignore`.
2. **Segundo Cerebro (Obsidian Second Brain):**
   - Vault de Obsidian en `brain/` para memoria compartida intersesión entre agentes de IA.
   - Bitácoras diarias fechadas (`brain/daily-log/YYYY-MM-DD.md`) en zona horaria `America/Costa_Rica`.
   - Estado dinámico centralizado en `brain/daily-log/status.md`.
   - Política estricta de Cero Secretos en el vault.
3. **Articulación de Herramientas Agénticas (`rsc-harness` y Software Factory):**
   - `rsc-harness` (@ericrisco/rsc@3.6.0) operando a nivel de workspace con 31 skills instaladas y memoria cableada hacia `brain/`.
   - Software Factory personalizada en `factory/` gobernada por la Constitución SDD (`02-DOCS/wiki/sdd/constitution.md`), ejecutando intake, spec, TDD y evaluación por 4 revisores independientes (**Security**, **UX**, **UI**, **Code**).
   - Manifiesto de liberación formal `release.json` con compuerta humana aprobada para el run `f-20261028-2783`.
4. **Historia de Usuario US-01: Autenticación Social con Auth0 + Google:**
   - Integración de Auth0 como cliente OpenID Connect (OIDC) confidencial del lado del servidor con `express-openid-connect`.
   - Sesión protegida mediante cookie cifrada `HttpOnly` y `SameSite=Lax`.
   - Handshake de Socket.IO autenticado obligatoriamente con el middleware de Auth0.
   - **Mecanismo de Renovación Periódica de Permisos de Socket:** Endpoint `POST /api/socket/session` con TTL estricto de 30 segundos y renovación cada 15s desde el navegador para impedir sockets huérfanos tras expiración de cookie o logout en otra pestaña.
   - Servido seguro de assets privados (`private-assets/`) mediante streaming controlado bajo `requiresAuth()`.
5. **Despliegue en Producción en Vercel:**
   - Configuración de empaquetado serverless con `functions.includeFiles` en `vercel.json` para resolver estáticamente `index.html` y assets privados en `/var/task`.
   - Exportación directa de la instancia HTTP Server para habilitar soporte de WebSocket Functions con Fluid Compute.
   - Despliegue operativo y verificado en [https://lab5-paradigmas-ten.vercel.app/](https://lab5-paradigmas-ten.vercel.app/).

---

## 3. Matriz Consolidada de Cumplimiento de Requisitos

Para garantizar una evaluación rigurosa y transparente, a continuación se diferencian formalmente las **evidencias versionadas en GitHub** de las **verificaciones ejecutables en el workspace local** y las **comprobaciones operativas en la nube**:

### 3.1. Requisitos del Laboratorio 5

| Requisito Oficial | Descripción Técnica | Estado | Evidencia Versionada en GitHub | Verificación Ejecutable en Workspace Local |
|---|---|:---:|:---:|:---:|
| **Paso 1 y 2** | Detección y evidencia de inyección XSS en aplicación original. | **CUMPLIDO** | Captura [evidencia1.png](evidence/evidencia1.png) | Ejecución manual de `antes/`: envío de `<script>alert(...)` muestra modal en navegador |
| **Paso 3 y 4** | Aislamiento en carpetas `antes/` (inmutable) y `despues/` (desarrollo). | **CUMPLIDO** | Estructura de directorios en [README.md](../README.md) | `git status` y árbol de directorios local |
| **Paso 5 y 6** | Remediación XSS y saneamiento HTML en `unalib.js`. | **CUMPLIDO** | Código en `despues/libs/unalib.js` y [security-findings.md](security-findings.md) | Pruebas unitarias especializadas en saneamiento |
| **Paso 7** | Soporte multimedia seguro (imágenes y YouTube). | **CUMPLIDO** | Captura [evidencia-5.png](evidence/evidencia-5.png) | Renderizado en navegador local de iframe sandbox y etiquetas `<img>` |
| **Paso 8** | Pruebas unitarias automatizadas con Mocha. | **CUMPLIDO** | Captura [evidencia-2.png](evidence/evidencia-2.png) | `npm run test:unit` en `despues/` (**54/54 PASS**) |
| **Paso 9** | Pruebas de integración con Socket.IO. | **CUMPLIDO** | Captura [evidencia-3.png](evidence/evidencia-3.png) | `npm run test:integration` en `despues/` (**40/40 PASS**) |
| **Paso 10** | Pruebas End-to-End con Playwright en Chromium. | **CUMPLIDO** | Captura [evidencia-4.png](evidence/evidencia-4.png) | `npm run test:e2e` en `despues/` (**11/11 PASS**) |
| **Paso 11** | Auditoría SCA y remediación de vulnerabilidades. | **CUMPLIDO** | Captura [evidencia-snyk.png](evidence/evidencia-snyk.png) | `npx snyk test` y `npm audit --json` (0 vulnerabilidades) |
| **REQ-010** | Impedir el envío de mensajes vacíos. | **CUMPLIDO** | `openspec/changes/req-010/` y `despues/test/unit/req-010.test.js` | Ejecución de prueba unitaria y suite E2E de REQ-010 |
| **REQ-011** | Exigir nombre de usuario válido. | **CUMPLIDO** | `openspec/changes/req-011/` y `despues/test/unit/req-011.test.js` | Ejecución de prueba unitaria y suite E2E de REQ-011 |
| **REQ-012** | Limitar mensajes a un máximo de 280 caracteres. | **CUMPLIDO** | `openspec/changes/req-012/` y `despues/test/unit/req-012.test.js` | Ejecución de prueba unitaria y suite E2E de REQ-012 |

---

### 3.2. Requisitos del Laboratorio 6 (Especificación Oficial `Lab8.docx`)

| Sección en `Lab8.docx` | Requisito Oficial | Estado | Evidencia Versionada en GitHub | Verificación Ejecutable en Workspace / Cloud |
|---|---|:---:|:---:|:---:|
| **Sección 1** | Preparar el espacio de trabajo con `Repos/`, `AGENTS.md` y `.gitignore` progresivo. | **CUMPLIDO** | Documentación de arquitectura en [lab6/README.md](lab6/README.md#2-etapa-1--preparación-del-espacio-de-trabajo-agéntico) | Inspección de `my-team-workspace/.gitignore` y aislamiento de `Repos/` |
| **Sección 2** | Incorporar la memoria del proyecto (Obsidian Second Brain). | **CUMPLIDO** | Documentación del vault en [lab6/README.md](lab6/README.md#3-etapa-2--memoria-del-proyecto-obsidian-second-brain) | Verificación local en `brain/`: bitácoras `brain/daily-log/`, snapshot `status.md` e `INDEX.md` |
| **Sección 3** | Preparar y operar `rsc-harness` y la Software Factory. | **CUMPLIDO** | Especificación técnica en [lab6/README.md](lab6/README.md#4-etapa-3--diferenciación-y-articulación-de-harnesses-y-software-factory) | Diagnóstico CLI `npx @ericrisco/rsc doctor` (`healthy: true`), `node --test factory/tests/factory.test.mjs` (20/20 PASS) y revisión de `release.json` |
| **US-01 / Crit. 1** | Cuenta personal Auth0 y Regular Web App para UNA Chat. | **CUMPLIDO** | Captura [evidencia-6.png](evidence/evidencia-6.png) | Verificación de configuración en consola web de Auth0 |
| **US-01 / Crit. 2** | Habilitar al menos un proveedor de autenticación social (Google). | **CUMPLIDO** | Captura [01-consentimiento-auth0-redactada.png](evidence/us-01-auth0/01-consentimiento-auth0-redactada.png) | Redirección interactiva a pantalla OAuth de Google |
| **US-01 / Crit. 3** | URLs de callback, logout y orígenes permitidos en local y Vercel. | **CUMPLIDO** | Captura [evidencia-6.png](evidence/evidencia-6.png) | Verificación de URLs en Auth0 Application Settings |
| **US-01 / Crit. 4** | Login local con proveedor social y retorno al chat autenticado. | **CUMPLIDO** | Captura [02-chat-autenticado-redactada.png](evidence/us-01-auth0/02-chat-autenticado-redactada.png) | Ejecución de suite Playwright E2E local: `npm run test:e2e` |
| **US-01 / Crit. 5** | Visualización de identidad autenticada y opción de logout. | **CUMPLIDO** | Captura [02-chat-autenticado-redactada.png](evidence/us-01-auth0/02-chat-autenticado-redactada.png) | Verificación en navegador y en suite E2E (`auth-ui.spec.js`) |
| **US-01 / Crit. 6** | Acceso al chat requiere autenticación obligatoria. | **CUMPLIDO** | Captura [evidencia-7.png](evidence/evidencia-7.png) | Pruebas de integración: 40 casos validando rechazo anónimo, cookie falsa y upgrade directo |
| **US-01 / Crit. 7** | Despliegue en Vercel con el mismo flujo funcional. | **CUMPLIDO** | Captura [evidencia-7.png](evidence/evidencia-7.png) | Comprobación en vivo en producción: [https://lab5-paradigmas-ten.vercel.app/](https://lab5-paradigmas-ten.vercel.app/) |
| **US-01 / Crit. 8** | Configuración por variables de entorno sin secretos en repo ni browser. | **CUMPLIDO** | Plantilla versionada [`despues/.env.example`](../despues/.env.example) | Escaneo determinista de secretos: 0 credenciales expuestas en Git |
| **US-01 / Crit. 9** | Manejo claro de cancelación y errores OAuth con reintento. | **CUMPLIDO** | Especificación en [us-01-auth0/README.md](us-01-auth0/README.md) | Pruebas automatizadas de intercepción de error en `/callback` |

---

## 4. Guía de Verificación y Reproducción para la Persona Evaluadora

La persona evaluadora dispone de dos vías independientes para comprobar el correcto funcionamiento del sistema:

### 4.1. Verificación Inmediata en Ambiente de Producción (Vercel)
No requiere instalación local de dependencias:
1. Ingrese a la URL de producción: [https://lab5-paradigmas-ten.vercel.app/](https://lab5-paradigmas-ten.vercel.app/).
2. Verifique la visualización de la landing page protegida con el botón **"Iniciar sesión con Auth0"**.
3. Haga clic en el botón. Será redirigido al tenant seguro de Auth0.
4. Seleccione autenticación con Google (o cuenta configurada) e ingrese sus credenciales.
5. Tras otorgar el consentimiento, regresará a UNA Chat autenticado en `https://lab5-paradigmas-ten.vercel.app/chat`.
6. Compruebe que la barra superior muestra su avatar y nombre extraídos del perfil seguro del servidor.
7. Envíe un mensaje de texto en la sala de conversación. Confirme que el mensaje aparece firmado con su nombre de usuario asignado desde el servidor.
8. Envíe una imagen segura o un enlace de YouTube para comprobar el renderizado multimedia.
9. Haga clic en **"Cerrar sesión"**. Verifique que la sesión se destruye tanto en UNA Chat como en Auth0, redirigiéndole nuevamente a la landing de acceso.

### 4.2. Verificación en Ambiente Local

#### Prerrequisitos:
- Node.js versión 20.x o superior.
- Git.

#### Pasos de Instalación y Ejecución:
```powershell
# 1. Clonar el repositorio
git clone https://github.com/andreyhrndz/Lab5Paradigmas.git
cd Lab5Paradigmas/despues

# 2. Configurar variables de entorno locales
Copy-Item .env.example .env
# Completar .env con credenciales válidas de Auth0

# 3. Instalar dependencias
npm install

# 4. Iniciar el servidor de desarrollo
npm start
```
Abra `http://localhost:3000` en su navegador para interactuar con la aplicación.

### 4.3. Ejecución de las Suites de Pruebas Automatizadas

Dentro del directorio `despues/`:
```powershell
# Ejecutar pruebas unitarias (54 pruebas)
npm run test:unit

# Ejecutar pruebas de integración con Socket.IO y Express (40 pruebas)
npm run test:integration

# Ejecutar pruebas End-to-End con Playwright en Chromium (11 pruebas)
npm run test:e2e

# Ejecutar la totalidad de las suites combinadas (105 pruebas)
npm run test:all
```

**Resultado Esperado:** 105 de 105 pruebas aprobadas (100% de éxito, 0 fallos).

---

## 5. Resumen Consolidado de Evidencias Visuales

Todas las capturas se encuentran debidamente alojadas dentro del repositorio en el directorio `docs/evidence/`:

1. **[evidencia1.png](evidence/evidencia1.png):** Reproducción de vulnerabilidad XSS en `antes/`.
2. **[evidencia-2.png](evidence/evidencia-2.png):** Pruebas unitarias aprobadas en consola (Mocha).
3. **[evidencia-3.png](evidence/evidencia-3.png):** Pruebas de integración Socket.IO aprobadas en consola.
4. **[evidencia-4.png](evidence/evidencia-4.png):** Pruebas E2E de Playwright en Chromium aprobadas.
5. **[evidencia-5.png](evidence/evidencia-5.png):** Chat seguro interactivo con video de YouTube y XSS neutralizado.
6. **[evidencia-snyk.png](evidence/evidencia-snyk.png):** Escaneo de seguridad SCA con Snyk demostrando 0 vulnerabilidades.
7. **[evidencia-6.png](evidence/evidencia-6.png):** Configuración de URLs en el Dashboard de Auth0 para Vercel Production.
8. **[evidencia-7.png](evidence/evidencia-7.png):** Deployment en producción de Vercel en estado Ready y landing de UNA Chat.
9. **[01-consentimiento-auth0-redactada.png](evidence/us-01-auth0/01-consentimiento-auth0-redactada.png):** Pantalla de consentimiento OAuth de Auth0.
10. **[02-chat-autenticado-redactada.png](evidence/us-01-auth0/02-chat-autenticado-redactada.png):** Interfaz de UNA Chat con usuario autenticado e identidad visible.
11. **[03-chat-mensajes-redactada.png](evidence/us-01-auth0/03-chat-mensajes-redactada.png):** Mensajería activa con identidad validada por el servidor.

---

## 6. Conclusión Técnica

La entrega consolida con éxito los objetivos formativos de ambos laboratorios:
- Se erradicaron de forma demostrable las vulnerabilidades de seguridad originales de UNA Chat mediante una arquitectura de defensa en profundidad.
- Se implementó un arnés de pruebas automatizado de 105 aserciones cubriendo todos los niveles de la pirámide de testing (unitario, integración y E2E).
- Se diseñó y operó una infraestructura agéntica colaborativa articulando `rsc-harness` (@ericrisco/rsc 3.6.0), memoria persistente (Second Brain en Obsidian) y Software Factory gobernada por la Constitución SDD.
- Se integró autenticación social confidencial mediante Auth0 con resolución de permisos temporales en WebSockets.
- La aplicación se encuentra en operación real en la nube bajo la infraestructura serverless de Vercel Production con un comportamiento robusto y verificado.
