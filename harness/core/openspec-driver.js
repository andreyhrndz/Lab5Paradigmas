const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

class OpenSpecDriver {
  constructor(repoRoot = null) {
    this.repoRoot = repoRoot || process.cwd();
    this.openspecDir = path.resolve(this.repoRoot, 'openspec');
    this.changesDir = path.join(this.openspecDir, 'changes');
    if (!fs.existsSync(this.changesDir)) {
      fs.mkdirSync(this.changesDir, { recursive: true });
    }
  }

  getChangeDir(changeId, targetRoot = null) {
    const root = targetRoot || this.repoRoot;
    return path.resolve(root, 'openspec', 'changes', changeId);
  }

  createChangeStructure(changeId, specData, targetRoot = null) {
    const changeDir = this.getChangeDir(changeId, targetRoot);
    const specsDir = path.join(changeDir, 'specs');
    const capabilityDir = path.join(specsDir, 'chat');

    fs.mkdirSync(capabilityDir, { recursive: true });

    // 1. proposal.md
    const proposalContent = `# Proposal: ${specData.title || changeId}

## Why
${specData.why || 'Implementación formal mediante OpenSpec para asegurar trazabilidad y comportamiento verificable.'}

## Scope
- Requerimiento: ${specData.reqId || changeId}
- Ámbito técnico: Backend y validación en \`despues/\`

## Out of Scope
- Modificaciones fuera del alcance del requerimiento ${specData.reqId || changeId}.
- Alteraciones a la carpeta histórica \`antes/\`.
`;
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), proposalContent, 'utf-8');

    // 2. specs/chat/spec.md (con formato formal de deltas y scenarios exigido por OpenSpec CLI)
    const scenarios = (specData.scenarios && specData.scenarios.length > 0)
      ? specData.scenarios
      : [{
          name: `Validación de ${specData.reqId || changeId}`,
          given: 'Conexión activa a UNA Chat',
          when: `Se evalúa el requerimiento ${specData.reqId || changeId}`,
          then: specData.acceptance || 'Cumple la condición esperada'
        }];

    const specContent = `# Spec: Chat

## ADDED Requirements

### Requirement: ${specData.reqId || changeId}: ${specData.summary || 'Requisito funcional'}
${specData.description || ''}

Acceptance: ${specData.acceptance || 'El sistema debe cumplir el criterio establecido en las pruebas.'}

${scenarios.map((s, idx) => `#### Scenario: ${s.name || `Escenario ${idx + 1}`}\n- Given: ${s.given || 'Dado un entorno preparado'}\n- When: ${s.when || 'Cuando ocurre el evento'}\n- Then: ${s.then || 'Entonces se valida el resultado'}`).join('\n\n')}
`;
    fs.writeFileSync(path.join(capabilityDir, 'spec.md'), specContent, 'utf-8');
    fs.writeFileSync(path.join(specsDir, `${changeId}.spec.md`), specContent, 'utf-8');

    // 3. design.md
    const designContent = `# Technical Design: ${specData.title || changeId}

## Architecture
- Integración en \`despues/libs/unalib.js\` y validación en \`despues/server.js\`.
- Flujo de eventos sobre Socket.IO (\`Evento-Mensaje-Server\`).
- Manejo estricto de tipos y defensas en profundidad.

## Risk Analysis
- Impacto en clientes conectados y retrocompatibilidad con suites existentes.
`;
    fs.writeFileSync(path.join(changeDir, 'design.md'), designContent, 'utf-8');

    // 4. tasks.md
    const tasksContent = `# Tasks: ${specData.title || changeId}

- [ ] 1. (Judge) Derivar intenciones de prueba en \`TEST-REQS.yaml\`.
- [ ] 2. (Judge) Crear pruebas rojas bloqueadas en \`despues/test/unit/\`.
- [ ] 3. (FoFo) Ejecutar y verificar lockfile \`TEST-LOCK.json\`.
- [ ] 4. (Author) Implementar solución en \`despues/libs/unalib.js\`.
- [ ] 5. (Referee) Ejecutar gates de FoFo y suites de pruebas completas.
- [ ] 6. (Orquestador) Generar Pull Request.
`;
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), tasksContent, 'utf-8');

    // 5. Generar también SPEC.md en la raíz del contexto para FoFo spec-lint
    const rootSpecContent = `### Requirement: ${specData.reqId || changeId}: ${specData.summary || 'Requisito funcional'}
${specData.description || ''}
Acceptance: ${specData.acceptance || 'El sistema debe cumplir el criterio establecido.'}
`;
    const rootPath = targetRoot || this.repoRoot;
    fs.writeFileSync(path.join(rootPath, 'SPEC.md'), rootSpecContent, 'utf-8');
    fs.writeFileSync(path.join(rootPath, 'REQUIREMENTS.md'), rootSpecContent, 'utf-8');

    return changeDir;
  }

  validateChange(changeId, targetRoot = null) {
    const root = targetRoot || this.repoRoot;
    const result = spawnSync('npx', ['--yes', '@fission-ai/openspec', 'validate', changeId], {
      cwd: root,
      encoding: 'utf-8',
      shell: true
    });

    return {
      passed: result.status === 0,
      exitCode: result.status,
      stdout: result.stdout,
      stderr: result.stderr
    };
  }
}

module.exports = OpenSpecDriver;
