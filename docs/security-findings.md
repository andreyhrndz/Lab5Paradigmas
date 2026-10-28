# Hallazgos de Seguridad, Remediaciones y Auditoría — UNA Chat

**Proyecto:** Laboratorio 5 — Paradigmas de Programación (UNA 2026)  
**Clasificación de Severidad:** OWASP Top 10 / CVSS v3.1 / CWE  
**Fecha de Auditoría y Remediación:** 28 de octubre de 2026  
**Rama:** [`feat/lab5-security-testing`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas)  

---

## 1. Matriz de Estado de Vulnerabilidades

| ID | Vulnerabilidad | Clasificación CWE | Severidad Inicial | Estado Actual | Remediación Aplicada |
|---|---|---|---|---|---|
| **SEC-001** | Cross-Site Scripting (XSS) en `mensaje` | CWE-79 | **CRÍTICA** (8.2) | **MITIGADA Y VERIFICADA** | Defensa en profundidad: saneamiento de entidades HTML en [`despues/libs/unalib.js`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/libs/unalib.js) y eliminación de `.html()` en [`despues/index.html`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/index.html), sustituido por `.text()` y creación segura de DOM. |
| **SEC-002** | Inyección de Atributos y CSS en `nombre` y `color` | CWE-80 / CWE-1021 | **MEDIA** (5.3) | **MITIGADA Y VERIFICADA** | Validación regex estricta para hexadecimal (`/^#[0-9a-fA-F]{6}$/`) y sanitización estricta de nombres. |
| **SEC-003** | Denegación de Lógica / ReferenceError (`phone is not defined`) | CWE-391 | **MEDIA** (5.0) | **CORREGIDA** | Corrección de variables evaluadas en expresiones regulares de imágenes y videos. |
| **SEC-004** | Vulnerabilidades en Dependencias (22 CVEs) | CWE-1104 | **ALTA** (7.5) | **REPARADA (0 VULNERABILIDADES)** | Actualización controlada de dependencias en `despues/package.json` y `package-lock.json`, eliminando 1 crítica, 16 altas, 1 moderada y 4 bajas. |
| **SEC-005** | Protocolos Peligrosos (`javascript:`, `data:`) | CWE-20 | **ALTA** (7.1) | **MITIGADA** | Rechazo explícito de esquemas distintos de `http:` y `https:` tanto en backend como en frontend. |

---

## 2. Decisiones de Arquitectura de Seguridad (Fase 2)

### 2.1. Eliminación de Manipulación Insegura del DOM
Se eliminó por completo el uso de `$('#messages').append($('<li>').html(mensajeDisplay))` en [`despues/index.html`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues/index.html).
En su lugar, se implementó:
- Construcción explícita de nodos DOM utilizando jQuery y APIs seguras del navegador.
- El nombre del usuario se asigna mediante `$('<b>').text(safeName)`.
- El color se aplica mediante la API de estilos `$nombreEl.css('color', safeColor)`, validando previamente que sea un código hexadecimal válido.
- Los mensajes de texto se insertan exclusivamente mediante `$('<span>').text(msgJson.mensaje)`. Al usar `.text()` (que mapea a `Node.textContent`), el navegador trata cualquier cadena como caracteres literales, impidiendo la activación del parser HTML o del evaluador de scripts de jQuery (`jQuery.globalEval`).

### 2.2. Construcción Controlada de Elementos Multimedia
Para los mensajes categorizados como imagen o video:
1. **Imágenes:**
   - Se crea el elemento explícito: `$('<img>').attr('src', safeUrl)`.
   - Se aplican clases y estilos de restricción dimensional máxima (400x400px).
2. **Videos:**
   - Se extrae el ID de 11 caracteres mediante expresión regular validada (`/^[a-zA-Z0-9_-]{11}$/`).
   - Se construye el elemento `<iframe>` apuntando a la URL parametrizada `https://www.youtube.com/embed/` + videoId.

### 2.3. Limitación Técnica de la Validación de Extensiones
> [!IMPORTANT]
> **Limitación de Validación Sintáctica:**
> La verificación de extensiones mediante expresiones regulares (por ejemplo, comprobar que una URL termine en `.jpg` o `.png`) valida la estructura de la cadena pero **no garantiza el tipo MIME real ni el contenido binario del recurso alojado en el servidor remoto**. Un servidor hostil podría responder con cabeceras `Content-Type: text/html` o entregar contenido ejecutable bajo una URL con extensión de imagen.
>
> **Comportamiento del Navegador y Mitigación:**
> Al crear de forma segura la etiqueta `<img>` y asignar la URL al atributo `src`, el navegador delega la interpretación del recurso a su decodificador de imágenes interno. Si el contenido remoto no es una imagen gráfica válida, el decodificador falla, se emite un evento `error` del elemento y el navegador muestra un marcador de imagen rota, **sin ejecutar código JavaScript**, dado que no existen manejadores `onerror` inline inyectados.

---

## 3. Auditoría de Dependencias y Análisis de Seguridad (Snyk / npm audit)

### 3.1. Ejecución de `snyk test`
Se ejecutó la herramienta Snyk CLI sobre el proyecto corregido en `despues/`:

```text
cd despues && npx snyk test
```

**Resultado obtenido:**
```text
ERROR Authentication error (SNYK-0005)
      Authentication credentials not recognized, or user access is not provisioned.
      Status: 401 Unauthorized
```

**Reporte de bloqueo:**
Conforme a los lineamientos éticos y restricciones del laboratorio ("Si Snyk requiere autenticación, reporta el bloqueo y no inventes resultados"), se documenta que la CLI de Snyk requiere autenticación interactiva mediante token (`snyk auth`). Dado que en entornos locales/automatizados sin credenciales aprovisionadas no se cuenta con una API key externa, el escaneo vía SaaS queda bloqueado por autenticación.

### 3.2. Auditoría Local y Remediación vía `npm audit`
Como mecanismo equivalente de escaneo de dependencias basado en el mismo catálogo global de CVEs y asesorías de seguridad de GitHub:
- **Estado Inicial (`antes/`):** 22 vulnerabilidades (1 crítica, 16 altas, 1 moderada, 4 bajas).
  - CVE crítico: `proxy-addr` (IP spoofing).
  - CVEs altos: `body-parser`, `path-to-regexp` (ReDoS), `send` (Template injection), `ws` (DoS por encabezados), `serialize-javascript` (RCE/XSS), `socket.io-parser`.
- **Acciones Realizadas:**
  1. Ejecución de remediación segura `npm audit fix` en `despues/`.
  2. Actualización de `mocha` a su versión segura más reciente (`12.0.3`) en `devDependencies`.
  3. Fijación y regeneración de `despues/package-lock.json`.
- **Estado Final (`despues/`):**
  ```text
  found 0 vulnerabilities
  ```
- **Verificación posterior:** Todas las suites de pruebas (unitarias, integración y E2E) fueron re-ejecutadas tras las actualizaciones, confirmando un 100% de aprobación sin regresiones.
