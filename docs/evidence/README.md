# Registro de Evidencias de Pruebas y Seguridad — UNA Chat

**Curso:** Paradigmas de Programación  
**Institución:** Universidad Nacional (UNA)  
**Laboratorio:** Laboratorio 5 — Seguridad Informática y Testing Automatizado  

---

## 1. Índice de Evidencias Oficiales

Según lo establecido en el documento oficial `Lab_5_Paradigmas_2026.pdf` (Página 10), se requiere la entrega de cuatro evidencias visuales correspondientes a cada etapa del ciclo de pruebas y aseguramiento de calidad:

| Evidencia | Descripción Oficial | Archivo en Repositorio | Estado |
|---|---|---|---|
| **Evidencia 1** | Resultado de la prueba de inyección de scripts del paso 2 | [`evidencia-1.png`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-1.png) / [`evidencia-1.jpg`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-1.jpg) | **COMPLETADA (Fase 1)** |
| **Evidencia 2** | Ejecución de las pruebas unitarias del paso 8 | [`evidencia-2.jpg`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-2.jpg) | **COMPLETADA (Fase 2)** |
| **Evidencia 3** | Ejecución de las pruebas de integración del paso 9 | [`evidencia-3.jpg`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-3.jpg) | **COMPLETADA (Fase 2)** |
| **Evidencia 4** | Ejecución de las pruebas End-to-End con Playwright del paso 10 | [`evidencia-4.jpg`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-4.jpg) | **COMPLETADA (Fase 2)** |

---

## 2. Detalle y Reproducción de la Evidencia 1 (Script Injection XSS)

### 2.1. Descripción de la Evidencia
Demuestra que la aplicación original (`antes/`) permite la inyección y ejecución no autorizada de JavaScript en el navegador al recibir mensajes manipulados a través de Socket.IO.

### 2.2. Payloads Ejecutados
1. **Payload Oficial:** `<script>alert('Inyección de script');</script>` (ejecutado vía `jQuery.globalEval`).
2. **Payload Alternativo:** `<img src="x" onerror="alert('XSS Vulnerability Confirmed!')">` (ejecutado por evento `onerror`).

### 2.3. Reproducción
```bash
npm --prefix antes start
```
Abrir `http://localhost:3000`, ingresar el payload en el mensaje y verificar la ventana modal de alerta.

---

## 3. Detalle y Reproducción de la Evidencia 2 (Pruebas Unitarias)

### 3.1. Descripción de la Evidencia
Muestra la ejecución exitosa de la suite de pruebas unitarias sobre [`despues/libs/unalib.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/libs/unalib.js).
- **Total de pruebas ejecutadas:** 41 pruebas.
- **Aprobadas:** 41 (100%).
- **Fallidas:** 0.

### 3.2. Alcance de las Pruebas Unitarias
1. **Compatibilidad:** Pruebas originales de `is_valid_phone` y validadores corregidos.
2. **URLs de Imágenes:** Detección de `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`; rechazo de protocolos peligrosos (`javascript:`, `data:`), extensiones ejecutables e inyección de comillas.
3. **URLs de YouTube:** Detección de formatos estándar, `youtu.be`, `embed`; validación estricta del ID de 11 caracteres y rechazo de dominios maliciosos.
4. **Manejo de Errores y JSON:** Soporte robusto ante `null`, `undefined`, tipos no string y cadenas no-JSON.
5. **Sanitización XSS:** Neutralización de `<script>`, manejadores de eventos (`onerror`, `onload`), etiquetas SVG, IFRAME y atributos CSS inyectados en `color` y `nombre`.
6. **Contenido Legítimo:** Preservación de formato y estructuración segura de objetos multimedia.

### 3.3. Comando de Reproducción
```bash
npm --prefix despues run test:unit
```
Archivo generado: [`docs/evidence/evidencia-2.jpg`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-2.jpg).

---

## 4. Detalle y Reproducción de la Evidencia 3 (Pruebas de Integración Socket.IO)

### 4.1. Descripción de la Evidencia
Muestra la ejecución exitosa de las pruebas de integración en [`despues/test/integration/chat.integration.test.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/test/integration/chat.integration.test.js) utilizando `socket.io-client` contra el servidor real de Express y Socket.IO en un puerto dinámico.
- **Total de pruebas ejecutadas:** 8 pruebas.
- **Aprobadas:** 8 (100%).
- **Fallidas:** 0.

### 4.2. Casos de Integración Verificados
1. Recepción y retransmisión de mensaje de texto normal validado.
2. Validación mediante UNA Lib y aceptación de imagen legítima.
3. Validación mediante UNA Lib y aceptación de video de YouTube legítimo.
4. Neutralización en tiempo real de inyección XSS con `<script>`.
5. Neutralización en tiempo real de manejadores de eventos (`onerror`).
6. Rechazo y depuración de protocolos no seguros (`javascript:`).
7. Manejo tolerante a fallas de payloads JSON corruptos sin caída del servidor.
8. Retransmisión bidireccional limpia entre múltiples sockets conectados simultáneamente.
9. Cierre limpio y sin fugas de sockets y del servidor HTTP al finalizar.

### 4.3. Comando de Reproducción
```bash
npm --prefix despues run test:integration
```
Archivo generado: [`docs/evidence/evidencia-3.jpg`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-3.jpg).

---

## 5. Detalle y Reproducción de la Evidencia 4 (Pruebas E2E con Playwright)

### 5.1. Descripción de la Evidencia
Muestra el reporte oficial de Playwright tras la ejecución de las pruebas End-to-End en Chromium en [`despues/test/e2e/chat.spec.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/test/e2e/chat.spec.js).
- **Total de pruebas E2E ejecutadas:** 5 pruebas.
- **Aprobadas:** 5 (100%).
- **Fallidas:** 0.

### 5.2. Escenarios E2E Automatizados
1. **Comunicación real:** Envío mediante formulario web y renderizado en `#messages`.
2. **Carga real de imagen:** Verificación de creación del elemento `img.chat-media`, atributo `src` seguro y carga completa en el motor (`img.complete && img.naturalWidth > 0`).
3. **Reproductor de video:** Verificación de incrustación de `iframe.chat-media` con la URL segura de YouTube (`https://www.youtube.com/embed/qYwlqx-JLok`).
4. **Prevención XSS (<script>):** Registro preventivo de listener `page.on('dialog')` antes del envío. Certificación de que ningún alert modal se disparó y verificación de que el script no existe como nodo activo en el DOM.
5. **Prevención XSS (onerror):** Registro de listener `page.on('dialog')` y comprobación de que imágenes con atributos maliciosos son mostradas como texto plano sin ejecutar JavaScript.

### 5.3. Comando de Reproducción
```bash
npm --prefix despues run test:e2e
```
Para consultar el reporte interactivo en el navegador:
```bash
cd despues && npx playwright show-report
```
Archivo generado: [`docs/evidence/evidencia-4.jpg`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-4.jpg).
