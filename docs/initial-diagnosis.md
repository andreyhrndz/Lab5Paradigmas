# Diagnóstico Inicial del Proyecto — UNA Chat

**Fecha de análisis:** 28 de octubre de 2026  
**Entorno de ejecución:** Windows 11  
**Versión de Node.js:** `v24.14.0`  
**Versión de npm:** `11.6.2`  
**Rama de trabajo:** [`feat/lab5-security-testing`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas)  

---

## 1. Estructura del Repositorio y Configuración Inicial

El repositorio contiene el código base del Laboratorio 5 en la carpeta [antes/](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/antes). De acuerdo con las instrucciones:
- La carpeta `antes/` se conserva íntegra e inmutable como evidencia histórica del estado original de la aplicación.
- Se ha generado una copia de trabajo funcional en [despues/](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/despues), sobre la cual se estructurará la versión corregida, asegurada y testeada.
- Se configuró el archivo [.gitignore](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/.gitignore) en la raíz para omitir directorios de dependencias (`node_modules`), logs, reportes de pruebas generados y archivos del sistema operativo.

---

## 2. Análisis del Stack Tecnológico y Dependencias

Al inspeccionar [antes/package.json](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/antes/package.json):

```json
{
  "dependencies": {
    "express": "*",
    "mocha": "^10.2.0",
    "socket.io": "*"
  },
  "scripts": {
    "start": "node server.js",
    "test": "mocha"
  }
}
```

### Hallazgos de Dependencias
1. **Comodines en versiones (`*`):** `express` y `socket.io` están declarados con `*`, lo cual introduce inestabilidad e imprevisibilidad en entornos de CI/CD.
2. **Dependencias resueltas en `package-lock.json`:**
   - `express`: `4.18.2`
   - `socket.io`: `4.7.2`
   - `mocha`: `10.2.0`
3. **Auditoría de seguridad inicial (`npm audit`):**
   - La instalación de dependencias en `antes/` arrojó **22 vulnerabilidades** (4 de severidad baja, 1 moderada, 16 altas y 1 crítica).

---

## 3. Protocolo de Comunicación y Arquitectura

### 3.1. Transporte y Capas de Red
- **Protocolo de transporte:** WebSockets nativo con retrocompatibilidad a HTTP Long-Polling implementado mediante la biblioteca Socket.IO v4.
- **Servidor HTTP:** Express montado sobre el módulo nativo `http.Server` de Node.js escuchando por defecto en el puerto `3000` (o variable de entorno `PORT`).
- **Punto de entrada web:** Solicitud `GET /` sirve estáticamente el archivo `index.html`.

### 3.2. Flujo de Datos y Eventos
1. **Cliente a Servidor:** El formulario web intercepta el evento `submit` de jQuery y emite el evento `'Evento-Mensaje-Server'` enviando una cadena JSON:
   ```json
   {
     "nombre": "Usuario",
     "mensaje": "Texto ingresado",
     "color": "#A1B2C3"
   }
   ```
2. **Procesamiento en Servidor:**
   - En [antes/server.js](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/antes/server.js):
   ```javascript
   socket.on('Evento-Mensaje-Server', function(msg){
     msg = validation.validateMessage(msg);
     io.emit('Evento-Mensaje-Server', msg);
   });
   ```
   - El backend invoca `validation.validateMessage(msg)` proveniente de [libs/unalib.js](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/antes/libs/unalib.js).
3. **Servidor a Cliente (Broadcast):** El servidor retransmite el mensaje a todos los sockets conectados mediante `io.emit('Evento-Mensaje-Server', msg)`.
4. **Recepción en Cliente:**
   - En [antes/index.html](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/antes/index.html):
   ```javascript
   socket.on('Evento-Mensaje-Server', function(msg){
       var msgJson = JSON.parse(msg);
       var mensajeDisplay = "<b style='color:"+ msgJson.color +"'>" + msgJson.nombre + "</b>: " + msgJson.mensaje;
       $('#messages').append($('<li>').html(mensajeDisplay));
       window.scrollTo(0, document.body.scrollHeight);
   });
   ```

---

## 4. Análisis de Defectos y Bugs Críticos Previos a Modificaciones

### 4.1. Bug Crítico en `libs/unalib.js` (`ReferenceError: phone is not defined`)
En los métodos `is_valid_url_image` e `is_valid_yt_video`, el desarrollador original copió el bloque de validación de `is_valid_phone` pero no actualizó la variable evaluada en la expresión regular:

```javascript
// antes/libs/unalib.js - Línea 24
is_valid_url_image: function (url) {
  var isValid = false;
  var re = /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png|jpeg|bmp)/i;
  try {
    isValid = re.test(phone); // <-- ERROR: variable 'phone' no declarada ni pasada por parámetro
  } catch (e) {
    console.log(e);
  } finally {
    return isValid; // Siempre retorna false
  }
}
```

El mismo error exacto se repite en la línea 51 dentro de `is_valid_yt_video`:
```javascript
// antes/libs/unalib.js - Línea 51
isValid = re.test(phone); // <-- ERROR: variable 'phone' no declarada
```

**Impacto:**
- Toda URL de imagen o de video arrojaba un `ReferenceError`, capturado silenciosamente por el `try/catch`.
- La función retornaba siempre `false`.
- Por consiguiente, la funcionalidad multimedia prevista nunca entraba en ejecución y el mensaje siempre era categorizado erróneamente como `"Es un texto!"`.

### 4.2. Resultado de la Ejecución Inicial de Pruebas Unitarias
Se ejecutaron las pruebas existentes con el comando:
```bash
npm --prefix antes test
```

**Resultado:**
- Total de pruebas: 5
- Pruebas superadas: 2
- Pruebas fallidas: 3

```text
  unalib
    funcion is_valid_phone
      ✔ deberia devolver true para 8297-8547
      ✔ deberia devolver false para 8297p-8547
    funcion is_valid_url_image
ReferenceError: phone is not defined
      1) deberia devolver true para http://image.com/image.jpg
ReferenceError: phone is not defined
      2) deberia devolver true para http://image.com/image.gif
    funcion is_valid_yt_video
ReferenceError: phone is not defined
      3) deberia devolver true para http://image.com/image.jpg

  2 passing (10ms)
  3 failing
```

---

## 5. Resumen de Limitaciones Técnicas del Proyecto Original

1. **Ausencia total de sanitización contra XSS:** No se realiza escape de caracteres reservados HTML (`<`, `>`, `&`, `"`, `'`).
2. **Uso inseguro de `.html()` en jQuery:** En `index.html`, la concatenación de cadenas directas y su inserción mediante `$('<li>').html(...)` permite la ejecución arbitraria de scripts tanto mediante etiquetas `<script>` como mediante manejadores de eventos en línea (`onerror`, `onload`, `onclick`).
3. **Inyección en atributos CSS y Nombre:** Los campos `nombre` y `color` tampoco cuentan con validación ni escape, permitiendo manipular los estilos o cerrar las etiquetas `<b style="...">`.
4. **Validación insuficiente de URLs:** Las expresiones regulares originales no validan estructura de protocolo estricta ni previenen esquemas peligrosos como `javascript:` o `data:`.
5. **Falta de modularidad en pruebas:** No existen suites de integración para Socket.IO ni pruebas End-to-End con navegadores reales.
