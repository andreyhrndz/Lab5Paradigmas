const fs = require('fs');
const path = require('path');

const DEFAULT_ALLOWED_PRODUCTION_FILES = [
  'despues/libs/unalib.js',
  'despues/server.js',
  'despues/index.html'
];

class SpecLoader {
  constructor(repoRoot = null) {
    this.repoRoot = repoRoot || process.cwd();
    this.specsDir = path.resolve(this.repoRoot, 'harness', 'specs');
  }

  /**
   * Carga una especificación formal. Prohíbe terminantemente criterios genéricos
   * o requerimientos no catalogados.
   *
   * @param {string} reqId - Identificador del requisito (ej: 'REQ-010')
   * @param {string|null} customPath - Ruta alternativa a un archivo spec JSON
   * @returns {object} Especificación completa y validada
   */
  loadSpec(reqId, customPath = null) {
    if (!reqId || typeof reqId !== 'string') {
      throw new Error('[SpecLoader Error] Debe proveer un reqId válido en formato string.');
    }

    const normalizedReqId = reqId.trim().toUpperCase();
    let specFilePath;

    if (customPath) {
      specFilePath = path.resolve(this.repoRoot, customPath);
      if (!fs.existsSync(specFilePath)) {
        throw new Error(`[SpecLoader Error] Archivo de especificación personalizado no encontrado: ${customPath}`);
      }
    } else {
      specFilePath = path.join(this.specsDir, `${normalizedReqId.toLowerCase()}.json`);
      if (!fs.existsSync(specFilePath)) {
        throw new Error(
          `[SpecLoader Error] Requerimiento desconocido o sin especificación formal: "${reqId}". ` +
          `El harness prohíbe ejecutar requisitos con criterios genéricos o inventados. ` +
          `Especifique uno de los requisitos disponibles: ${this.listAvailableSpecs().join(', ') || 'ninguno'}`
        );
      }
    }

    let specData;
    try {
      const raw = fs.readFileSync(specFilePath, 'utf-8');
      specData = JSON.parse(raw);
    } catch (parseErr) {
      throw new Error(`[SpecLoader Error] Error al parsear archivo de especificación ${specFilePath}: ${parseErr.message}`);
    }

    // Validación estricta del esquema
    if (!specData.reqId || specData.reqId.toUpperCase() !== normalizedReqId) {
      throw new Error(`[SpecLoader Error] El archivo de especificación no coincide con el reqId solicitado ("${normalizedReqId}").`);
    }

    if (!specData.acceptance || typeof specData.acceptance !== 'string' || specData.acceptance.trim().length < 15) {
      throw new Error(`[SpecLoader Error] El requisito ${normalizedReqId} no contiene un criterio de aceptación válido y verificable.`);
    }

    // Asegurar archivos productivos permitidos por defecto
    if (!Array.isArray(specData.targetFiles) || specData.targetFiles.length === 0) {
      specData.targetFiles = [...DEFAULT_ALLOWED_PRODUCTION_FILES];
    }

    return specData;
  }

  /**
   * Lista todos los IDs de especificaciones disponibles en harness/specs/
   */
  listAvailableSpecs() {
    if (!fs.existsSync(this.specsDir)) return [];
    return fs.readdirSync(this.specsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', '').toUpperCase());
  }

  /**
   * Valida que los archivos seleccionados para modificación por el Author pertenezcan
   * estrictamente al conjunto de código productivo permitido y NUNCA a las pruebas bloqueadas.
   */
  validateAllowedFiles(filesToModify, allowedFiles = null) {
    const allowed = allowedFiles || DEFAULT_ALLOWED_PRODUCTION_FILES;
    const normalizedAllowed = allowed.map(f => f.replace(/\\/g, '/'));

    for (const f of filesToModify) {
      const normalizedPath = f.replace(/\\/g, '/');

      // Regla inviolable: el Author jamás puede modificar pruebas
      if (normalizedPath.includes('despues/test/') || normalizedPath.endsWith('.test.js') || normalizedPath.endsWith('.spec.js')) {
        throw new Error(
          `[Security Violation] El Author intentó modificar un archivo de prueba protegido: "${f}". ` +
          `Las pruebas están bajo control exclusivo de Judge y Referee (FoFo test-lock).`
        );
      }

      // Debe pertenecer a los archivos productivos autorizados
      const isAuthorized = normalizedAllowed.some(allowedPath => normalizedPath.endsWith(allowedPath) || normalizedPath === allowedPath);
      if (!isAuthorized) {
        throw new Error(
          `[Authorization Error] Archivo no permitido para modificación: "${f}". ` +
          `Archivos productivos permitidos: ${allowed.join(', ')}`
        );
      }
    }

    return true;
  }
}

module.exports = SpecLoader;
