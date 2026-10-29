const path = require('path');
const fs = require('fs');
const { spawnAsync } = require('./async-process');

class RedValidator {
  constructor(repoRoot = null) {
    this.repoRoot = repoRoot || process.cwd();
  }

  /**
   * Ejecuta y valida que una prueba esté genuinamente en ROJO debido a fallos de aserción
   * del comportamiento esperado, distinguiendo y rechazando:
   * - Errores de sintaxis (SyntaxError)
   * - Dependencias faltantes (MODULE_NOT_FOUND)
   * - Tiempos límite agotados (Timeouts)
   * - Errores de infraestructura o caídas en tiempo de ejecución
   * - Pruebas que ya pasan en verde (already_green)
   *
   * @param {string} testFilePath - Ruta del archivo de prueba unitaria
   * @param {string} targetDir - Directorio de trabajo (worktree o despues)
   * @param {object} options - Opciones adicionales
   * @returns {Promise<{ isRed: boolean, category: string, summary: string, failures: Array, rawOutput: string }>}
   */
  async validateRedTest(testFilePath, targetDir = null, options = {}) {
    const cwd = targetDir || path.resolve(this.repoRoot, 'despues');
    const despuesDir = fs.existsSync(path.resolve(cwd, 'despues'))
      ? path.resolve(cwd, 'despues')
      : cwd;

    let fullTestPath = testFilePath;
    if (!path.isAbsolute(fullTestPath)) {
      if (fs.existsSync(path.resolve(despuesDir, fullTestPath))) {
        fullTestPath = path.resolve(despuesDir, fullTestPath);
      } else if (fs.existsSync(path.resolve(cwd, fullTestPath))) {
        fullTestPath = path.resolve(cwd, fullTestPath);
      } else if (fs.existsSync(path.resolve(this.repoRoot, fullTestPath))) {
        fullTestPath = path.resolve(this.repoRoot, fullTestPath);
      } else {
        fullTestPath = path.resolve(despuesDir, fullTestPath);
      }
    }

    if (!fs.existsSync(fullTestPath)) {
      return {
        isRed: false,
        category: 'file-not-found',
        summary: `El archivo de prueba no existe en disco: ${fullTestPath}`,
        failures: [],
        rawOutput: ''
      };
    }

    const mainNm = path.resolve(this.repoRoot, 'despues', 'node_modules');
    const localNm = path.resolve(despuesDir, 'node_modules');
    const nodePathEnv = [localNm, mainNm, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);

    let mochaBin = path.resolve(despuesDir, 'node_modules', 'mocha', 'bin', 'mocha.js');
    if (!fs.existsSync(mochaBin)) {
      mochaBin = path.resolve(this.repoRoot, 'antes', 'node_modules', 'mocha', 'bin', 'mocha.js');
    }
    if (!fs.existsSync(mochaBin)) {
      mochaBin = path.resolve(this.repoRoot, 'despues', 'node_modules', 'mocha', 'bin', 'mocha.js');
    }

    const runnerCmd = fs.existsSync(mochaBin) ? process.execPath : 'npx';
    const runnerArgs = fs.existsSync(mochaBin)
      ? [mochaBin, '--reporter', 'json', fullTestPath]
      : ['mocha', '--reporter', 'json', fullTestPath];
    const useShell = !fs.existsSync(mochaBin);

    // Ejecutar mocha con el reporter json de forma asíncrona no bloqueante
    const timeoutMs = options.timeout || 15000;
    const res = await spawnAsync(runnerCmd, runnerArgs, {
      cwd: despuesDir,
      encoding: 'utf-8',
      shell: useShell,
      env: {
        ...process.env,
        NODE_PATH: nodePathEnv,
        PORT: String(options.port || 3000)
      },
      timeout: timeoutMs
    });

    const combinedOutput = `${res.stdout}\n${res.stderr}`;

    // 1. Detección de errores de sintaxis (SyntaxError)
    if (/SyntaxError:/i.test(combinedOutput)) {
      return {
        isRed: false,
        category: 'syntax-error',
        summary: 'Error de sintaxis en el archivo de prueba o módulos dependientes (SyntaxError)',
        failures: [],
        rawOutput: combinedOutput
      };
    }

    // 2. Detección de dependencias o módulos inexistentes (MODULE_NOT_FOUND)
    if (/Cannot find module|MODULE_NOT_FOUND/i.test(combinedOutput)) {
      return {
        isRed: false,
        category: 'missing-dependency',
        summary: 'Error de dependencias faltantes en la prueba (MODULE_NOT_FOUND)',
        failures: [],
        rawOutput: combinedOutput
      };
    }

    // 3. Detección de timeouts en ejecución de pruebas
    if (/Timeout of \d+ms exceeded/i.test(combinedOutput) || res.signal === 'SIGTERM') {
      return {
        isRed: false,
        category: 'timeout',
        summary: 'La prueba roja excedió el tiempo límite permitido (Timeout)',
        failures: [],
        rawOutput: combinedOutput
      };
    }

    // 4. Intentar parsear el reporte JSON de Mocha
    let parsedJson = null;
    try {
      // Extraer bloque JSON si hay logs previos
      const jsonStart = res.stdout.indexOf('{');
      const jsonEnd = res.stdout.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        parsedJson = JSON.parse(res.stdout.slice(jsonStart, jsonEnd + 1));
      }
    } catch (parseErr) {
      // Si la salida no es JSON válido
      return {
        isRed: false,
        category: 'infra-error',
        summary: 'Fallo de infraestructura o ejecución: Mocha no pudo generar un reporte JSON válido',
        failures: [],
        rawOutput: combinedOutput
      };
    }

