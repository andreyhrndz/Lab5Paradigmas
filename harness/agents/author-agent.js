const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { spawnAsync } = require('../core/async-process');
const SpecLoader = require('../core/spec-loader');

class AuthorAgent {
  constructor(options = {}) {
    this.name = 'fofo-author';
    this.role = 'Author — Production Code Implementer';
    this.cliPath = options.cliPath || null;
    this.mockMode = Boolean(options.mockMode);
    this.timeout = options.timeout || 120000;
    this.specLoader = new SpecLoader();
  }

  /**
   * El Author tiene estrictamente PROHIBIDO modificar los archivos de prueba.
   * Su trabajo es modificar exclusivamente el código productivo permitido
   * (incluidos despues/libs/unalib.js, despues/server.js y despues/index.html)
   * para satisfacer las validaciones en frontend y backend.
   */
  async implement(specData, worktreePath, implementorFn = null, redTestError = '') {
    const allowedFiles = specData.targetFiles || [
      'despues/libs/unalib.js',
      'despues/server.js',
      'despues/index.html'
    ];

    // Si se pasa función implementadora explícita (p. ej. en pruebas de infraestructura)
    if (typeof implementorFn === 'function') {
      const result = await implementorFn(specData, worktreePath);
      if (result && Array.isArray(result.modifiedFiles)) {
        this.specLoader.validateAllowedFiles(result.modifiedFiles, allowedFiles);
      }
      return result;
    }

    // Si se proporciona un parche o parches estructurados
    if (specData.implementationPatches && Array.isArray(specData.implementationPatches)) {
      const modifiedFiles = [];
      for (const patch of specData.implementationPatches) {
        this.specLoader.validateAllowedFiles([patch.file], allowedFiles);
        const fullPath = path.join(worktreePath, patch.file);
        if (fs.existsSync(fullPath)) {
          let content = fs.readFileSync(fullPath, 'utf-8');
          content = patch.apply(content);
          fs.writeFileSync(fullPath, content, 'utf-8');
          modifiedFiles.push(patch.file);
        }
      }
      return {
        modifiedFiles,
        status: 'applied',
        method: 'multi-patch'
      };
    }

    // Parche singular retrocompatible
    if (specData.implementationPatch) {
      const patchFile = specData.implementationPatch.file;
      this.specLoader.validateAllowedFiles([patchFile], allowedFiles);
      const targetFile = path.join(worktreePath, patchFile);
      if (fs.existsSync(targetFile)) {
        let content = fs.readFileSync(targetFile, 'utf-8');
        content = specData.implementationPatch.apply(content);
        fs.writeFileSync(targetFile, content, 'utf-8');
        return {
          modifiedFiles: [patchFile],
          status: 'applied',
          method: 'patch'
        };
      }
    }

    // Invocación a agente real si CLI está disponible
    if (this.cliPath && !this.mockMode) {
      return await this.invokeRealAuthorAgent(specData, worktreePath, redTestError, allowedFiles);
    }

    return {
      modifiedFiles: [],
      status: 'no-op',
      method: 'none'
    };
  }

  async invokeRealAuthorAgent(specData, worktreePath, redTestError = '', allowedFiles = []) {
    // Archivo objetivo primario
    const primaryFile = (specData.targetFiles && specData.targetFiles[0]) || specData.targetFile || 'despues/libs/unalib.js';
    this.specLoader.validateAllowedFiles([primaryFile], allowedFiles);

    const targetFullPath = path.join(worktreePath, primaryFile);
    if (!fs.existsSync(targetFullPath)) {
      throw new Error(`[AuthorAgent] Archivo objetivo no existe: ${primaryFile}`);
    }

    const currentCode = fs.readFileSync(targetFullPath, 'utf-8');

    const prompt = `Actúa como el agente Author en una arquitectura FoFo (Agentic SDLC).
Tu objetivo es modificar el código productivo para que la suite de pruebas unitarias y de comportamiento pasen a VERDE.
REGLA CRÍTICA DE AISLAMIENTO:
- Tienes ESTRICTAMENTE PROHIBIDO modificar archivos en la carpeta de pruebas (despues/test/).
- Solo tienes permiso para modificar los archivos productivos autorizados: ${allowedFiles.join(', ')}.
- Cualquier intento de modificar pruebas será detectado por el Referee mediante hashes SHA-256 (FoFo test-lock) y causará el rechazo inmediato del trabajo.
- Asegura que las validaciones funcionen tanto en frontend como en backend: Socket.IO debe rechazar entradas inválidas.

INFORMACIÓN DEL REQUERIMIENTO:
ID: ${specData.reqId}
Título: ${specData.title || specData.reqId}
Descripción: ${specData.description || ''}
Criterio de Aceptación: ${specData.acceptance || ''}

ERROR OBSERVADO AL EJECUTAR LA PRUEBA EN ROJO (RED):
${redTestError ? redTestError.slice(0, 1000) : 'La funcionalidad no está implementada aún.'}

CÓDIGO ACTUAL DE ${primaryFile}:
\`\`\`javascript
${currentCode}
\`\`\`

INSTRUCCIONES DE SALIDA:
Devuelve el archivo COMPLETO y ACTUALIZADO de ${primaryFile} con la implementación necesaria para satisfacer el requerimiento y pasar las pruebas sin romper la funcionalidad existente.
Devuelve ÚNICAMENTE el bloque de código envuelto en \`\`\`javascript ... \`\`\`. Sin explicaciones adicionales.`;

    try {
      const res = await spawnAsync(this.cliPath, ['--print', prompt, '--print-timeout', '120s'], {
        encoding: 'utf-8',
        timeout: this.timeout,
        shell: false
      });

      if (res.status === 0 && res.stdout) {
        const newCode = this.extractCodeBlock(res.stdout);
        if (newCode && (newCode.includes('module.exports') || newCode.includes('function'))) {
          fs.writeFileSync(targetFullPath, newCode, 'utf-8');
          return {
            modifiedFiles: [primaryFile],
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
    const match = text.match(/```(?:javascript|js|html)?\s*([\s\S]*?)```/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    if (text.includes('module.exports =') || text.includes('function ') || text.includes('<!DOCTYPE') || text.includes('<html')) {
      return text.trim();
    }
    return null;
  }
}

module.exports = AuthorAgent;
