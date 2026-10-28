const fs = require('fs');
const path = require('path');

class JudgeAgent {
  constructor(options = {}) {
    this.name = 'fofo-judge';
    this.role = 'Judge — Test Requirements & Red Tests Author';
  }

  /**
   * El Judge opera bajo aislamiento estricto:
   * SOLO puede leer la especificación (SPEC.md / REQUIREMENTS.md).
   * Tiene prohibido leer el código de implementación.
   */
  async deriveTestRequirements(specData, worktreePath) {
    const testReqs = {
      [specData.reqId]: (specData.scenarios || []).map(s => ({
        intent: s.name,
        criteria: s.then
      }))
    };

    if (testReqs[specData.reqId].length === 0) {
      testReqs[specData.reqId] = [
        {
          intent: `Validar comportamiento esperado de ${specData.reqId}`,
          criteria: specData.acceptance || 'Cumplir especificación'
        }
      ];
    }

    // Generar TEST-REQS.yaml en la raíz del worktree
    let yamlContent = `# Generado por ${this.name}\n`;
    for (const [reqId, intents] of Object.entries(testReqs)) {
      yamlContent += `${reqId}:\n`;
      for (const item of intents) {
        yamlContent += `  - intent: "${item.intent}"\n    criteria: "${item.criteria}"\n`;
      }
    }

    const testReqsPath = path.join(worktreePath, 'TEST-REQS.yaml');
    fs.writeFileSync(testReqsPath, yamlContent, 'utf-8');

    return {
      testReqsPath,
      intents: testReqs[specData.reqId]
    };
  }

  /**
   * Genera el archivo de pruebas en rojo etiquetado con @req: REQ-XXX
   */
  async generateRedTests(specData, worktreePath, testGeneratorFn = null) {
    const testDir = path.join(worktreePath, 'despues', 'test', 'unit');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const testFileName = `${specData.reqId.toLowerCase()}.test.js`;
    const testFilePath = path.join(testDir, testFileName);

    let testCode = '';
    if (typeof testGeneratorFn === 'function') {
      testCode = testGeneratorFn(specData);
    } else if (specData.testTemplate) {
      testCode = specData.testTemplate;
    } else {
      // Plantilla por defecto estricta basada en el contrato de FoFo
      testCode = `// @req: ${specData.reqId}
const assert = require('assert');
const unalib = require('../../libs/unalib');

describe('${specData.reqId} — ${specData.title || "Verificación"}', function () {
  it('${specData.reqId} debe cumplir con el criterio de aceptación', function () {
    // Prueba generada por Judge que inicialmente falla por ausencia de implementación
    if (typeof unalib.${specData.targetFunction || 'validateMessage'} !== 'function') {
      assert.fail('Función objetivo no definida');
    }
    // Verificación de comportamiento esperado
    ${specData.testAssertion || `assert.fail("Comportamiento ${specData.reqId} pendiente de implementar");`}
  });
});
`;
    }

    fs.writeFileSync(testFilePath, testCode, 'utf-8');

    return {
      testFilePath,
      testFileName
    };
  }
}

module.exports = JudgeAgent;
