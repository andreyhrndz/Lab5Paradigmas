# Hallazgos de Seguridad y Vulnerabilidades Confirmadas — UNA Chat

**Proyecto:** Laboratorio 5 — Paradigmas de Programación (UNA 2026)  
**Clasificación de Severidad:** OWASP / CVSS v3.1  
**Fecha de Auditoría:** 28 de octubre de 2026  

---

## 1. Resumen de Vulnerabilidades Confirmadas

| ID | Vulnerabilidad | Clasificación OWASP / CWE | Severidad | Estado |
|---|---|---|---|---|
| **SEC-001** | Cross-Site Scripting (XSS) Almacenado / Reflejado vía WebSockets | OWASP Top 10 A03:2021 – Injection / CWE-79 | **CRÍTICA** (CVSS 8.2) | **Confirmada y Reproducida** |
| **SEC-002** | Inyección de HTML y Atributos de Estilo en `nombre` y `color` | CWE-80 (Improper Neutralization of Script-Related HTML Tags in a Web Page) | **MEDIA** (CVSS 5.3) | **Confirmada** |
| **SEC-003** | Denegación de Servicio Lógica / Excepción no Controlada por `ReferenceError` | CWE-391 (Unchecked Error Condition) | **MEDIA** (CVSS 5.0) | **Confirmada** |
| **SEC-004** | Dependencias Desactualizadas con Vulnerabilidades Conocidas (CVEs) | OWASP Top 10 A06:2021 – Vulnerable and Outdated Components / CWE-1104 | **ALTA** (CVSS 7.5) | **Confirmada (22 alertas npm audit)** |
| **SEC-005** | Ausencia de Cabeceras de Seguridad HTTP (Content Security Policy) | OWASP Top 10 A05:2021 – Security Misconfiguration | **MEDIA** (CVSS 4.7) | **Confirmada** |

---

## 2. Análisis Detallado del Hallazgo SEC-001: Cross-Site Scripting (XSS)

### 2.1. Descripción de la Amenaza
La aplicación permite que cualquier usuario conectado envíe un mensaje a través del formulario del chat. Dicho mensaje es recibido por el servidor Node.js mediante Socket.IO (`Evento-Mensaje-Server`), transmitido a la función `validation.validateMessage()`, y retransmitido íntegramente a todos los clientes conectados sin ningún tipo de saneamiento ni escape de caracteres HTML.

En el frontend, el cliente concatena el contenido del mensaje recibido dentro de una cadena HTML y la inserta en el DOM mediante:
```javascript
// antes/index.html - Línea 67
$('#messages').append($('<li>').html(mensajeDisplay));
```

### 2.2. Reproducción Controlada del Payload Oficial del PDF
Se envió el payload especificado en el documento oficial:
```html
<script>alert('Inyección de script');</script>
```

#### Comportamiento Observado y Causa Técnica Profunda
1. **Ejecución de JavaScript:** La llamada `alert('Inyección de script')` **se ejecutó efectivamente en el navegador**, disparando el diálogo modal nativo.
2. **¿Por qué se ejecutó la etiqueta `<script>`?:**
   - En JavaScript nativo estándar (HTML5), la asignación directa a `element.innerHTML = "<script>...</script>"` desactiva la ejecución de scripts por especificación del W3C (el elemento queda inerte en el DOM). Muchos desarrolladores novatos se confunden al ver el texto en el DOM creyendo que se ejecuta.
   - **Sin embargo, en este proyecto se utiliza jQuery 1.11.1.** El método `$('<li>').html(...)` y `.append(...)` de jQuery incluye un procesamiento interno que extrae explícitamente cualquier etiqueta `<script>` y la evalúa dinámicamente mediante `jQuery.globalEval(code)`.
   - Por esta razón, el payload clásico `<script>` sí logró ejecución arbitraria inmediata en el contexto del cliente.

### 2.3. Reproducción con Payload Alternativo Inocuo (Vector de Atributo de Evento)
Para validar la vulnerabilidad ante vectores que no dependan del comportamiento de jQuery, se ejecutó un payload estándar basado en eventos de carga fallida de recursos:
```html
<img src="x" onerror="alert('XSS Vulnerability Confirmed!')">
```

