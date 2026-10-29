# Spec: Chat

## ADDED Requirements

### Requirement: REQ-012: Restricción de longitud máxima de mensajes en frontend y backend
El sistema UNA Chat debe validar y limitar la longitud máxima de cualquier mensaje a 280 caracteres. En el frontend, si un visitante intenta enviar más de 280 caracteres, el sistema no debe agregarlo al transcript, debe mantener el texto del mensaje en el campo para que el usuario pueda editarlo/recortarlo, y debe indicarle que el mensaje es demasiado largo. En el backend, Socket.IO debe rechazar cualquier mensaje que exceda dicha longitud.

Acceptance: WHEN a visitor activates Send with a message longer than 280 characters THEN the system SHALL NOT add that message to the transcript, SHALL keep the message text in the field, and SHALL tell the visitor the message is too long.

#### Scenario: Intento de envío de mensaje de más de 280 caracteres en el frontend
- Given: El cliente de chat abierto con un texto de más de 280 caracteres en el campo de mensaje
- When: El usuario hace clic en el botón Enviar
- Then: El sistema NO agrega el mensaje al transcript, mantiene el texto del mensaje en el campo de entrada y notifica que el mensaje es demasiado largo.

#### Scenario: Intento de inyección directa de mensaje de más de 280 caracteres por Socket.IO en backend
- Given: Dos clientes conectados al servidor Socket.IO
- When: El cliente A emite 'Evento-Mensaje-Server' con un mensaje de más de 280 caracteres
- Then: El servidor rechaza el mensaje y el cliente B no recibe retransmisión con longitud excesiva.

#### Scenario: Validación lógica unitaria de longitud máxima en unalib
- Given: El módulo unalib cargado
- When: Se invoca validateMessage con un mensaje JSON de 281 o más caracteres
- Then: Debe rechazar el mensaje o marcarlo inválido por exceso de longitud.
