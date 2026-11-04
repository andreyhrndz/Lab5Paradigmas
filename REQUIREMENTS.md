# Requirements Document — Joint Integration

### REQ-010: Impedir mensajes vacíos o solo espacios
Acceptance: WHEN a visitor activates Send with an empty or whitespace-only message THEN the system SHALL NOT add a message to the transcript, SHALL keep the message field empty, and SHALL tell the visitor to write something.

### REQ-011: Exigir nombre de usuario válido no vacío
Acceptance: WHEN a visitor activates Send with an empty or whitespace-only username and a real message THEN the system SHALL NOT add a message to the transcript, SHALL keep the username field empty, and SHALL tell the visitor to write a name.

### REQ-012: Limitar los mensajes a 280 caracteres
Acceptance: WHEN a visitor activates Send with a message longer than 280 characters THEN the system SHALL NOT add that message to the transcript, SHALL keep the message text in the field, and SHALL tell the visitor the message is too long.
