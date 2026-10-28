const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

class AuthorAgent {
  constructor(options = {}) {
    this.name = 'fofo-author';
    this.role = 'Author — Production Code Implementer';
    this.cliPath = options.cliPath || null;
    this.mockMode = Boolean(options.mockMode);
    this.timeout = options.timeout || 120000;
  }

  /**
   * El Author tiene prohibido modificar los archivos de prueba.
   * Su trabajo es modificar el código de implementación para que las pruebas pasen.
   */
  async implement(specData, worktreePath, implementorFn = null, redTestError = '') {
    // Si se pasa función implementadora explícita (p. ej. en pruebas de infraestructura)
    if (typeof implementorFn === 'function') {
      return await implementorFn(specData, worktreePath);
    }

    // Si se proporciona un parche o lógica directa
    if (specData.implementationPatch) {
      const targetFile = path.join(worktreePath, specData.implementationPatch.file);
      if (fs.existsSync(targetFile)) {
        let content = fs.readFileSync(targetFile, 'utf-8');
        content = specData.implementationPatch.apply(content);
        fs.writeFileSync(targetFile, content, 'utf-8');
        return {
          modifiedFiles: [specData.implementationPatch.file],
          status: 'applied',
          method: 'patch'
        };
      }
    }

    // Invocación a agente real si CLI está disponible
    if (this.cliPath && !this.mockMode) {
      return await this.invokeRealAuthorAgent(specData, worktreePath, redTestError);
    }

    return {
      modifiedFiles: [],
      status: 'no-op',
      method: 'none'
    };
  }

  async invokeRealAuthorAgent(specData, worktreePath, redTestError = '') {
    const targetRelative = specData.targetFile || 'despues/libs/unalib.js';
    const targetFullPath = path.join(worktreePath, targetRelative);

    if (!fs.existsSync(targetFullPath)) {
      throw new Error(`[AuthorAgent] Archivo objetivo no existe: ${targetRelative}`);
    }

    const currentCode = fs.readFileSync(targetFullPath, 'utf-8');

    const prompt = `Actúa como el agente Author en una arquitectura FoFo (Agentic SDLC).
Tu objetivo es modificar el código productivo para que la suite de pruebas unitarias pase a VERDE.
REGLA CRÍTICA DE AISLAMIENTO:
- Tienes ESTRICTAMENTE PROHIBIDO modificar archivos en la carpeta de pruebas (despues/test/).
- Solo tienes permiso para modificar el archivo productivo: ${targetRelative}.
- Cualquier intento de modificar pruebas será detectado por el Referee mediante hashes SHA-256 (FoFo test-lock) y causará el rechazo inmediato del trabajo.

INFORMACIÓN DEL REQUERIMIENTO:
ID: ${specData.reqId}
Título: ${specData.title || specData.reqId}
Descripción: ${specData.description || ''}
Criterio de Aceptación: ${specData.acceptance || ''}

ERROR OBSERVADO AL EJECUTAR LA PRUEBA EN ROJO (RED):
${redTestError ? redTestError.slice(0, 1000) : 'La funcionalidad no está implementada aún.'}

CÓDIGO ACTUAL DE ${targetRelative}:
\`\`\`javascript
${currentCode}
\`\`\`

INSTRUCCIONES DE SALIDA:
Devuelve el archivo COMPLETO y ACTUALIZADO de ${targetRelative} con la implementación necesaria para satisfacer el requerimiento y pasar las pruebas sin romper la funcionalidad existente.
Devuelve ÚNICAMENTE el bloque de código envuelto en \`\`\`javascript ... \`\`\`. Sin explicaciones adicionales.`;

    try {
      const res = spawnSync(this.cliPath, ['--print', prompt, '--print-timeout', '120s'], {
        encoding: 'utf-8',
        timeout: this.timeout,
        shell: false
      });

      if (res.status === 0 && res.stdout) {
        const newCode = this.extractCodeBlock(res.stdout);
        if (newCode && newCode.includes('module.exports')) {
          fs.writeFileSync(targetFullPath, newCode, 'utf-8');
          return {
            modifiedFiles: [targetRelative],
            status: 'applied',
            method: 'real-agent-cli'
          };
        }
      }

      return {
        modifiedFiles: [],
        status: 'no-valid-code',
        method: 'real-agent-cli'
      };
    } catch (err) {
      console.warn(`[AuthorAgent] Error al invocar CLI real: ${err.message}`);
      return {
        modifiedFiles: [],
        status: 'error',
        error: err.message
      };
    }
  }

  extractCodeBlock(text) {
    const match = text.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    if (text.includes('module.exports =') || text.includes('function ')) {
      return text.trim();
    }
    return null;
  }

  /**
   * Ejecuta la suite de pruebas unitarias para validar si el código ya está en verde
   */
  verifyUnitTests(worktreePath) {
    const res = spawnSync('npm', ['--prefix', 'despues', 'run', 'test:unit'], {
      cwd: worktreePath,
      encoding: 'utf-8',
      shell: true
    });

    return {
      passed: res.status === 0,
      exitCode: res.status,
      stdout: res.stdout,
      stderr: res.stderr
    };
  }
}

module.exports = AuthorAgent;
