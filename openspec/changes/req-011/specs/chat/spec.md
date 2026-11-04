# Spec: Chat

## ADDED Requirements

### Requirement: REQ-011: Validación obligatoria de nombre de usuario sin valores por defecto anónimos
El sistema UNA Chat debe requerir obligatoriamente un nombre de usuario no vacío para participar. El frontend debe impedir el envío si el campo de usuario está en blanco o con solo espacios, conservando el campo vacío y notificando al visitante. El backend Socket.IO debe rechazar mensajes con autor no especificado o vacío sin asignar anónimos.

Acceptance: WHEN a visitor activates Send with an empty or whitespace-only username and a real message THEN the system SHALL NOT add a message to the transcript, SHALL keep the username field empty, and SHALL tell the visitor to write a name.

#### Scenario: Intento de envío con nombre de usuario vacío en el frontend
- Given: El cliente de chat abierto con mensaje válido pero nombre de usuario vacío
- When: El usuario hace clic en el botón Enviar
- Then: El sistema NO agrega el mensaje al transcript, conserva el campo de nombre vacío y solicita escribir un nombre.

#### Scenario: Intento de envío con nombre de usuario compuesto solo de espacios en el frontend
- Given: El cliente de chat abierto con solo espacios en el campo de nombre
- When: El usuario envía el mensaje
- Then: El sistema NO agrega el mensaje al transcript, mantiene el campo de nombre vacío y pide al usuario escribir su nombre.

#### Scenario: Intento de inyección directa de mensaje sin usuario por Socket.IO en el backend
- Given: Dos clientes conectados al servidor Socket.IO
- When: El cliente A emite 'Evento-Mensaje-Server' con nombre vacío o solo espacios
- Then: El servidor rechaza el mensaje y el cliente B no recibe mensaje sin autor legítimo.

#### Scenario: Validación lógica unitaria de nombre de usuario en unalib
- Given: El módulo unalib cargado
- When: Se invoca validateMessage con JSON con nombre vacío o solo espacios
- Then: Debe rechazar la entrada o invalidar el objeto de mensaje por ausencia de nombre de usuario.
