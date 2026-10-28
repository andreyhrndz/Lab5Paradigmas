# Matriz de Requisitos — Laboratorio 5

**Curso:** Paradigmas de Programación  
**Institución:** Universidad Nacional (UNA) — Sede Regional Chorotega, Campus Nicoya  
**Año:** 2026  
**Proyecto:** UNA Chat — Seguridad Informática y Testing Automatizado  

---

## 1. Resumen Ejecutivo de Requisitos

El Laboratorio 5 aborda la remediación de vulnerabilidades de inyección de scripts (XSS), la integración de contenido multimedia (imágenes y videos) y la implementación de una estrategia rigurosa de aseguramiento de calidad de software mediante tres suites de pruebas automatizadas (Unitarias, Integración y End-to-End), complementadas con escaneo de seguridad en dependencias y un flujo de trabajo agéntico (OpenSpec + FoFo) para la implementación de tres requerimientos funcionales autónomos.

---

## 2. Requisitos de la Parte 1: Aplicación, Seguridad y Testing (Fase 2)

| ID | Categoría | Requisito | Descripción | Criterio de Aceptación | Estado |
|---|---|---|---|---|---|
| **REQ-001** | Entorno | Ejecución del Proyecto Original | Levantar el servidor backend Node.js/Express y servir el frontend del chat por el puerto 3000. | Conexión WebSocket y HTTP operativa sin errores fatales de inicio. | **Completado (Fase 1)** |
| **REQ-002** | Seguridad | Reproducción de Script Injection (XSS) | Demostrar la vulnerabilidad XSS inyectando el payload oficial `<script>alert('Inyección de script');</script>` y variantes. | Verificación de ejecución de JavaScript en el contexto del navegador. | **Completado (Fase 1)** |
| **REQ-003** | Evidencia | Evidencia 1 (XSS) | Capturar y documentar la evidencia fotográfica de la ejecución del script inyectado en el chat. | Imagen real almacenada en `docs/evidence/evidencia-1.png` y `.jpg`. | **Completado (Fase 1)** |
| **REQ-004** | Funcionalidad | Visualización de URLs de Imágenes | Detectar automáticamente si un mensaje contiene una URL de imagen válida (HTTP/HTTPS) y renderizar la etiqueta `<img>` con dimensiones máximas (400x400px). | Creación segura en DOM; rechazo de esquemas no web (`javascript:`, `data:`). | En desarrollo (Fase 2) |
| **REQ-005** | Funcionalidad | Visualización de URLs de Videos | Detectar URLs válidas de YouTube (watch, share, embed), validar de forma estricta el ID de video e incrustar reproductor `<iframe>`. | Creación segura en DOM con atributos estrictos; rechazo de IDs adulterados. | En desarrollo (Fase 2) |
| **REQ-006** | Seguridad | Saneamiento y Validación Segura | Corregir `validateMessage` en `despues/libs/unalib.js` y el frontend `despues/index.html`. No usar `.html()` ni `innerHTML` con entradas del usuario; usar `textContent`/`.text()`. Validar `nombre`, `color` y `mensaje`. | Eliminación de ejecución de scripts, atributos HTML peligrosos y rechazo de payloads sin devolver código ejecutable. | En desarrollo (Fase 2) |
| **REQ-007** | Calidad | Pruebas Unitarias (`una-lib`) | Suite unitaria completa: mensajes normales, URLs de imágenes y videos válidas/inválidas, scripts maliciosos, atributos peligrosos, protocolos inseguros, JSON malformado, tipos de datos inesperados y pruebas originales. | 100% de pruebas aprobadas ejecutadas de forma real. | En desarrollo (Fase 2) |
| **REQ-008** | Evidencia | Evidencia 2 (Pruebas Unitarias) | Captura de pantalla en formato JPG de la terminal mostrando la ejecución exitosa de la suite unitaria. | Imagen guardada en `docs/evidence/evidencia-2.jpg`. | En desarrollo (Fase 2) |
| **REQ-009** | Calidad | Pruebas de Integración (Socket.IO) | Verificar la colaboración entre backend y `una-lib` utilizando `socket.io-client` sobre el evento real `'Evento-Mensaje-Server'`. | Probar recepción, validación, multimedia, rechazo/sanitización, retransmisión segura y cierre limpio de conexiones. | En desarrollo (Fase 2) |
| **REQ-009-EV**| Evidencia | Evidencia 3 (Pruebas de Integración) | Captura de pantalla en formato JPG de la suite de integración aprobada en consola. | Imagen guardada en `docs/evidence/evidencia-3.jpg`. | En desarrollo (Fase 2) |
| **REQ-E2E** | Calidad | Pruebas End-to-End (Playwright) | Automatizar flujo real con Chromium: imagen real, reproductor de video válido, envío de script malicioso sin ejecución (registrando `page.on('dialog')` antes del envío) y ausencia de errores JS. | Suite E2E aprobada; reporte generado. | En desarrollo (Fase 2) |
| **REQ-E2E-EV**| Evidencia | Evidencia 4 (Pruebas E2E Playwright) | Captura de pantalla en formato JPG de la ejecución aprobada de Playwright. | Imagen guardada en `docs/evidence/evidencia-4.jpg`. | En desarrollo (Fase 2) |
| **REQ-SNYK**| Seguridad | Análisis y Mitigación de Vulnerabilidades | Escaneo con Snyk (`snyk test`) y auditoría de paquetes. Remediación de vulnerabilidades críticas y altas remediables actualizando el lockfile sin forzar fallas. | Reporte documentado y suites re-ejecutadas tras actualizaciones. | En desarrollo (Fase 2) |

