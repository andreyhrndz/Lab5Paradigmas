# Registro de Evidencias de Pruebas y Seguridad — UNA Chat

**Curso:** Paradigmas de Programación  
**Institución:** Universidad Nacional (UNA)  
**Laboratorio:** Laboratorio 5 — Seguridad Informática y Testing Automatizado  

---

## 1. Índice de Evidencias Oficiales

Según lo establecido en el documento oficial `Lab_5_Paradigmas_2026.pdf` (Página 10), se requiere la entrega de cuatro evidencias visuales correspondientes a cada etapa del ciclo de pruebas y seguridad:

| Evidencia | Descripción Oficial | Archivo en Repositorio | Estado |
|---|---|---|---|
| **Evidencia 1** | Resultado de la prueba de inyección de scripts del paso 2 | [`evidencia-1.png`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-1.png) / [`evidencia-1.jpg`](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-1.jpg) | **COMPLETADA (Fase 1)** |
| **Evidencia 2** | Ejecución de las pruebas unitarias del paso 8 | `evidencia-2.jpg` | Pendiente (Fase 2) |
| **Evidencia 3** | Ejecución de las pruebas de integración del paso 9 | `evidencia-3.jpg` | Pendiente (Fase 2) |
| **Evidencia 4** | Ejecución de las pruebas End-to-End con Playwright del paso 10 | `evidencia-4.jpg` | Pendiente (Fase 2) |

---

## 2. Detalle y Reproducción de la Evidencia 1 (Script Injection XSS)

### 2.1. Descripción de la Evidencia
La Evidencia 1 demuestra de forma fehaciente que la aplicación original (`antes/`) permite la inyección y ejecución no autorizada de código JavaScript en el navegador del usuario al recibir mensajes manipulados a través del protocolo WebSocket de Socket.IO.

### 2.2. Payloads Ejecutados
1. **Payload Oficial del Laboratorio:**
   ```html
   <script>alert('Inyección de script');</script>
   ```
   - **Resultado:** Ejecutado exitosamente en Chromium/Google Chrome mediante la evaluación dinámica de scripts de jQuery 1.11.1 (`jQuery.globalEval`).
   - **Diálogo disparado:** Tipo `alert`, mensaje: `"Inyección de script"`.

2. **Payload Alternativo Basado en Atributo de Evento:**
   ```html
   <img src="x" onerror="alert('XSS Vulnerability Confirmed!')">
   ```
   - **Resultado:** Ejecutado exitosamente al fallar la carga del recurso `x` (error 404), disparando el manejador `onerror`.
   - **Diálogo disparado:** Tipo `alert`, mensaje: `"XSS Vulnerability Confirmed!"`.

### 2.3. Pasos para Reproducir la Evidencia 1 en Entorno Local

#### Paso 1: Iniciar el servidor original
Desde la terminal en la raíz del proyecto:
```bash
npm --prefix antes start
```
El servidor confirmará su inicio en consola:
```text
listening on *:3000
```

#### Paso 2: Ejecutar el navegador
Abrir Google Chrome o cualquier navegador compatible y navegar a:
```text
http://localhost:3000
```

#### Paso 3: Enviar el payload
1. En el campo `Username` ingresar: `Atacante`
2. En el campo `Escriba un mensaje` ingresar:
   ```html
   <script>alert('Inyección de script');</script>
   ```
3. Presionar el botón **Send**.
4. Se observará la aparición inmediata de la ventana modal emergente nativa con el texto `"Inyección de script"`.

#### Paso 4: Reproducción automatizada vía script
Para reproducir la prueba de forma desatendida y generar nuevamente la captura de pantalla:
```bash
node "C:\Users\cuent\.gemini\antigravity-cli\brain\6e63a4d2-775a-4c73-9e93-1d854c6d6d9a\scratch\test_xss.js"
```

### 2.4. Vista Previa de la Evidencia 1
Las capturas generadas se encuentran disponibles en:
- Formato PNG de alta definición: [docs/evidence/evidencia-1.png](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-1.png)
- Formato JPG conforme al requerimiento de entrega: [docs/evidence/evidencia-1.jpg](file:///C:/Users/cuent/Downloads/Lab5Paradigmas/docs/evidence/evidencia-1.jpg)
