# Matriz de Requisitos — Laboratorio 5

**Curso:** Paradigmas de Programación  
**Institución:** Universidad Nacional (UNA) — Sede Regional Chorotega, Campus Nicoya  
**Año:** 2026  
**Proyecto:** UNA Chat — Seguridad Informática y Testing Automatizado  

---

## 1. Resumen Ejecutivo de Requisitos

El Laboratorio 5 aborda la remediación de vulnerabilidades de inyección de scripts (XSS), la integración de contenido multimedia (imágenes y videos) y la implementación de una estrategia rigurosa de aseguramiento de calidad de software mediante tres suites de pruebas automatizadas (Unitarias, Integración y End-to-End), complementadas con escaneo de seguridad en dependencias y un flujo de trabajo agéntico (OpenSpec + FoFo) para la implementación de tres requerimientos funcionales autónomos en worktrees concurrentes.

---

## 2. Requisitos de la Parte 1: Aplicación, Seguridad y Testing (Completada y Validada)

| ID | Categoría | Requisito | Descripción | Criterio de Aceptación | Estado |
|---|---|---|---|---|---|
| **REQ-001** | Entorno | Ejecución del Proyecto Original | Levantar el servidor backend Node.js/Express y servir el frontend del chat por el puerto 3000. | Conexión WebSocket y HTTP operativa sin errores fatales de inicio. | **Completado (Fase 1)** |
| **REQ-002** | Seguridad | Reproducción de Script Injection (XSS) | Demostrar la vulnerabilidad XSS inyectando el payload oficial `<script>alert('Inyección de script');</script>` y variantes. | Verificación de ejecución de JavaScript en el contexto del navegador. | **Completado (Fase 1)** |
| **REQ-003** | Evidencia | Evidencia 1 (XSS) | Capturar y documentar la evidencia fotográfica de la ejecución del script inyectado en el chat. | Imagen real almacenada en `docs/evidence/evidencia1.png`. | **Completado (Fase 1)** |
| **REQ-004** | Funcionalidad | Visualización de URLs de Imágenes | Detectar automáticamente si un mensaje contiene una URL de imagen válida (HTTP/HTTPS) y renderizar la etiqueta `<img>` con dimensiones máximas (400x400px). | Creación segura en DOM; rechazo de esquemas no web (`javascript:`, `data:`). | **Completado (Fase 2)** |
| **REQ-005** | Funcionalidad | Visualización de URLs de Videos | Detectar URLs válidas de YouTube (watch, share, embed), validar de forma estricta el ID de video e incrustar reproductor `<iframe>`. | Creación segura en DOM con atributos estrictos; rechazo de IDs adulterados. | **Completado (Fase 2)** |
| **REQ-006** | Seguridad | Saneamiento y Validación Segura | Corregir `validateMessage` en `despues/libs/unalib.js` y el frontend `despues/index.html`. No usar `.html()` ni `innerHTML` con entradas del usuario; usar `textContent`/`.text()`. Validar `nombre`, `color` y `mensaje`. | Eliminación de ejecución de scripts, atributos HTML peligrosos y rechazo de payloads sin devolver código ejecutable. | **Completado (Fase 2)** |
| **REQ-007** | Calidad | Pruebas Unitarias (`una-lib`) | Suite unitaria completa: mensajes normales, URLs de imágenes y videos válidas/inválidas, scripts maliciosos, atributos peligrosos, protocolos inseguros, JSON malformado, tipos de datos inesperados y pruebas originales. | 41 pruebas unitarias aprobadas. | **Completado (Fase 2)** |
| **REQ-008** | Evidencia | Evidencia 2 (Pruebas Unitarias) | Captura de pantalla real de la terminal mostrando la ejecución exitosa de la suite unitaria. | Imagen guardada en `docs/evidence/evidencia-2.png`. | **Completado (Fase 2)** |
| **REQ-009** | Calidad | Pruebas de Integración (Socket.IO) | Verificar la colaboración entre backend y `una-lib` utilizando `socket.io-client` sobre el evento real `'Evento-Mensaje-Server'`. | 8 pruebas de integración Socket.IO aprobadas. | **Completado (Fase 2)** |
| **REQ-009-EV**| Evidencia | Evidencia 3 (Pruebas de Integración) | Captura de pantalla real de la suite de integración aprobada en consola. | Imagen guardada en `docs/evidence/evidencia-3.png`. | **Completado (Fase 2)** |
| **REQ-E2E** | Calidad | Pruebas End-to-End (Playwright) | Automatizar flujo real con Chromium: imagen real, reproductor de video válido, envío de script malicioso sin ejecución (registrando `page.on('dialog')` antes del envío) y ausencia de errores JS. | 5 pruebas E2E aprobadas en Chromium. | **Completado (Fase 2)** |
| **REQ-E2E-EV**| Evidencia | Evidencia 4 (Pruebas E2E Playwright) | Captura de pantalla real de la ejecución aprobada de Playwright. | Imagen guardada en `docs/evidence/evidencia-4.png`. | **Completado (Fase 2)** |
| **REQ-SNYK**| Seguridad | Análisis y Mitigación de Vulnerabilidades | Escaneo con Snyk (`snyk test`) y auditoría de paquetes. Remediación de vulnerabilidades críticas y altas remediables. | 0 vulnerabilidades detectadas (`docs/evidence/evidencia-snyk.png`). | **Completado (Fase 2)** |

