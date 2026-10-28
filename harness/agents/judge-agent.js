const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
   * Invoca a la CLI real de Antigravity (o mock si se especifica) para generar pruebas rojas
   */
  async generateRedTests(specData, worktreePath, testGeneratorFn = null) {
    const testDir = path.join(worktreePath, 'despues', 'test', 'unit');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const testFileName = `${specData.reqId.toLowerCase()}.test.js`;
    const testFilePath = path.join(testDir, testFileName);

    let testCode = '';

    // Si se pasa función generadora explícita (p. ej. en pruebas de infraestructura del harness)
    if (typeof testGeneratorFn === 'function') {
      testCode = testGeneratorFn(specData);
    } else if (specData.testTemplate) {
      testCode = specData.testTemplate;
    } else if (this.cliPath && !this.mockMode) {
      // Invocación a agente real vía CLI
      testCode = await this.invokeRealJudgeAgent(specData);
    }

    // Fallback defensivo si el agente no devolvió código válido
    if (!testCode || !testCode.trim()) {
      testCode = `// @req: ${specData.reqId}
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

    // Asegurar que contenga la etiqueta de trazabilidad FoFo obligatoria
    if (!testCode.includes(`@req: ${specData.reqId}`)) {
      testCode = `// @req: ${specData.reqId}\n` + testCode;
    }

    fs.writeFileSync(testFilePath, testCode, 'utf-8');

    return {
      testFilePath,
      testFileName,
      generatedBy: this.cliPath && !this.mockMode ? 'real-agent-cli' : 'fallback-template'
    };
  }

  async invokeRealJudgeAgent(specData) {
    const prompt = `Actúa como el agente Judge en una arquitectura FoFo (Agentic SDLC).
Tu responsabilidad es escribir una suite de pruebas unitarias en JavaScript utilizando Mocha y assert de Node.js.
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
2. Requiere assert y unalib:
   const assert = require('assert');
   const unalib = require('../../libs/unalib');
3. Escribe un bloque describe('${specData.reqId}', function() { ... }) con casos it(...) que validen estrictamente el requisito.
4. La prueba DEBE fallar (RED) si la funcionalidad no está implementada.
5. Devuelve ÚNICAMENTE el bloque de código JavaScript envuelto en \`\`\`javascript ... \`\`\`. Sin explicaciones adicionales.`;

    try {
      const res = spawnSync(this.cliPath, ['--print', prompt, '--print-timeout', '120s'], {
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
    // Si no tiene fences pero parece código
    if (text.includes('describe(') && text.includes('require(')) {
      return text.trim();
    }
    return null;
  }
}

module.exports = JudgeAgent;
