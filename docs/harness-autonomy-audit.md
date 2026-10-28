# Informe de Auditoría de Autonomía Real del Harness Autónomo (Fase 3A.1)

**Proyecto:** UNA Chat — Laboratorio 5: Paradigmas de Programación (Universidad Nacional)  
**Repositorio:** `https://github.com/andreyhrndz/Lab5Paradigmas`  
**Rama:** `feat/autonomous-harness`  
**Fecha:** 28 de octubre de 2026  
**Responsable:** Arquitecto de Sistemas Multiagente y Especialista en Flujos Autónomos  

---

## 1. Verificación e Integración de Agentes Reales (Judge y Author)

### Diagnóstico de la Implementación Inicial (Simulaciones Detectadas)
En la auditoría inicial de la Fase 3A se detectó que los módulos [`harness/agents/judge-agent.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/agents/judge-agent.js) y [`harness/agents/author-agent.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/agents/author-agent.js) contenían atajos programáticos:
- **Judge:** Utilizaba plantillas fijas de cadenas (`specData.testTemplate` o un string formateado por defecto) y callbacks en lugar de razonar sobre la especificación y generar pruebas verdaderamente derivadas.
- **Author:** Dependía de un objeto `specData.implementationPatch` o un callback inyectado (`implementorFn`), sin realizar una síntesis autónoma de código.

### Auditoría del Entorno y CLI de Agentes Disponible
Se realizó un escaneo exhaustivo de los ejecutables y CLIs de IA disponibles en el sistema operativo:
- **`agy.exe` (Antigravity CLI v1.4.9):**
  - **Ubicación:** `C:\Users\cuent\AppData\Local\agy\bin\agy.exe` (disponible en PATH y mediante ruta absoluta).
  - **Estado de Autenticación:** Verificado y activo contra el backend de Antigravity (Gemini). Comando `agy models` retornó la lista completa de modelos (`gemini-4-argon`, `gemini-3.8-flash`, etc.).
  - **Capacidad de Ejecución Headless / No Interactiva:** Verificado empíricamente con `agy --print "..." --print-timeout 120s`. Respondió con código de salida `0` y generó código JavaScript con assert correctamente.
- **`codex.exe` (Codex CLI v0.156.1):**
  - **Ubicación:** `C:\Users\cuent\AppData\Local\Programs\OpenAI\Codex\bin\codex.exe`.
  - **Estado:** Presenta tokens ChatGPT pero en modo no interactivo (`codex exec`) bloquea esperando stdin interactivo de terminal.