    if (!parsedJson || !parsedJson.stats) {
      return {
        isRed: false,
        category: 'infra-error',
        summary: 'Fallo de ejecución: Reporte de prueba sin estadísticas válidas',
        failures: [],
        rawOutput: combinedOutput
      };
    }

    const { stats, failures = [] } = parsedJson;

    // 5. Verificar que realmente se ejecutaron pruebas
    if (stats.tests === 0) {
      return {
        isRed: false,
        category: 'no-tests',
        summary: 'No se ejecutaron pruebas en el archivo especificado (0 tests)',
        failures: [],
        rawOutput: combinedOutput
      };
    }

    // 6. Verificar si la prueba ya pasó en verde antes de implementar (TDD violación)
    if (stats.failures === 0 && stats.passes > 0) {
      return {
        isRed: false,
        category: 'already-green',
        summary: 'Violación TDD: La prueba pasa en VERDE antes de la implementación del Author',
        failures: [],
        rawOutput: combinedOutput
      };
    }

    // 7. Analizar la causa específica de los fallos
    // Una prueba en ROJO legítima debe fallar por aserción (AssertionError)
    const categorizedFailures = failures.map(f => {
      const errName = f.err?.name || '';
      const errMsg = f.err?.message || '';
      const isAssertion = errName === 'AssertionError' ||
                          errMsg.includes('AssertionError') ||
                          f.err?.operator !== undefined ||
                          (f.err?.expected !== undefined && f.err?.actual !== undefined);

      return {
        title: f.title,
        fullTitle: f.fullTitle,
        errName,
        errMsg,
        isAssertion,
        expected: f.err?.expected,
        actual: f.err?.actual
      };
    });

    const nonAssertionFailures = categorizedFailures.filter(f => !f.isAssertion);

    if (nonAssertionFailures.length > 0) {
      const firstFault = nonAssertionFailures[0];
      return {
        isRed: false,
        category: 'runtime-error',
        summary: `La prueba falló por error de tiempo de ejecución no-aserción: ${firstFault.errName} (${firstFault.errMsg})`,
        failures: categorizedFailures,
        rawOutput: combinedOutput
      };
    }

    // Si todos los fallos corresponden a aserciones legítimas de comportamiento ausente:
    return {
      isRed: true,
      category: 'assertion-failure',
      summary: `Prueba en ROJO verificada legítimamente: ${stats.failures} aserción(es) fallaron por ausencia de implementación`,
      failures: categorizedFailures,
      rawOutput: combinedOutput
    };
  }
}

module.exports = RedValidator;
