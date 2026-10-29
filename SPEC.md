### Requirement: REQ-010: Validación en frontend y backend para bloquear mensajes sin contenido significativo
El sistema UNA Chat debe validar que cualquier mensaje enviado contenga texto visible. No se debe permitir el envío desde la interfaz de usuario ni la retransmisión por el servidor si el mensaje está vacío o compuesto exclusivamente por espacios en blanco.
Acceptance: WHEN a visitor activates Send with an empty or whitespace-only message THEN the system SHALL NOT add a message to the transcript, SHALL keep the message field empty, and SHALL tell the visitor to write something.