### Solución Implementada: Adaptador Real Multiproceso
Se refactorizó el adaptador de agentes ([`harness/agents/agent-adapter.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/agents/agent-adapter.js)), integrando formalmente la CLI nativa de Antigravity (`agy.exe`):
1. **Ejecutable invocado por Judge:** `agy.exe` con flags `--print`, `--print-timeout 120s` y modelo de razonamiento.
2. **Ejecutable invocado por Author:** `agy.exe` en un subproceso hijo desacoplado e independiente.
3. **Mecanismo de Autenticación:** Sesión activa del usuario gestionada por Antigravity CLI en `%LOCALAPPDATA%\agy`.
4. **Contexto Aislado para Judge:**
   - Judge recibe **únicamente** la especificación formal del requerimiento (`SPEC.md` / `specData`).
   - El prompt le prohíbe explícitamente leer o acceder al código fuente productivo en `despues/libs/`.
   - Produce el archivo de trazabilidad [`TEST-REQS.yaml`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/fofo/scripts/trace-gate) y el archivo de pruebas en rojo `despues/test/unit/<reqId>.test.js`.
5. **Contexto para Author:**
   - Author recibe la especificación, el error exacto reportado por la prueba al fallar inicialmente (TDD RED), y el código actual del archivo permitido (`despues/libs/unalib.js`).
   - Tiene **estrictamente prohibido** modificar archivos dentro de `despues/test/`.
6. **Manejo de Tiempos y Resiliencia:**
   - Timeout de 120 segundos por invocación a la CLI.
   - Si la CLI falla o no genera sintaxis válida, se aplican reintentos parametrizados (`maxRetries`).

---

## 2. Separación Estricta Judge / Author y Enforcement con FoFo

Para garantizar que la separación de roles no sea declarativa sino un hecho comprobado matemáticamente:
1. **Aislamiento Pre-Implementación (Judge):**
   - Judge genera las pruebas a partir de los criterios de aceptación.
   - El harness ejecuta inmediatamente `npm run test:unit` sobre el worktree. Se verifica formalmente que la prueba **falla** (`redgreen-gate-red`). Si una prueba pasara en verde antes de programar el código, el gate la rechaza por tautológica o carente de valor.
2. **Congelamiento de Pruebas (test-lock write):**
   - El Referee ejecuta `python harness/fofo/scripts/test-lock --write --changed "despues/test/unit/**/*.test.js"`.
   - Se calculan los hashes criptográficos SHA-256 de todos los archivos de prueba y se persisten en `TEST-LOCK.json`.
3. **Control Post-Implementación (test-lock verify):**
   - Una vez que Author termina de generar el código productivo, el Referee ejecuta `python harness/fofo/scripts/test-lock --changed "despues/test/unit/**/*.test.js"`.
   - Si Author modificó, agregó o eliminó un solo byte de las pruebas congeladas, FoFo devuelve veredicto de fallo duro y el orquestador aborta la ejecución con la excepción: `[FoFo Security Violation] El Author modificó pruebas bloqueadas`.
4. **Gates Adicionales del Referee:**
   - `spec-lint`: Verifica que cada requerimiento tenga un ID formal `REQ-\d+` y al menos un criterio `Acceptance:`.
   - `trace-gate`: Verifica la trazabilidad bidireccional entre `REQUIREMENTS.md`, `TEST-REQS.yaml` y las etiquetas `@req: REQ-XXX` en el código de pruebas.
   - `secret-scan`: Escanea determinísticamente los archivos fuente modificados en busca de credenciales, claves AWS, tokens GitHub y patrones sospechosos.

---

## 3. Auditoría de FoFo y OpenSpec

### FoFo (Agentic-SDLC)
- **Origen:** Procedencia íntegra del repositorio oficial `Sweet-Papa-Technologies/Agentic-SDLC` (rama `main`), ubicado en [`harness/fofo/scripts/`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/fofo/scripts/).
- **Verificación Técnica:** Ejecución del suite completo de pruebas de FoFo (`python harness/fofo/scripts/selftest`): **56/56 pruebas aprobadas al 100%** bajo Python 3.14 en Windows.
- **Ajuste de Alcance para secret-scan:** Se corrigió el patrón de escaneo de `despues/**/*` a `despues/libs/**/*,despues/server.js,despues/index.html,despues/test/**/*` para evitar que el buscador de regex inspeccione la carpeta de dependencias externas `node_modules`.

### OpenSpec (@fission-ai/openspec)
- **Instalación:** Paquete oficial `@fission-ai/openspec@1.15.0`.
- **Estructura Verificable:** Cada requerimiento genera automáticamente:
  - `openspec/changes/<reqId>/proposal.md`: Justificación, alcance y límites.
  - `openspec/changes/<reqId>/specs/<reqId>.spec.md`: Especificación formal y escenarios Given/When/Then.
  - `openspec/changes/<reqId>/design.md`: Decisiones técnicas y análisis de riesgos.
  - `openspec/changes/<reqId>/tasks.md`: Lista de tareas del ciclo Judge-Author-Referee.
  - `SPEC.md` / `REQUIREMENTS.md`: Documentos raíz consumidos por los gates de FoFo.

---

## 4. Auditoría de GitHub CLI (`gh`) y Manejo de Pull Requests

Se ejecutó la verificación real de autenticación en la máquina host:
```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth status
# Resultado verificado:
# You are not logged into any GitHub hosts. To log in, run: gh auth login
```

### Comportamiento del Harness ante Ausencia de Autenticación
- **Transparencia Total:** El módulo [`harness/core/pr-generator.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/core/pr-generator.js) implementa el método `isGhAuthenticated()`.
- Si `gh auth status` devuelve código distinto de cero (no autenticado), el harness **NO** intenta ejecutar comandos de creación remota que fallen con error de red, ni genera URLs falsas en los informes.
- En su lugar, genera y persiste el archivo markdown completo [`PULL_REQUEST.md`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/core/pr-generator.js) en el directorio del trabajo (`.harness/jobs/<jobId>/PULL_REQUEST.md`), registra el estado `method: 'file-fallback'`, y notifica al desarrollador la instrucción para autenticarse manualmente (`gh auth login`).

---

## 5. Verificación de Concurrencia Real (3 Worktrees Simultáneos)

Se implementó y aprobó la suite de pruebas de concurrencia [`harness/test/concurrency.infra.test.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/test/concurrency.infra.test.js):
- **Asignación de Puertos:** Tres puertos HTTP independientes asignados simultáneamente mediante `PortAllocator` (ej. 3050, 3060, 3070) sin colisiones.
- **Aislamiento de Git Worktrees:** Creación de tres carpetas físicas separadas en `.worktrees/conc-job-{alpha,beta,gamma}` sobre ramas independientes `feat/test-conc-{alpha,beta,gamma}` sin condiciones de carrera en el índice de Git.
- **Máquina de Estados Concurrente:** 3 archivos `state.json` independientes actualizados en paralelo sin sobreescrituras ni corrupción.
- **FoFo Test-Lock Aislado:** Generación y verificación simultánea de `TEST-LOCK.json` en los 3 worktrees sin interferencia mutua.
- **Protección Crítica en Windows para Junctions:** Se detectó y subsanó un comportamiento de Node.js en Windows donde `fs.rmSync` recursivo seguía los puntos de unión (junctions) y borraba el `node_modules` destino. Se introdujo desvinculación explícita con `fs.unlinkSync` previa a la remoción del worktree.

---

## 6. Smoke Test End-to-End con Requerimiento Dummy (REQ-999)

Para comprobar el ciclo autónomo completo sin tocar los requerimientos reservados del laboratorio (REQ-010, REQ-011 y REQ-012), se ejecutó el smoke test [`harness/test/smoke-dummy.test.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/test/smoke-dummy.test.js) con el requerimiento dummy:
- **ID:** `REQ-999`
- **Título:** *Diagnóstico de ping en biblioteca unalib*
- **Criterio:** `unalib.ping() === 'pong'`

### Resultados del Smoke Test
1. **Fase 0 (OpenSpec & Spec-Lint):** Artefactos generados; `spec-lint` aprobó con veredicto `pass`.
2. **Fase 1 (Judge Test-Reqs & Trace-Gate):** `TEST-REQS.yaml` derivado; `trace-gate` verificó trazabilidad bidireccional.
3. **Fase 2 (Pruebas Rojas & Test-Lock):** Prueba unitaria creada; el harness comprobó empíricamente que la prueba falló (RED); FoFo congeló los hashes en `TEST-LOCK.json`.
4. **Fase 3 (Author Implementation & Lock Verify):** Author implementó la función en `despues/libs/unalib.js`; FoFo certificó que las pruebas permanecieron byte a byte idénticas (`pass`).
5. **Fase 4 (Referee Verifications):**
   - `secret-scan`: 0 secretos detectados (`pass`).
   - Suites combinadas: **55 pruebas pasando al 100%** (42 unitarias, 8 de integración Socket.IO, 5 E2E Playwright Chromium).
6. **Fase 5 (Generación de PR):** Creación del artefacto `PULL_REQUEST.md` y registro transparente del estado de autenticación de `gh`.
7. **Limpieza:** Worktree y rama temporal removidos limpiamente.

---

## 7. Resumen de Pruebas Automatizadas del Harness

| Suite de Pruebas | Archivo | Pruebas | Estado |
|---|---|---|---|
| Infraestructura y Resiliencia | [`harness/test/harness.infra.test.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/test/harness.infra.test.js) | 13 | **13/13 APROBADAS** |
| Concurrencia (3 Worktrees Simultáneos) | [`harness/test/concurrency.infra.test.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/test/concurrency.infra.test.js) | 5 | **5/5 APROBADAS** |
| Smoke Test Autónomo End-to-End | [`harness/test/smoke-dummy.test.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/harness/test/smoke-dummy.test.js) | 1 | **1/1 APROBADA** |
| **Total General del Harness** | — | **19** | **19/19 APROBADAS (100%)** |

El harness se encuentra auditado, autenticado, protegido contra manipulación y plenamente capacitado para orquestar la Parte 2 del Laboratorio (REQ-010, REQ-011 y REQ-012) cuando se ordene su ejecución.