---

## 3. Requisitos de la Parte 2: Harness Autónomo y Git Worktrees (Fase 3)

> [!IMPORTANT]
> Los tres requerimientos funcionales siguientes están formalmente definidos en el catálogo del harness (`harness/specs/`) y están **reservados para su ejecución autónoma por los agentes**. El harness está preparado para que Judge derive pruebas (unitarias, Socket.IO y Playwright E2E) y Author implemente las soluciones en frontend (`despues/index.html`) y backend (`despues/libs/unalib.js`, `despues/server.js`) de forma concurrente sobre worktrees aislados.

### Especificaciones Oficiales del Harness

| ID | Requisito Funcional | Criterio de Aceptación Literal del PDF | Archivos Productivos Autorizados |
|---|---|---|---|
| **REQ-010** | **Impedir mensajes vacíos o solo espacios** | `WHEN a visitor activates Send with an empty or whitespace-only message THEN the system SHALL NOT add a message to the transcript, SHALL keep the message field empty, and SHALL tell the visitor to write something.` | `despues/libs/unalib.js`<br>`despues/server.js`<br>`despues/index.html` |
| **REQ-011** | **Exigir nombre de usuario válido no vacío** | `WHEN a visitor activates Send with an empty or whitespace-only username and a real message THEN the system SHALL NOT add a message to the transcript, SHALL keep the username field empty, and SHALL tell the visitor to write a name.` | `despues/libs/unalib.js`<br>`despues/server.js`<br>`despues/index.html` |
| **REQ-012** | **Limitar los mensajes a 280 caracteres** | `WHEN a visitor activates Send with a message longer than 280 characters THEN the system SHALL NOT add that message to the transcript, SHALL keep the message text in the field, and SHALL tell the visitor the message is too long.` | `despues/libs/unalib.js`<br>`despues/server.js`<br>`despues/index.html` |

---

## 4. Ejecución del Harness Autónomo

El harness cuenta con un cargador estricto de especificaciones (`harness/core/spec-loader.js`) que prohíbe la ejecución de requerimientos desconocidos o con criterios genéricos inventados.

### Comando para Ejecución Concurrente de los Tres Requerimientos:

```bash
node harness/cli.js batch REQ-010 REQ-011 REQ-012
```

Este comando:
1. Carga las especificaciones formales completas desde `harness/specs/req-010.json`, `harness/specs/req-011.json` y `harness/specs/req-012.json`.
2. Asigna tres puertos HTTP únicos (ej: 3001, 3002, 3003).
3. Crea tres Git worktrees independientes en ramas dedicadas (`feat/req-010`, `feat/req-011`, `feat/req-012`).
4. Coordina la separación estricta entre el agente **Judge** (generación y congelación de pruebas con FoFo `test-lock`) y el agente **Author** (implementación en frontend y backend sin alterar pruebas bloqueadas).
5. Publica de forma segura en `origin` y gestiona la confirmación de Pull Requests en GitHub.
