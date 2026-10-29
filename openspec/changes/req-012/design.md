# Technical Design: Limitar los mensajes a un máximo estricto de 280 caracteres

## Architecture
- Integración en `despues/libs/unalib.js` y validación en `despues/server.js`.
- Flujo de eventos sobre Socket.IO (`Evento-Mensaje-Server`).
- Manejo estricto de tipos y defensas en profundidad.

## Risk Analysis
- Impacto en clientes conectados y retrocompatibilidad con suites existentes.
