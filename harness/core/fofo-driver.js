const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class FoFoDriver {
  constructor(fofoDir = null) {
    this.fofoDir = fofoDir || path.resolve(__dirname, '..', 'fofo');
    this.scriptsDir = path.join(this.fofoDir, 'scripts');
    this.configFile = path.join(this.fofoDir, 'gates.config');
    this.policyFile = path.join(this.fofoDir, 'policy.json');
  }

  runGate(scriptName, args = [], contextDir = process.cwd()) {
    const scriptPath = path.join(this.scriptsDir, scriptName);
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`[FoFoDriver] Gate script no encontrado: ${scriptPath}`);
    }

    const commandArgs = [
      scriptPath,
      '--policy', this.policyFile,
      '--config', this.configFile,
      '--context', contextDir,
      ...args
    ];

    const result = spawnSync('python', commandArgs, {
      cwd: contextDir,
      encoding: 'utf-8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stdoutJson = null;
    if (result.stdout && result.stdout.trim()) {
      try {
        // Encontrar el objeto JSON en stdout (ignorar líneas de advertencias previas si las hubiera)
        const lines = result.stdout.trim().split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            stdoutJson = JSON.parse(lines[i]);
            break;
          } catch (e) {
            // Continuar buscando
          }
        }
      } catch (e) {
        // Ignorar fallo de parseo
      }
    }

    return {
      gate: scriptName,
      exitCode: result.status,
      passed: result.status === 0,
      verdict: stdoutJson,
      stdout: result.stdout,
      stderr: result.stderr
    };
  }

  // 1. Escribir y congelar el lockfile de pruebas (Phase 2 exit por Judge)
  writeTestLock(contextDir, testGlob = 'despues/test/unit/**/*.test.js') {
    return this.runGate('test-lock', ['--write', '--changed', testGlob], contextDir);
  }

  // 2. Verificar que el Author no haya manipulado las pruebas (Phase 3 y Phase 4)
  verifyTestLock(contextDir, testGlob = 'despues/test/unit/**/*.test.js') {
    return this.runGate('test-lock', ['--changed', testGlob], contextDir);
  }

  // 3. Validar especificación formal (Phase 0)
  runSpecLint(contextDir, specFile = 'SPEC.md') {
    return this.runGate('spec-lint', ['--changed', specFile], contextDir);
  }

  // 4. Validar trazabilidad entre requerimientos y pruebas (Phase 1 y 4)
  runTraceGate(contextDir, changedTests = 'despues/test/unit/**/*.test.js') {
    return this.runGate('trace-gate', ['--changed', changedTests], contextDir);
  }

  // 5. Escaneo estricto de secretos y credenciales (Phase 4)
  runSecretScan(contextDir, changedFiles = 'despues/**/*') {
    return this.runGate('secret-scan', ['--changed', changedFiles], contextDir);
  }

  // 6. Ejecución del orquestador de gates de FoFo (Referee)
  runAllGates(contextDir, changedFiles = 'despues/**/*') {
    const scriptPath = path.join(this.scriptsDir, 'gate-runner');
    const result = spawnSync('python', [
      scriptPath,
      '--config', this.configFile,
      '--policy', this.policyFile,
      '--context', contextDir,
      '--changed', changedFiles
    ], {
      cwd: contextDir,
      encoding: 'utf-8',
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let report = null;
    try {
      report = JSON.parse(result.stdout);
    } catch (e) {
      report = { raw: result.stdout };
    }

    return {
      exitCode: result.status,
      passed: result.status === 0,
      report,
      stdout: result.stdout,
      stderr: result.stderr
    };
  }
}

module.exports = FoFoDriver;
