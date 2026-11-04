# Spec: Chat

## ADDED Requirements

### Requirement: REQ-010: Validación en frontend y backend para bloquear mensajes sin contenido significativo
El sistema UNA Chat debe validar que cualquier mensaje enviado contenga texto visible. No se debe permitir el envío desde la interfaz de usuario ni la retransmisión por el servidor si el mensaje está vacío o compuesto exclusivamente por espacios en blanco.

Acceptance: WHEN a visitor activates Send with an empty or whitespace-only message THEN the system SHALL NOT add a message to the transcript, SHALL keep the message field empty, and SHALL tell the visitor to write something.

#### Scenario: Intento de envío de mensaje vacío en el frontend
- Given: El cliente de chat abierto en el navegador con el campo de mensaje vacío
- When: El usuario hace clic en el botón Enviar o pulsa Enter
- Then: El sistema NO agrega el mensaje al transcript, mantiene el campo de mensaje vacío y muestra una advertencia solicitando escribir algo.

#### Scenario: Intento de envío de mensaje compuesto solo de espacios en el frontend
- Given: El cliente de chat abierto en el navegador con espacios en blanco en el campo de mensaje
- When: El usuario envía el formulario
- Then: El sistema NO agrega el mensaje al transcript, limpia el campo de mensaje y solicita al usuario escribir contenido.

#### Scenario: Intento de inyección directa de mensaje vacío por Socket.IO en el backend
- Given: Dos clientes conectados al servidor Socket.IO
- When: El cliente A emite 'Evento-Mensaje-Server' con mensaje vacío o solo espacios
- Then: El servidor Socket.IO rechaza el mensaje y el cliente B no recibe retransmisión de mensaje vacío.

#### Scenario: Validación lógica unitaria en biblioteca unalib
- Given: El módulo unalib cargado
- When: Se invoca validateMessage con JSON conteniendo mensaje vacío o solo espacios
- Then: Debe rechazar la entrada o invalidar el objeto devuelto sin contenido procesable.
