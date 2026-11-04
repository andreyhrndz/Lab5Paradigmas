# Laboratorios 5 y 6 — Paradigmas de Programación (UNA 2026)
## Seguridad Informática, Testing Automatizado, Harness Autónomo, Memoria Persistente y Autenticación Social en UNA Chat

**Universidad Nacional de Costa Rica (UNA)**
**Sede Regional Chorotega — Campus Nicoya**
**Escuela de Informática — Ingeniería en Sistemas de la Información**
**Curso:** Paradigmas de Programación
**Profesor:** Ing. Alex Villegas Carranza, M.Sc.
**Estudiante:** Andrey Tijerino Hernández
**Repositorio Oficial:** [https://github.com/andreyhrndz/Lab5Paradigmas](https://github.com/andreyhrndz/Lab5Paradigmas)
**Despliegue en Producción (Vercel):** [https://lab5-paradigmas-ten.vercel.app/](https://lab5-paradigmas-ten.vercel.app/)

---

> [!NOTE]
> **Correspondencia Académica de Numeración:**
> La guía oficial de requerimientos emitida por la cátedra para la segunda fase se titula formalmente `Lab8.docx` (*Memoria y harness para UNA Chat*). En el cronograma didáctico y evaluativo de la carrera, dicha entrega corresponde al **Laboratorio 6**, actuando como continuación directa del **Laboratorio 5** (*Seguridad Informática y Testing Automatizado*). Para preservar la trazabilidad documental, los nombres originales de los archivos de especificación se conservan intactos.

---

## Acceso Rápido y Enlaces Principales

- 🚀 **Aplicación en Producción (Vercel):** [https://lab5-paradigmas-ten.vercel.app/](https://lab5-paradigmas-ten.vercel.app/)
- 📑 **Documento Maestro de Entrega:** [docs/ENTREGA-LABORATORIOS-5-Y-6.md](docs/ENTREGA-LABORATORIOS-5-Y-6.md)
- 🧠 **Informe Técnico del Laboratorio 6 (Memoria y Harness):** [docs/lab6/README.md](docs/lab6/README.md)
- 🔐 **Especificación Técnica de US-01 (Auth0 Social OAuth):** [docs/us-01-auth0/README.md](docs/us-01-auth0/README.md)
- 📸 **Catálogo Consolidado de Evidencias:** [docs/evidence/README.md](docs/evidence/README.md)
- 🔀 **Pull Request Principal Fusionado:** [#17 en GitHub](https://github.com/andreyhrndz/Lab5Paradigmas/pull/17)

---

## 1. Descripción General del Proyecto

Este repositorio reúne y consolida la evolución técnica integral de **UNA Chat**, una aplicación web de mensajería bidireccional en tiempo real basada en Node.js, Express y Socket.IO, desarrollada a lo largo de dos fases formativas:

### Fase 1: Laboratorio 5 — Remediación de Seguridad, Testing y Harness Autónomo
1. **Diagnóstico y Reproducción de Vulnerabilidades:** Identificación y evidencia visual de inyección de código JavaScript (XSS / CWE-79) en la versión original `antes/`.
2. **Sanitización y Soporte Multimedia Seguro:** Transformación en `despues/libs/unalib.js` y `despues/index.html`, erradicando el uso inseguro de `.html()` e `innerHTML` mediante manipulación programática de nodos DOM con `.text()`, soportando imágenes y videos de YouTube con directivas estrictas de sandbox.
3. **Arnés de Calidad Automatizado:** Implementación de pruebas unitarias (Mocha), pruebas de integración sobre Socket.IO en puertos dinámicos y pruebas End-to-End con Playwright en Chromium.
4. **Auditoría de Dependencias (SCA):** Análisis exhaustivo con Snyk y `npm audit` (**0 vulnerabilidades abiertas**).
5. **Harness Autónomo (OpenSpec + FoFo):** Orquestación multiagente determinista con separación estricta de roles (Judge vs Author), congelamiento criptográfico de pruebas (`test-lock`) e implementación concurrente y coordinada en Git Worktrees de los requerimientos:
   - **REQ-010:** Impedir mensajes vacíos (`feat/req-010`).
   - **REQ-011:** Exigir nombre de usuario (`feat/req-011`).
   - **REQ-012:** Limitar mensajes a 280 caracteres (`feat/req-012`).
   - Verificación de integración conjunta exitosa (`verify/joint-integration`).

### Fase 2: Laboratorio 6 — Memoria Persistente, Software Factory y Autenticación Social (US-01)
1. **Espacio de Trabajo Agéntico:** Organización modular con principio de *Progressive Disclosure* y descriptores `AGENTS.md`.
2. **Segundo Cerebro (Obsidian Second Brain):** Memoria persistente en `brain/` con bitácora diaria (`America/Costa_Rica`), instantánea dinámica `status.md` y política de Cero Secretos.
3. **Software Factory Agéntica:** Flujo gobernado por *Spec-Driven Development* (SDD), con comité de 4 revisores independientes (**Security**, **UX**, **UI**, **Code**) y compuerta humana formal previa al merge.
4. **Historia de Usuario US-01 (Auth0 + Google):** Integración de cliente OIDC confidencial en backend con `express-openid-connect`, cookies seguras `HttpOnly`, handshake autenticado y **mecanismo de renovación periódica de permisos en Socket.IO** (`POST /api/socket/session` con TTL de 30s) para evitar conexiones huérfanas.
5. **Despliegue Serverless en Vercel:** Soporte para WebSocket Functions con Fluid Compute, file tracing con `functions.includeFiles` en `vercel.json` y streaming controlado de assets privados bajo autenticación.

---

## 2. Estructura del Repositorio

```text
Lab5Paradigmas/
├── .gitignore                         # Exclusiones de Git (node_modules, .env, temporales)
├── README.md                          # Este documento maestro del proyecto
├── Lab_5_Paradigmas_2026.pdf          # Especificación oficial del Laboratorio 5
├── playwright.config.js               # Configuración global de Playwright
├── PROVENANCE.yaml                    # Manifiesto de procedencia de autoría independiente
├── REQUIREMENTS.md                    # Catálogo de requerimientos formales
├── SPEC.md                            # Especificación ejecutiva del sistema
├── TEST-LOCK.json                     # Bloqueo criptográfico de pruebas (hashes SHA-256)
├── TEST-REQS.yaml                     # Matriz de trazabilidad requisito <-> prueba
├── vercel.json                        # Configuración de despliegue serverless e includeFiles
├── antes/                             # Código original inmutable (testigo histórico)
│   ├── index.html                     # Frontend vulnerable con jQuery 1.11.1
│   ├── server.js                      # Servidor Express + Socket.IO original
│   ├── package.json                   # Dependencias originales con versiones comodín (*)
│   ├── libs/
│   │   └── unalib.js                  # Lógica original con defectos de escape y sintaxis
│   └── test/
│       └── test.js                    # Pruebas originales de Mocha con fallos detectados
├── despues/                           # Versión saneada, asegurada, autenticada y testeada
│   ├── .env.example                   # Plantilla pública de variables de entorno sin secretos
│   ├── index.html                     # Frontend seguro (login Auth0, manipulación DOM nativa)
│   ├── server.js                      # Servidor Express + Socket.IO + OIDC + Vercel HTTP export
│   ├── package.json                   # Dependencias aseguradas y scripts de testing
│   ├── playwright.config.js           # Configuración de Playwright en Chromium
│   ├── vercel.json                    # Configuración de empaquetado para Vercel
│   ├── libs/
│   │   ├── auth-session.js            # Gestión y validación de permisos temporales de socket
│   │   └── unalib.js                  # Validación, saneamiento HTML y soporte multimedia
│   ├── private-assets/                # Recursos protegidos con entrega autenticada por streaming
│   │   └── sample.png                 # Fixture de imagen local para pruebas E2E
│   └── test/                          # 105 pruebas automatizadas organizadas por nivel
│       ├── test.js                    # Pruebas originales de compatibilidad
│       ├── unit/                      # 54 pruebas unitarias (unalib, auth-session, REQ-010..012)
│       ├── integration/               # 40 pruebas de integración (Socket.IO, Express, OIDC)
│       └── e2e/                       # 11 pruebas End-to-End con Playwright
├── harness/                           # Orquestador autónomo OpenSpec + FoFo (Lab 5)
│   ├── cli.js                         # CLI de administración del harness
│   ├── core/                          # Worktrees, puertos dinámicos, estados y PRs
│   ├── agents/                        # Adaptadores aislados Judge vs Author
│   └── fofo/                          # Compuertas automáticas de calidad FoFo
├── openspec/                          # Especificación formal de requerimientos (SDD)
└── docs/                              # Documentación técnica, académica y evidencias
    ├── ENTREGA-LABORATORIOS-5-Y-6.md  # Documento maestro consolidado de entrega docente
    ├── lab6/                          # Informe técnico específico del Laboratorio 6
    │   └── README.md                  # Memoria, Harness y US-01 detallados
    ├── us-01-auth0/                   # Guía de arquitectura y verificación de US-01
    │   └── README.md                  # Criterios de aceptación, multi-instancia y Vercel
    ├── evidence/                      # Registro consolidado de evidencias visuales
    │   ├── README.md                  # Índice y descripción técnica de capturas
    │   ├── evidencia1.png             # Evidencia 1: XSS reproducido en antes/
    │   ├── evidencia-2.png            # Evidencia 2: Pruebas unitarias aprobadas
    │   ├── evidencia-3.png            # Evidencia 3: Pruebas de integración Socket.IO
    │   ├── evidencia-4.png            # Evidencia 4: Pruebas E2E Playwright Chromium
    │   ├── evidencia-5.png            # Evidencia 5: Chat interactivo seguro con YouTube
    │   ├── evidencia-snyk.png         # Evidencia Snyk: 0 vulnerabilidades en dependencias
    │   ├── evidencia-6.png            # Evidencia 6: URLs configuradas en Auth0 Dashboard
    │   ├── evidencia-7.png            # Evidencia 7: Vercel Production deployment Ready
    │   └── us-01-auth0/               # Evidencias redactadas de flujo OAuth
    ├── requirements.md                # Matriz histórica de requisitos
    ├── initial-diagnosis.md           # Diagnóstico inicial de vulnerabilidades
    ├── security-findings.md           # Hallazgos de seguridad y auditoría de código
    ├── autonomous-harness.md          # Manual del harness autónomo multiagente
    ├── harness-autonomy-audit.md      # Auditoría de autonomía y compuertas FoFo
    └── final-integration-report.md    # Reporte final de integración coordinada
```

---

## 3. Estado de Ejecución por Fases (100% Completado)

- [x] **Fase 1: Diagnóstico, Preparación y Evidencia Inicial (Lab 5)**
  - [x] Análisis del código original y reproducción de inyección XSS -> **[evidencia1.png](docs/evidence/evidencia1.png)**.
  - [x] Estructuración de directorios (`antes/` inmutable y `despues/`).
  - [x] Documentación de diagnóstico en [docs/initial-diagnosis.md](docs/initial-diagnosis.md).
- [x] **Fase 2: Remediación de Seguridad y Pruebas Automatizadas (Lab 5)**
  - [x] Saneamiento estricto en [despues/libs/unalib.js](despues/libs/unalib.js) y eliminación de `.html()`.
  - [x] Soporte multimedia seguro para imágenes y videos de YouTube.
  - [x] Pruebas unitarias aprobadas (41/41) -> **[evidencia-2.png](docs/evidence/evidencia-2.png)**.
  - [x] Pruebas de integración Socket.IO aprobadas (8/8) -> **[evidencia-3.png](docs/evidence/evidencia-3.png)**.
  - [x] Pruebas E2E con Playwright en Chromium aprobadas (5/5) -> **[evidencia-4.png](docs/evidence/evidencia-4.png)**.
  - [x] Chat seguro en ejecución verificado -> **[evidencia-5.png](docs/evidence/evidencia-5.png)**.
  - [x] Auditoría de seguridad con Snyk y `npm audit` (0 vulnerabilidades) -> **[evidencia-snyk.png](docs/evidence/evidencia-snyk.png)**.
- [x] **Fase 3: Harness Autónomo y Requerimientos Concurrentes (Lab 5 — Parte 2)**
  - [x] Construcción del harness OpenSpec + FoFo con separación Judge/Author y bloqueo `test-lock`.
  - [x] 13 pruebas de infraestructura del harness aprobadas.
  - [x] Implementación autónoma de **REQ-010** (Impedir mensajes vacíos).
  - [x] Implementación autónoma de **REQ-011** (Exigir nombre de usuario).
  - [x] Implementación autónoma de **REQ-012** (Limitar mensajes a 280 caracteres).
  - [x] Verificación de integración conjunta aprobada y fusionada en `main`.
- [x] **Fase 4: Laboratorio 6 — Memoria Persistente, Software Factory y US-01 Auth0**
  - [x] Espacio de trabajo agéntico con *Progressive Disclosure* y `.gitignore` progresivo.
  - [x] Segundo Cerebro en `brain/` con logs diarios, `status.md` y sin secretos.
  - [x] Software Factory adaptada con 4 revisores independientes y compuerta humana.
  - [x] Implementación completa de **US-01: Autenticación Social con Auth0 + Google**.
  - [x] Renovación periódica de permisos de Socket.IO vía HTTP (`POST /api/socket/session`).
  - [x] 105 pruebas automatizadas de aplicación pasando al 100% + 20 pruebas de fábrica.
  - [x] Configuración de Auth0 Dashboard -> **[evidencia-6.png](docs/evidence/evidencia-6.png)**.
  - [x] Despliegue en **Vercel Production** en estado Ready -> **[evidencia-7.png](docs/evidence/evidencia-7.png)**.
  - [x] Verificación del flujo OAuth en producción: [https://lab5-paradigmas-ten.vercel.app/](https://lab5-paradigmas-ten.vercel.app/).

---

## 4. Métricas de Calidad y Cobertura de Pruebas

La totalidad de las suites de prueba se ejecutan de manera determinista y automatizada:

```text
Suite de Pruebas                Herramienta / Framework            Total    Aprobadas    Fallidas    Eficacia
-------------------------------------------------------------------------------------------------------------
Pruebas Unitarias               Mocha / Node.js assert                54           54           0        100%
Pruebas de Integración          Socket.IO client + Express HTTP       40           40           0        100%
Pruebas End-to-End (E2E)        Playwright (Chromium Headless)        11           11           0        100%
-------------------------------------------------------------------------------------------------------------
Total Pruebas de la Aplicación                                       105          105           0        100%
Pruebas de Software Factory     Node.js Test Runner                   20           20           0        100%
-------------------------------------------------------------------------------------------------------------
Total Global Verificado                                              125          125           0        100%
```

---

## 5. Instrucciones de Instalación, Verificación y Uso

### 5.1. Verificación Rápida en Producción (Recomendada)
Para comprobar el funcionamiento sin necesidad de clonar ni configurar dependencias locales, acceda directamente a:
👉 **[https://lab5-paradigmas-ten.vercel.app/](https://lab5-paradigmas-ten.vercel.app/)**
- Haga clic en **"Iniciar sesión con Auth0"**.
- Autentíquese con Google.
- Compruebe la visualización de su identidad en la cabecera del chat.
- Envíe mensajes de texto, imágenes y videos de YouTube.
- Haga clic en **"Cerrar sesión"** para revocar el acceso.

### 5.2. Ejecución en Ambiente Local

```powershell
# 1. Navegar al directorio de la solución
cd despues

# 2. Configurar el archivo de variables de entorno
Copy-Item .env.example .env
# Editar .env e ingresar las credenciales del tenant Auth0

# 3. Instalar las dependencias fijadas
npm install

# 4. Iniciar el servidor
npm start
```
Abra `http://localhost:3000` en su navegador.

### 5.3. Ejecución de las Suites de Pruebas Automatizadas

Dentro de la carpeta `despues/`:
```powershell
# Pruebas unitarias
npm run test:unit

# Pruebas de integración
npm run test:integration

# Pruebas End-to-End con Playwright
npm run test:e2e

# Ejecución combinada de las 105 pruebas
npm run test:all
```

---

## 6. Documentación Técnica de Referencia

- [Documento Maestro de Entrega](docs/ENTREGA-LABORATORIOS-5-Y-6.md)
- [Informe Técnico del Laboratorio 6 (Memoria, Harness y US-01)](docs/lab6/README.md)
- [Guía de Arquitectura de US-01 Auth0](docs/us-01-auth0/README.md)
- [Registro y Guía de Evidencias](docs/evidence/README.md)
- [Manual del Harness Autónomo (OpenSpec + FoFo)](docs/autonomous-harness.md)
- [Diagnóstico Inicial y Defectos Técnicos](docs/initial-diagnosis.md)
- [Hallazgos de Seguridad y Remediación XSS](docs/security-findings.md)
- [Reporte Final de Integración Coordinada](docs/final-integration-report.md)