#### Comportamiento Observado:
- El navegador intentó resolver la ruta inválida `http://localhost:3000/x`, produciendo un error HTTP 404.
- Inmediatamente se disparó el controlador de evento `onerror`.
- Se ejecutó el diálogo de alerta `alert('XSS Vulnerability Confirmed!')`.

### 2.4. Registro del Monitor de Diálogos en Playwright
Durante la prueba automatizada con Chromium real en `test_xss.js`, el listener `page.on('dialog')` interceptó y registró los siguientes eventos de ejecución:

```json
[
  {
    "type": "alert",
    "message": "Inyección de script",
    "timestamp": "2026-10-28T19:40:21.776Z"
  },
  {
    "type": "alert",
    "message": "XSS Vulnerability Confirmed!",
    "timestamp": "2026-10-28T19:40:23.894Z"
  }
]
```

### 2.5. Evidencia Generada
La captura de pantalla oficial del navegador mostrando la inyección en el historial del chat ha sido guardada en:
- `docs/evidence/evidencia-1.png`
- `docs/evidence/evidencia-1.jpg`

---

## 3. Análisis del Hallazgo SEC-002: Inyección de Atributos y HTML en `nombre` y `color`

### 3.1. Vector de Ataque
En `index.html`:
```javascript
var mensajeDisplay = "<b style='color:"+ msgJson.color +"'>" + msgJson.nombre + "</b>: " + msgJson.mensaje;
```
Ni el campo `nombre` ni el campo `color` son sanitizados en el cliente ni en el servidor.
Un atacante puede enviar:
- `nombre`: `</b><script>alert('XSS en nombre')</script><b>`
- `color`: `red; display:none;` o `' onclick='alert(1)`

Esto permite romper la estructura del árbol DOM y ejecutar código arbitrario incluso si el campo `mensaje` estuviera protegido de forma aislada.

---

## 4. Análisis del Hallazgo SEC-003: Defecto de Validación en `unalib.js`

En `antes/libs/unalib.js`:
- Las funciones `is_valid_url_image` y `is_valid_yt_video` intentan evaluar `re.test(phone)`.
- Como `phone` no existe en el ámbito léxico, se genera un `ReferenceError`.
- El bloque `try/catch` captura el error y registra un mensaje en la consola del servidor, retornando `false`.
- **Efecto colateral:** Esta falla enmascara la detección de imágenes y videos, provocando que toda entrada sea tratada como texto y pase directamente a la concatenación vulnerable en el cliente.

---

## 5. Estrategia de Remediación para la Fase 2

1. **Defensa en Profundidad (Sanitización en Backend):**
   - En `despues/libs/unalib.js`, transformar caracteres especiales HTML a entidades seguras (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#x27;`) antes de cualquier procesamiento o serialización.
2. **Construcción Segura de Elementos Multimedia:**
   - Para URLs válidas de imagen, asegurar que el atributo `src` solo contenga URLs con protocolos legítimos (`http:`, `https:`) y sin comillas sin escapar.
   - Para videos de YouTube, validar de forma estricta que el ID extraído cumpla la expresión regular alfanumérica de 11 caracteres (`^[a-zA-Z0-9_-]{11}$`) antes de interpolarlo en el `iframe`.
3. **Manejo Seguro en el Frontend:**
   - En lugar de usar concatenación con `.html()`, utilizar métodos seguros como `.text()` de jQuery o `document.createTextNode()` / `textContent` para el contenido de texto, y construir nodos `<img>` o `<iframe>` programáticamente mediante atributos controlados.
4. **Validación de Esquemas en Servidor:**
   - Descartar o rechazar mensajes que no cumplan el formato esperado de objeto JSON (`nombre`, `mensaje`, `color`).
5. **Mitigación de Dependencias:**
   - Actualizar y fijar versiones en `package.json` mediante `npm audit fix` o actualización controlada.
