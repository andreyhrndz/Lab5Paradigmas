# Laboratorio 5 — Paradigmas de Programación (UNA 2026)
## Seguridad Informática y Testing Automatizado en UNA Chat

**Universidad Nacional de Costa Rica (UNA)**  
**Sede Regional Chorotega — Campus Nicoya**  
**Carrera:** Ingeniería en Sistemas de la Información  
**Curso:** Paradigmas de Programación  
**Profesor:** Ing. Alex Villegas Carranza, M.Sc.  
**Repositorio:** [https://github.com/andreyhrndz/Lab5Paradigmas](https://github.com/andreyhrndz/Lab5Paradigmas)  

---

## 1. Descripción del Proyecto

Este laboratorio aborda el análisis, remediación de vulnerabilidades de inyección de código (Cross-Site Scripting - XSS) y fortalecimiento de calidad del sistema **UNA Chat**, una aplicación web de mensajería en tiempo real construida sobre Node.js, Express y Socket.IO.

El proyecto abarca:
1. **Diagnóstico y Reproducción de Vulnerabilidades:** Identificación y evidencia de brechas de seguridad (XSS en Socket.IO, errores en expresiones regulares y fallas en dependencias).
2. **Sanitización y Soporte Multimedia Seguro:** Procesamiento, validación y renderizado seguro de imágenes y videos embebidos de YouTube mediante creación programática de elementos DOM sin uso de `.html()` ni `innerHTML`.
3. **Estrategia Integral de Calidad y Pruebas Automatizadas:**
   - **Pruebas Unitarias:** Validación de lógica en [`unalib.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/libs/unalib.js) (41 pruebas aprobadas).
   - **Pruebas de Integración:** Verificación de la comunicación con `socket.io-client` sobre `'Evento-Mensaje-Server'` (8 pruebas aprobadas).
   - **Pruebas End-to-End (E2E):** Automatización en navegadores reales mediante Playwright en Chromium (5 pruebas aprobadas).
4. **Análisis de Vulnerabilidades en Dependencias:** Auditoría de paquetes mediante Snyk y `npm audit` (0 vulnerabilidades).
5. **Harness Autónomo y SDLC Agéntico (Parte 2):** Orquestador multiagente determinista que integra **OpenSpec** (especificación formal) y **FoFo** (separación de Judge vs Author, gates de integridad `test-lock`, escaneo de secretos y validación de integración coordinada con Git Worktrees).

---

## 2. Estructura del Repositorio

```text
Lab5Paradigmas/
├── .gitignore                     # Configuración de exclusiones de Git
├── README.md                      # Documento principal del proyecto
├── Lab_5_Paradigmas_2026.pdf      # Especificación oficial del laboratorio
├── playwright.config.js           # Configuración de pruebas E2E con Playwright
├── openspec/                      # Configuración y esquemas de OpenSpec
│   ├── config.yaml                # Perfil y reglas de especificación
│   ├── changes/                   # Propuestas de cambio activas y archivadas
│   └── specs/                     # Especificaciones vivas del sistema
├── harness/                       # Orquestador autónomo OpenSpec + FoFo
│   ├── cli.js                     # CLI de administración del harness
│   ├── core/                      # Módulos del orquestador (worktree, puertos, estados, PRs)
│   ├── agents/                    # Adaptadores de agentes (Judge vs Author con aislamiento)
│   ├── fofo/                      # Scripts y compuertas de calidad FoFo (Agentic-SDLC)
│   └── test/                      # Pruebas de infraestructura y resiliencia del harness
├── antes/                         # Código original inmutable (evidencia histórica)
│   ├── index.html                 # Frontend original con jQuery 1.11.1
│   ├── server.js                  # Servidor Express + Socket.IO original
│   ├── package.json               # Dependencias originales (Mocha, Express*, Socket.IO*)
│   ├── libs/
│   │   └── unalib.js              # Módulo de validación con fallas de seguridad y sintaxis
│   └── test/
│       └── test.js                # Pruebas iniciales de Mocha (3 fallos detectados)
├── despues/                       # Versión corregida, asegurada y testeada
│   ├── index.html                 # Frontend seguro (uso estricto de .text() y nodos DOM)
│   ├── server.js                  # Servidor Node.js + Socket.IO modularizado
│   ├── package.json               # Dependencias fijadas y scripts de testing
│   ├── playwright.config.js       # Configuración local de Playwright
│   ├── public/                    # Archivos estáticos y fixtures locales seguros
│   │   └── sample.png             # Fixture de imagen local para pruebas E2E
│   ├── libs/
│   │   └── unalib.js              # Validación robusta, escape HTML y soporte multimedia
│   └── test/
│       ├── test.js                # Pruebas originales compatibles (5 aprobadas)
│       ├── unit/
│       │   └── unalib.unit.test.js # Suite unitaria completa (36 pruebas de seguridad)
│       ├── integration/
│       │   └── chat.integration.test.js # Suite de integración Socket.IO (8 pruebas)
│       └── e2e/
│           └── chat.spec.js       # Suite End-to-End con Playwright (5 pruebas)
└── docs/                          # Documentación técnica y formal
    ├── requirements.md            # Matriz de requisitos (Partes 1 y 2)
    ├── initial-diagnosis.md       # Diagnóstico arquitectónico y técnico inicial
    ├── security-findings.md       # Hallazgos de seguridad y auditoría de dependencias
    ├── autonomous-harness.md      # Manual arquitectónico y operativo del Harness (OpenSpec + FoFo)
    └── evidence/                  # Capturas de evidencia requeridas para la entrega
        ├── README.md              # Registro y guía de reproducción de evidencias
        ├── evidencia-1.png        # Evidencia 1: Inyección XSS reproducida (PNG)
        ├── evidencia-1.jpg        # Evidencia 1: Inyección XSS reproducida (JPG)
        ├── evidencia-2.jpg        # Evidencia 2: Pruebas unitarias aprobadas (JPG)
        ├── evidencia-3.jpg        # Evidencia 3: Pruebas de integración aprobadas (JPG)
        └── evidencia-4.jpg        # Evidencia 4: Pruebas E2E Playwright aprobadas (JPG)
```

---

## 3. Estado de Ejecución por Fases

- [x] **Fase 1: Diagnóstico, preparación y evidencia inicial**
  - [x] Inspección completa del repositorio y del PDF oficial.
  - [x] Creación de rama y réplica funcional en `despues/`.
  - [x] Reproducción de XSS y generación de la **Evidencia 1**.
  - [x] Documentación exhaustiva en `docs/`.
- [x] **Fase 2: Corrección de seguridad y pruebas automatizadas (Parte 1)**
  - [x] Remediación de XSS y saneamiento estricto en [`despues/libs/unalib.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/libs/unalib.js).
  - [x] Soporte para imágenes y videos embebidos de YouTube.
  - [x] Erradicación de `.html()` en [`despues/index.html`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/index.html).
  - [x] Suite unitaria (41/41 pasando) -> **Evidencia 2**.
  - [x] Suite de integración Socket.IO (8/8 pasando) -> **Evidencia 3**.
  - [x] Suite E2E con Playwright en Chromium (5/5 pasando) -> **Evidencia 4**.
  - [x] Auditoría de dependencias y remediación de CVEs (0 vulnerabilidades).
- [x] **Fase 3A: Construcción del Harness Autónomo (Parte 2 — Arquitectura)**
  - [x] Instalación e inicialización de OpenSpec CLI (`@fission-ai/openspec`).
  - [x] Integración de compuertas de calidad FoFo (`Agentic-SDLC`): `spec-lint`, `trace-gate`, `test-lock`, `secret-scan`.
  - [x] Implementación de orquestador Node.js con asignación de puertos (`PortAllocator`) y persistencia atómica de estados (`StateManager`).
  - [x] Aislamiento estricto de agentes (Judge = spec-only; Author = code-only; Referee = arbitraje con `test-lock`).
  - [x] Módulo de verificación de integración coordinada (`IntegrationVerifier`).
  - [x] Pruebas de infraestructura del harness ejecutadas y aprobadas (13/13 pasando).
  - [x] Documentación técnica completa en [`docs/autonomous-harness.md`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/autonomous-harness.md).
- [ ] **Fase 3B: Demostración y Ejecución Autónoma de Requerimientos**
  - [ ] Ejecución autónoma de **REQ-010:** Impedir mensajes vacíos (`feat/req-010-prevent-empty-messages` -> PR #1).
  - [ ] Ejecución autónoma de **REQ-011:** Exigir nombre de usuario (`feat/req-011-require-username` -> PR #2).
  - [ ] Ejecución autónoma de **REQ-012:** Limitar mensajes a 280 caracteres (`feat/req-012-limit-message-length` -> PR #3).
  - [ ] Verificación de integración conjunta de las 3 ramas concurrentes.

---

## 4. Comandos de Verificación y Uso

### Ejecutar Pruebas de la Aplicación Chat (`despues/`)
```bash
# Suites individuales
npm --prefix despues run test:unit
npm --prefix despues run test:integration
npm --prefix despues run test:e2e

# Todas las suites combinadas
npm --prefix despues run test:all
```

### Operar el Harness Autónomo
```bash
# Diagnóstico de prerrequisitos del sistema
node harness/cli.js doctor

# Ejecutar las pruebas de infraestructura del harness
npx mocha harness/test/harness.infra.test.js

# Consultar estado de ejecuciones
node harness/cli.js status

# Reporte consolidado de evidencias
node harness/cli.js report
```

---

## 5. Documentación de Referencia

- [Manual del Harness Autónomo (OpenSpec + FoFo)](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/autonomous-harness.md)
- [Matriz de Requisitos](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/requirements.md)
- [Diagnóstico Inicial y Defectos Técnicos](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/initial-diagnosis.md)
- [Hallazgos de Seguridad y Auditoría de Vulnerabilidades](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/security-findings.md)
- [Registro Oficial de Evidencias](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/README.md)
