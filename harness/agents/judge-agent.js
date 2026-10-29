const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { spawnAsync } = require('../core/async-process');

class JudgeAgent {
  constructor(options = {}) {
    this.name = 'fofo-judge';
    this.role = 'Judge — Test Requirements & Red Tests Author';
    this.cliPath = options.cliPath || null;
    this.mockMode = Boolean(options.mockMode);
    this.timeout = options.timeout || 120000;
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
          criteria: specData.acceptance || specData.summary || 'Cumplir especificación'
        }
      ];
    }

    // Generar TEST-REQS.yaml en la raíz del worktree para trazabilidad FoFo
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
   * Genera pruebas verificables rojas en múltiples niveles:
   * - Pruebas Unitarias (despues/test/unit/)
   * - Pruebas de Integración Socket.IO (despues/test/integration/)
   * - Pruebas de Comportamiento Playwright E2E (despues/test/e2e/)
   */
  async generateRedTests(specData, worktreePath, testGeneratorFn = null) {
    const generatedFiles = [];
    const unitDir = path.join(worktreePath, 'despues', 'test', 'unit');
    const integrationDir = path.join(worktreePath, 'despues', 'test', 'integration');
    const e2eDir = path.join(worktreePath, 'despues', 'test', 'e2e');

    for (const dir of [unitDir, integrationDir, e2eDir]) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    const unitFileName = `${specData.reqId.toLowerCase()}.test.js`;
    const unitFilePath = path.join(unitDir, unitFileName);

    let unitCode = '';

    // 1. Manejo de función generadora directa
    if (typeof testGeneratorFn === 'function') {
      unitCode = testGeneratorFn(specData);
    } else if (specData.testTemplates && specData.testTemplates.unit) {
      unitCode = specData.testTemplates.unit;
    } else if (specData.testTemplate) {
      unitCode = specData.testTemplate;
    } else if (this.cliPath && !this.mockMode) {
      unitCode = await this.invokeRealJudgeAgent(specData, 'unit');
    }

    if (!unitCode || !unitCode.trim()) {
      unitCode = `// @req: ${specData.reqId}
const assert = require('assert');
const unalib = require('../../libs/unalib');

describe('${specData.reqId} — ${specData.title || "Verificación"}', function () {
  it('${specData.reqId} debe cumplir con el criterio de aceptación', function () {
    if (typeof unalib.${specData.targetFunction || 'validateMessage'} !== 'function') {
      assert.fail('Función objetivo no definida en unalib');
    }
    ${specData.testAssertion || `assert.fail("Comportamiento ${specData.reqId} no implementado aún");`}
  });
});
`;
    }

    if (!unitCode.includes(`@req: ${specData.reqId}`)) {
      unitCode = `// @req: ${specData.reqId}\n` + unitCode;
    }
    fs.writeFileSync(unitFilePath, unitCode, 'utf-8');
    generatedFiles.push(unitFilePath);

    // 2. Pruebas de Integración con Socket.IO si están definidas
    if (specData.testTemplates && specData.testTemplates.integration) {
      const socketTestPath = path.join(integrationDir, `${specData.reqId.toLowerCase()}.socket.test.js`);
      let socketCode = specData.testTemplates.integration;
      if (!socketCode.includes(`@req: ${specData.reqId}`)) {
        socketCode = `// @req: ${specData.reqId}\n` + socketCode;
      }
      fs.writeFileSync(socketTestPath, socketCode, 'utf-8');
      generatedFiles.push(socketTestPath);
    }

    // 3. Pruebas End-to-End con Playwright si están definidas
    if (specData.testTemplates && specData.testTemplates.e2e) {
      const e2eTestPath = path.join(e2eDir, `${specData.reqId.toLowerCase()}.spec.js`);
      let e2eCode = specData.testTemplates.e2e;
      if (!e2eCode.includes(`@req: ${specData.reqId}`)) {
        e2eCode = `// @req: ${specData.reqId}\n` + e2eCode;
      }
      fs.writeFileSync(e2eTestPath, e2eCode, 'utf-8');
      generatedFiles.push(e2eTestPath);
    }

    return {
      testFilePath: unitFilePath,
      testFileName: unitFileName,
      generatedFiles,
      generatedBy: this.cliPath && !this.mockMode ? 'real-agent-cli' : 'spec-templates'
    };
  }

  async invokeRealJudgeAgent(specData, testType = 'unit') {
    const prompt = `Actúa como el agente Judge en una arquitectura FoFo (Agentic SDLC).
Tu responsabilidad es escribir una suite de pruebas en JavaScript para validar un requisito específico.
Tipo de prueba solicitada: ${testType} (unit = Mocha + assert, integration = Mocha + socket.io-client, e2e = Playwright).
REGLA DE AISLAMIENTO: No tienes acceso al código productivo existente. Solo debes basarte en el siguiente requisito de la especificación:

ID: ${specData.reqId}
Título: ${specData.title || specData.reqId}
Resumen: ${specData.summary || ''}
Descripción: ${specData.description || ''}
Criterio de Aceptación: ${specData.acceptance || ''}
Función objetivo en unalib: unalib.${specData.targetFunction || 'validateMessage'}

INSTRUCCIONES TÉCNICAS OBLIGATORIAS:
1. Incluye en la primera línea exactamente el comentario de trazabilidad FoFo:
   // @req: ${specData.reqId}
2. Escribe una prueba rigurosa y formal que valide el criterio de aceptación.
3. La prueba DEBE fallar (RED) en el estado actual antes de la implementación del Author.
4. Devuelve ÚNICAMENTE el bloque de código JavaScript envuelto en \`\`\`javascript ... \`\`\`. Sin explicaciones adicionales.`;

    try {
      const res = await spawnAsync(this.cliPath, ['--print', prompt, '--print-timeout', '120s'], {
        encoding: 'utf-8',
        timeout: this.timeout,
        shell: false
      });

      if (res.status === 0 && res.stdout) {
        return this.extractCodeBlock(res.stdout);
      }
      return null;
    } catch (err) {
      console.warn(`[JudgeAgent] Error al invocar CLI real: ${err.message}`);
      return null;
    }
  }

  extractCodeBlock(text) {
    const match = text.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    if (text.includes('describe(') && text.includes('require(')) {
      return text.trim();
    }
    return null;
  }
}

module.exports = JudgeAgent;
