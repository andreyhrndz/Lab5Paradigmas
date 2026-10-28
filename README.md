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
1. **Diagnóstico y Reproducción de Vulnerabilidades:** Identificación de brechas de seguridad (XSS en Socket.IO, errores en expresiones regulares y fallas en dependencias).
2. **Sanitización y Soporte Multimedia Seguro:** Procesamiento y visualización controlada de imágenes y videos embebidos de YouTube.
3. **Estrategia Integral de Calidad y Pruebas:**
   - **Pruebas Unitarias:** Validación de lógica pura en la biblioteca de saneamiento (`una-lib`).
   - **Pruebas de Integración:** Verificación de la comunicación backend-librería a través de eventos de Socket.IO.
   - **Pruebas End-to-End (E2E):** Automatización en navegadores reales mediante Playwright para certificar el flujo completo y el bloqueo de diálogos maliciosos.
4. **Análisis de Vulnerabilidades en Dependencias:** Escaneo y actualización de paquetes mediante Snyk y `npm audit`.
5. **Harness Autónomo y SDLC Agéntico (Parte 2):** Implementación estructurada con OpenSpec y filosofía FoFo (Judge vs Author) utilizando Git Worktrees paralelos.

---

## 2. Estructura del Repositorio

```text
Lab5Paradigmas/
├── .gitignore                     # Configuración de exclusiones de Git
├── README.md                      # Documento principal del proyecto
├── Lab_5_Paradigmas_2026.pdf      # Especificación oficial del laboratorio
├── antes/                         # Código original inmutable (evidencia histórica)
│   ├── index.html                 # Frontend original con jQuery 1.11.1
│   ├── server.js                  # Servidor Express + Socket.IO original
│   ├── package.json               # Dependencias originales (Mocha, Express*, Socket.IO*)
│   ├── libs/
│   │   └── unalib.js              # Módulo de validación con fallas de seguridad y sintaxis
│   └── test/
│       └── test.js                # Pruebas iniciales de Mocha (3 fallos detectados)
├── despues/                       # Copia de trabajo funcional para remediaciones y pruebas
│   ├── index.html
│   ├── server.js
│   ├── package.json
│   ├── libs/
│   │   └── unalib.js
│   └── test/
│       └── test.js
└── docs/                          # Documentación técnica y formal
    ├── requirements.md            # Matriz de requisitos de ambas partes del laboratorio
    ├── initial-diagnosis.md       # Diagnóstico arquitectónico y técnico inicial
    ├── security-findings.md       # Hallazgos de seguridad y análisis técnico de XSS
    └── evidence/                  # Capturas de evidencia requeridas para la entrega
        ├── README.md              # Registro y guía de reproducción de evidencias
        ├── evidencia-1.png        # Evidencia 1: Inyección XSS reproducida (PNG)
        └── evidencia-1.jpg        # Evidencia 1: Inyección XSS reproducida (JPG)
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
- [ ] **Fase 2: Implementación de seguridad y suite de pruebas**
  - [ ] Remediación de XSS y saneamiento estricto en `unalib.js`.
  - [ ] Soporte para visualización segura de imágenes y videos de YouTube.
  - [ ] Corrección y expansión de pruebas unitarias (Evidencia 2).
  - [ ] Implementación de pruebas de integración con Socket.IO y Jest (Evidencia 3).
  - [ ] Automatización de pruebas E2E con Playwright (Evidencia 4).
  - [ ] Escaneo y remediación de vulnerabilidades con Snyk.
- [ ] **Fase 3: Harness autónomo y Pull Requests (Parte 2)**
  - [ ] Creación de Git Worktrees paralelos para REQ-010, REQ-011 y REQ-012.
  - [ ] Generación de especificaciones OpenSpec y validación tipo FoFo.
  - [ ] Creación de tres Pull Requests listos para revisión.

---

## 4. Instrucciones de Instalación y Ejecución

### Requisitos Previos
- **Node.js:** Versión 18+ (analizado y verificado en `v24.14.0`).
- **npm:** Versión 9+ (verificado en `11.6.2`).
- **Navegador:** Google Chrome / Chromium.

### Ejecución de la Versión Original (`antes/`)
Para replicar el comportamiento inicial y la vulnerabilidad histórica:

```bash
# 1. Instalar dependencias en la carpeta original
npm --prefix antes install

# 2. Ejecutar las pruebas unitarias originales (fallan 3 pruebas por sintaxis en unalib)
npm --prefix antes test

# 3. Iniciar el servidor original en el puerto 3000
npm --prefix antes start
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 5. Documentación de Referencia

- [Matriz de Requisitos](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/requirements.md)
- [Diagnóstico Inicial y Defectos Técnicos](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/initial-diagnosis.md)
- [Hallazgos de Seguridad y Reproducción XSS](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/security-findings.md)
- [Registro de Evidencias de Pruebas](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/README.md)
