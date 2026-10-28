# Matriz de Requisitos — Laboratorio 5

**Curso:** Paradigmas de Programación  
**Institución:** Universidad Nacional (UNA) — Sede Regional Chorotega, Campus Nicoya  
**Año:** 2026  
**Proyecto:** UNA Chat — Seguridad Informática y Testing Automatizado  

---

## 1. Resumen Ejecutivo de Requisitos

El Laboratorio 5 aborda la remediación de vulnerabilidades de inyección de scripts (XSS), la integración de contenido multimedia (imágenes y videos) y la implementación de una estrategia rigurosa de calidad y aseguramiento de software mediante tres suites de pruebas automatizadas (Unitarias, Integración y End-to-End), complementadas con escaneo de seguridad en dependencias y un flujo de trabajo ágil y agéntico (OpenSpec + FoFo).

---

## 2. Requisitos de la Parte 1: Aplicación y Testing

| ID | Categoría | Requisito | Descripción | Criterio de Aceptación | Estado |
|---|---|---|---|---|---|
| **REQ-001** | Entorno | Ejecución del Proyecto Original | Levantar el servidor backend Node.js/Express y servir el frontend del chat por el puerto 3000. | Conexión WebSocket y HTTP operativa sin errores fatales de inicio. | **Completado (Fase 1)** |
| **REQ-002** | Seguridad | Reproducción de Script Injection (XSS) | Demostrar la vulnerabilidad XSS inyectando el payload oficial `<script>alert('Inyección de script');</script>` y variantes. | Verificación de ejecución de JavaScript en el contexto del navegador. | **Completado (Fase 1)** |
| **REQ-003** | Evidencia | Evidencia 1 (XSS) | Capturar y documentar la evidencia fotográfica de la ejecución del script inyectado en el chat. | Imagen real almacenada en `docs/evidence/evidencia-1.png` y `.jpg`. | **Completado (Fase 1)** |
| **REQ-004** | Funcionalidad | Visualización de URLs de Imágenes | Detectar automáticamente si un mensaje contiene una URL de imagen válida y renderizar la etiqueta `<img>`. | La imagen se visualiza directamente en el chat con dimensiones máximas controladas (400x400px). | Pendiente (Fase 2) |
| **REQ-005** | Funcionalidad | Visualización de URLs de Videos | Detectar URLs válidas de YouTube (watch, share, embed), extraer el Video ID e incrustar reproductor `<iframe>`. | El reproductor de YouTube se renderiza de forma embebida en el chat y permite reproducir el contenido. | Pendiente (Fase 2) |
| **REQ-006** | Seguridad | Saneamiento y Validación en `una-lib` | Refactorizar `validarMensaje` para eliminar/escapar código malicioso y corregir errores de sintaxis (`phone is not defined`). | Todo texto plano es sanitizado (escapado de `<>&"'`); URLs de imagen/video válidas se estructuran de forma segura. | Pendiente (Fase 2) |
| **REQ-007** | Calidad | Pruebas Unitarias (`una-lib`) | Diseñar y ejecutar suite de pruebas unitarias cubriendo validación de imágenes, videos y bloqueo/sanitización de XSS. | 100% de las pruebas unitarias pasan sin errores. Mantenimiento de pruebas previas corregidas. | Pendiente (Fase 2) |
| **REQ-008** | Evidencia | Evidencia 2 (Pruebas Unitarias) | Captura de pantalla de la terminal mostrando la ejecución exitosa de la suite unitaria. | Imagen guardada en `docs/evidence/evidencia-2.jpg`. | Pendiente (Fase 2) |
| **REQ-009** | Calidad | Pruebas de Integración (Socket.IO/HTTP) | Verificar mediante Jest y `socket.io-client` que el backend colabora con `una-lib` procesando eventos de chat. | Pruebas para: imagen válida, video válido, y script rechazado/sanitizado. Cierre limpio de sockets. | Pendiente (Fase 2) |
| **REQ-010** | Evidencia | Evidencia 3 (Pruebas de Integración) | Captura de pantalla de la suite de integración aprobada en consola. | Imagen guardada en `docs/evidence/evidencia-3.jpg`. | Pendiente (Fase 2) |
| **REQ-011** | Calidad | Pruebas End-to-End (Playwright) | Automatizar con Playwright casos reales de usuario: carga de imagen, reproductor de video y verificación de que el alert XSS no se dispara. | Pruebas E2E ejecutadas en Chromium, validando estado del DOM y ausencia de eventos `dialog`. | Pendiente (Fase 2) |
| **REQ-012** | Evidencia | Evidencia 4 (Pruebas E2E Playwright) | Captura de pantalla del reporte o terminal con las pruebas Playwright aprobadas. | Imagen guardada en `docs/evidence/evidencia-4.jpg`. | Pendiente (Fase 2) |
| **REQ-013** | Seguridad | Análisis de Dependencias (Snyk / npm audit) | Escanear las dependencias en busca de CVEs conocidos y actualizar paquetes vulnerables. | Reparar vulnerabilidades críticas y altas reportadas por Snyk o npm audit sin romper la app. | Pendiente (Fase 2) |
| **REQ-014** | Entrega | Integridad de Entrega y `repositorio.txt` | Conservar `antes/` intacto, alojar cambios en `despues/`, aislar suites de pruebas y generar enlace de entrega. | Cumplimiento estricto de lineamientos de evaluación académica. | En curso |

