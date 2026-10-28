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

Este laboratorio se enfoca en el análisis, remediación de vulnerabilidades de inyección de código (Cross-Site Scripting - XSS) y fortalecimiento de calidad del sistema **UNA Chat**, una aplicación web de mensajería en tiempo real construida sobre Node.js, Express y Socket.IO.

El proyecto abarca:
1. **Diagnóstico y Reproducción de Vulnerabilidades:** Identificación y evidencia de brechas de seguridad (XSS en Socket.IO, errores en expresiones regulares y fallas en dependencias).
2. **Sanitización y Soporte Multimedia Seguro:** Procesamiento, validación y renderizado seguro de imágenes y videos embebidos de YouTube mediante creación programática de elementos DOM sin uso de `.html()` ni `innerHTML`.
3. **Estrategia Integral de Calidad y Pruebas Automatizadas:**
   - **Pruebas Unitarias:** Validación de lógica en la biblioteca [`unalib.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/libs/unalib.js) (41 pruebas aprobadas).
   - **Pruebas de Integración:** Verificación de la comunicación bidireccional backend-librería con `socket.io-client` sobre el evento real `'Evento-Mensaje-Server'` (8 pruebas aprobadas).
   - **Pruebas End-to-End (E2E):** Automatización en navegadores reales mediante Playwright en Chromium, validando el flujo completo de usuario y la ausencia de diálogos maliciosos (5 pruebas aprobadas).
4. **Análisis de Vulnerabilidades en Dependencias:** Auditoría de paquetes mediante Snyk y `npm audit`, remediando 22 vulnerabilidades previas hasta alcanzar 0 vulnerabilidades.
5. **Harness Autónomo y SDLC Agéntico (Parte 2 — Fase 3):** Implementación autónoma reservada para tres requerimientos funcionales (REQ-010, REQ-011, REQ-012) mediante Git Worktrees y Pull Requests independientes.

---

## 2. Estructura del Repositorio

```text
Lab5Paradigmas/
├── .gitignore                     # Configuración de exclusiones de Git
├── README.md                      # Documento principal del proyecto
├── Lab_5_Paradigmas_2026.pdf      # Especificación oficial del laboratorio
├── playwright.config.js           # Configuración de pruebas E2E con Playwright
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
  - [x] Creación de la rama de trabajo `feat/lab5-security-testing`.
  - [x] Conservación íntegra de `antes/` y generación de réplica funcional en `despues/`.
  - [x] Configuración de `.gitignore` integral.
  - [x] Ejecución inicial de dependencias y pruebas originales (identificados 3 fallos en Mocha).
  - [x] Verificación de conexión frontend-backend en tiempo real.
  - [x] Reproducción exitosa de vulnerabilidad XSS y generación de la **Evidencia 1**.
  - [x] Documentación exhaustiva en `docs/`.
  - [x] Formulación del plan de trabajo para fases posteriores.
- [x] **Fase 2: Corrección de seguridad y pruebas automatizadas (Parte 1 Completa)**
  - [x] Creación de pruebas unitarias de seguridad previas a la corrección (TDD / Red phase).
  - [x] Remediación de XSS y saneamiento estricto en [`despues/libs/unalib.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/libs/unalib.js).
  - [x] Soporte para visualización segura de imágenes y videos de YouTube.
  - [x] Eliminación de `.html()` y saneamiento de entradas en [`despues/index.html`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/index.html).
  - [x] Ejecución y aprobación de suite unitaria (41/41 pasando) -> Generación de **Evidencia 2**.
  - [x] Implementación de pruebas de integración con `socket.io-client` (8/8 pasando) -> Generación de **Evidencia 3**.
  - [x] Implementación y ejecución de pruebas E2E con Playwright en Chromium (5/5 pasando) -> Generación de **Evidencia 4**.
  - [x] Auditoría de seguridad con Snyk y remediación completa de vulnerabilidades con `npm audit` (0 vulnerabilidades).
- [ ] **Fase 3: Harness autónomo y Pull Requests (Parte 2 — Reservada)**
  - [ ] Implementación autónoma de **REQ-010:** Impedir mensajes vacíos (Worktree 1 / PR #1).
  - [ ] Implementación autónoma de **REQ-011:** Exigir nombre de usuario (Worktree 2 / PR #2).
  - [ ] Implementación autónoma de **REQ-012:** Limitar mensajes a 280 caracteres (Worktree 3 / PR #3).
  - [ ] Especificaciones OpenSpec y validación tipo FoFo (Judge vs Author).

---

## 4. Instrucciones de Ejecución de Pruebas

Para ejecutar la versión corregida y sus tres suites de pruebas automatizadas:

```bash
# 1. Instalar dependencias en despues/
npm --prefix despues install

# 2. Ejecutar la suite de pruebas unitarias (Evidencia 2)
npm --prefix despues run test:unit

# 3. Ejecutar la suite de pruebas de integración Socket.IO (Evidencia 3)
npm --prefix despues run test:integration

# 4. Ejecutar la suite de pruebas End-to-End con Playwright (Evidencia 4)
npm --prefix despues run test:e2e

# 5. Ejecutar todas las suites secuencialmente
npm --prefix despues run test:all

# 6. Iniciar el servidor web corregido
npm --prefix despues start
```

---

## 5. Documentación de Referencia

- [Matriz de Requisitos](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/requirements.md)
- [Diagnóstico Inicial y Defectos Técnicos](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/initial-diagnosis.md)
- [Hallazgos de Seguridad y Auditoría de Vulnerabilidades](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/security-findings.md)
- [Registro Oficial de Evidencias](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/README.md)
