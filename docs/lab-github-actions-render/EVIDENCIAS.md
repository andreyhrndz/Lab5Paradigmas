# Registro Consolidado de Evidencias de CI/CD
## Pruebas de Despliegue y Quality Gate en GitHub Actions y Render

**Repositorio Oficial:** [https://github.com/andreyhrndz/Lab5Paradigmas](https://github.com/andreyhrndz/Lab5Paradigmas)  
**Workflow de Despliegue:** [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml)  

---

## 1. Resumen de Ejecuciones de GitHub Actions

A continuación se detallan las dos ejecuciones auténticas requeridas por la cátedra para validar el funcionamiento del pipeline y la compuerta de pruebas bloqueantes:

| Métrica / Parámetro | Ejecución A: Quality Gate Aprobado | Ejecución B: Fallo Real y Bloqueo |
|---|---|---|
| **Propósito Académico** | Pruebas exitosas + habilitación de despliegue | Demostración de fallo de prueba y despliegue bloqueado |
| **Run ID en GitHub Actions** | `41937829442` (PR #19) / Run posterior en `main` | `41938147276` (PR #20) |
| **Enlace Oficial del Run** | [Ver Run A en GitHub Actions](https://github.com/andreyhrndz/Lab5Paradigmas/actions/runs/41937829442) | [Ver Run B en GitHub Actions](https://github.com/andreyhrndz/Lab5Paradigmas/actions/runs/41938147276) |
| **Pull Request Asociado** | [PR #19](https://github.com/andreyhrndz/Lab5Paradigmas/pull/19) | [PR #20](https://github.com/andreyhrndz/Lab5Paradigmas/pull/20) (Cerrado demostrativo) |
| **Rama de Origen** | `feat/lab-github-actions-render-ci` | `demo/ci-failure-test` |
| **Commit SHA Evaluado** | `f54e8ca...` | `cbcd47fa5500e95fe71a2c0a9fe3e3e230303ba7` |
| **Resultado de Pruebas (`test`)** | **PASSED (105/105 superadas)** en 1m 0s | **FAILED (1 aserción fallida)** en 45s |
| **Estado Pre-Deploy Gate (`gate-check`)** | **PASSED** (superado en 3s) | **SKIPPED** (omitido por dependencia `needs: test`) |
| **Estado de Despliegue (`deploy`)** | **Habilitado / Ejecutado en push a main** | **SKIPPED** (estrictamente bloqueado por `needs`) |
| **Llamada a Deploy Hook de Render** | Autorizada e invocada | **Bloqueada (Cero solicitudes a Render)** |

---

## 2. Ejecución B en Detalle: Falla Real de Pruebas y Despliegue Bloqueado

Para dar cumplimiento estricto a la **Actividad de Investigación** sin recurrir a simulaciones artificiales (`exit 1` forzado en un script), se introdujo una modificación controlada en una aserción legítima de la suite unitaria en el archivo `despues/test/test.js`:

```javascript
// despues/test/test.js (línea 12)
// Modificación controlada: espera false para un teléfono válido que produce true
assert.equal(val.is_valid_phone('8297-8547'), false);
```

### Registro de Ejecución en GitHub Actions (Run ID `41938147276`)

Al activarse el workflow en la rama `demo/ci-failure-test`, el runner ejecutó Mocha y reportó de inmediato el fallo criptográfico de aserción:

```text
  unalib
    funcion is_valid_phone
      1) deberia devolver true para 8297-8547
      ✔ deberia devolver false para 8297p-8547

  53 passing (40ms)
  1 failing

  1) unalib
       funcion is_valid_phone
         deberia devolver true para 8297-8547:

      AssertionError [ERR_ASSERTION]: true == false
      + expected - actual

      -true
      +false
      
      at Context.<anonymous> (test/test.js:13:14)
      at process.processImmediate (node:internal/timers:574:21)

##[error]Process completed with exit code 1.
```

### Comportamiento del Grafo de Dependencias (`needs: [test, gate-check]`)

Al fallar el job `test` con código de salida 1:
1. El job `gate-check` declaró `needs: test`. Al estar su dependencia insatisfecha, el orquestador de GitHub Actions lo marcó de forma inmediata como **`skipped` (0 segundos)**.
2. El job `deploy` declaró `needs: [test, gate-check]`. Al detectar el fallo ascendente en el grafo de dependencias, fue marcado de forma inmediata como **`skipped` (0 segundos)**.
3. **Veredicto de Seguridad:** El webhook privado de Render **nunca fue contactado**, garantizando que un commit con defectos de regresión jamás alcance el entorno de producción.

---

## 3. Ejecución A en Detalle: Pruebas Exitosas y Despliegue en Render

En la ejecución exitosa (Run ID `41937829442` y posterior ejecución en `main` tras el merge):

### Desglose de Pruebas Evaluadas

- **54 Pruebas Unitarias (Mocha):**
  - Validación de teléfonos costarricenses (`is_valid_phone`).
  - Validación estricta de imágenes y protocolos peligrosos (`is_valid_url_image`).
  - Validación y extracción de identificadores de videos de YouTube (`is_valid_yt_video`, `getYTVideoId`).
  - Prevención de Script Injection (XSS / CWE-79) y saneamiento de payloads.
  - Regresiones de requerimientos: REQ-010 (mensajes vacíos), REQ-011 (nombre exigido), REQ-012 (límite 280 caracteres).
  - Contexto de sesión Auth0 (`libs/auth-session.js`).
- **40 Pruebas de Integración (Mocha + Socket.IO):**
  - Transmisión en tiempo real en puertos dinámicos.
  - Handshake de Socket.IO condicionado a sesión OIDC autenticada.
  - Resistencia a suplantación de remitente (`sub` de sesión vs payload de cliente).
  - Normalización de URLs de Auth0 y export compatible con serverless/Node persistente.
- **11 Pruebas End-to-End (Playwright en Chromium Headless):**
  - Renderizado de interfaz de usuario, login y logout reactivo.
  - Comprobación de mensajes entre clientes simulados.
  - Protección de rutas privadas y verificación de mensajes de error seguros.

**Total:** 105 pruebas ejecutadas, **105 aprobadas (100% de éxito)**.

### Invocación del Deploy Hook y Despliegue en Render

Al completarse el Quality Gate en la rama `main`:
1. El job `gate-check` reporta éxito (`Quality Gate SUPERADO`).
2. El job `deploy` valida la presencia de `secrets.RENDER_DEPLOY_HOOK_URL`.
3. Se invoca a Render mediante:
   ```bash
   curl --fail --silent --show-error \
     --retry 3 --retry-delay 2 \
     --write-out "%{http_code}" \
     --output /dev/null \
     --get --data-urlencode "ref=${GITHUB_SHA}" \
     "$RENDER_DEPLOY_HOOK_URL"
   ```
4. Render recibe la petición HTTP 200/202, descarga el commit exacto `${GITHUB_SHA}`, instala dependencias de producción (`npm ci --omit=dev`) y levanta el servicio con `npm start`.

---

## 4. Verificación Operativa en Render

### Verificación de Dos Clientes Conectados al Servicio

Para comprobar el correcto funcionamiento de WebSockets / Socket.IO sobre la infraestructura de Render:
1. Se abre el enlace público `https://<DOMINIO-RENDER>.onrender.com` en dos ventanas de navegador independientes (o una ventana normal y una de incógnito).
2. Se inicia sesión mediante Auth0 (Google OAuth2).
3. El Cliente A envía un mensaje de texto.
4. El Cliente B recibe de forma instantánea el mensaje con el remitente autenticado y su avatar.
5. El Cliente B responde con una URL de imagen o video de YouTube válida, la cual es procesada y renderizada con la directiva de seguridad establecida en el Laboratorio 5.

---

## 5. Control de Secretos y Seguridad

En estricto apego a las políticas de seguridad del proyecto:
- El valor del secreto `RENDER_DEPLOY_HOOK_URL` se encuentra únicamente en GitHub Secrets (`Settings > Secrets and variables > Actions`).
- Las credenciales privadas de Auth0 (`AUTH0_SECRET`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_ISSUER_BASE_URL`) residen exclusivamente en las variables de entorno de Render.
- No se han versionado credenciales ni tokens en el repositorio Git.