---

## 3. Requisitos de la Parte 2: Harness Autónomo y Flujo Agéntico

| ID | Componente | Requisito | Propósito Técnico | Estado |
|---|---|---|---|---|
| **REQ-015** | OpenSpec | Formalización de Cambios | Definir propuestas, especificaciones delta, escenarios de prueba y tareas trazables antes de codificar. | Planificación estructurada en `docs/` y especificaciones formales. | **Completado (Fase 1)** |
| **REQ-016** | FoFo (Judge vs Author) | Filosofía de Pruebas Previas | Implementar la lógica bajo TDD: diseñar pruebas que fallen (Red) basadas en el contrato antes de escribir la solución (Green). | Garantizar que las pruebas evalúan el comportamiento real y no falsos positivos. | Planificado |
| **REQ-017** | Git Worktrees | Paralelización Modular | Utilizar ramas y worktrees independientes de Git para implementar de manera aislada: (1) Unit tests + sanitización, (2) Integración Socket.IO, (3) E2E Playwright. | Evitar colisiones de dependencias y merge conflicts durante el desarrollo. | Planificado |
| **REQ-018** | Pull Requests | Trazabilidad y Atomicidad | Preparar 3 Pull Requests atómicos dirigidos a la rama principal/base para revisión de pares e integración continua. | Revisión limpia, modular e incremental del laboratorio. | Planificado |

---

## 4. Matriz de Trazabilidad entre Requisitos y Evidencias

| Requisito Original | Artefacto de Prueba / Verificación | Evidencia Requerida | Ubicación |
|---|---|---|---|
| **REQ-002 / REQ-003** | Script Playwright `test_xss.js` en navegador real | Evidencia 1 (JPG/PNG) | `docs/evidence/evidencia-1.png` |
| **REQ-006 / REQ-007 / REQ-008** | Suite Jest / Mocha de pruebas unitarias | Evidencia 2 (JPG) | `docs/evidence/evidencia-2.jpg` (Fase 2) |
| **REQ-009 / REQ-010** | Suite de integración Jest con `socket.io-client` | Evidencia 3 (JPG) | `docs/evidence/evidencia-3.jpg` (Fase 2) |
| **REQ-011 / REQ-012** | Suite E2E Playwright en Chromium | Evidencia 4 (JPG) | `docs/evidence/evidencia-4.jpg` (Fase 2) |
| **REQ-014** | Archivo de enlace y documentación | Archivo plano | `repositorio.txt` (Entrega) |