---

## 3. Requisitos de la Parte 2: Harness Autónomo y Git Worktrees (Fase 3 — Reservados)

> [!IMPORTANT]
> Los tres requerimientos siguientes están estrictamente **reservados para la Fase 3**. NO deben implementarse anticipadamente en la Fase 2, para que el harness agéntico demuestre su capacidad de implementarlos de manera 100% autónoma en worktrees y Pull Requests independientes.

| ID | Requisito Funcional del Harness | Descripción y Criterio de Aceptación | Asignación en Harness (Fase 3) |
|---|---|---|---|
| **REQ-010** | **Impedir mensajes vacíos** | El chat no debe permitir enviar ni retransmitir mensajes cuyo contenido esté vacío o compuesto únicamente por espacios en blanco. | Rama / Worktree `feat/req-010-prevent-empty-messages` -> PR #1 |
| **REQ-011** | **Exigir nombre de usuario** | El sistema debe rechazar o requerir obligatoriamente un nombre de usuario válido no vacío para poder participar en el chat, sin asignar anónimos por defecto ni aceptar cadenas en blanco. | Rama / Worktree `feat/req-011-require-username` -> PR #2 |
| **REQ-012** | **Limitar los mensajes a 280 caracteres** | El chat debe validar y limitar la longitud máxima de cualquier mensaje a 280 caracteres, rechazando o truncando de forma controlada excesos. | Rama / Worktree `feat/req-012-limit-message-length` -> PR #3 |

---

## 4. Matriz de Trazabilidad entre Requisitos y Evidencias

| Requisito | Artefacto de Verificación | Evidencia Requerida | Ubicación |
|---|---|---|---|
| **REQ-002 / REQ-003** | Script Playwright en Chromium real | Evidencia 1 (JPG/PNG) | `docs/evidence/evidencia-1.jpg` (Fase 1) |
| **REQ-007 / REQ-008** | Suite de pruebas unitarias | Evidencia 2 (JPG) | `docs/evidence/evidencia-2.jpg` (Fase 2) |
| **REQ-009 / REQ-009-EV**| Suite de integración Socket.IO | Evidencia 3 (JPG) | `docs/evidence/evidencia-3.jpg` (Fase 2) |
| **REQ-E2E / REQ-E2E-EV**| Suite E2E Playwright en Chromium | Evidencia 4 (JPG) | `docs/evidence/evidencia-4.jpg` (Fase 2) |
| **REQ-010, REQ-011, REQ-012** | Harness autónomo (OpenSpec + FoFo) | 3 Worktrees + 3 PRs | Fase 3 |
