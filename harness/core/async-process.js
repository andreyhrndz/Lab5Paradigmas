const { spawn } = require('child_process');

/**
 * Ejecuta un comando de forma asíncrona no bloqueante devolviendo una promesa.
 * Gestiona timeouts, errores síncronos y asíncronos, y evita promesas pendientes o resoluciones duplicadas.
 *
 * @param {string} command - Binario o ejecutable
 * @param {Array<string>} args - Argumentos del comando
 * @param {object} options - Opciones de child_process.spawn (soporta timeout en ms)
 * @returns {Promise<{ status: number, stdout: string, stderr: string, signal: string|null, timedOut: boolean, error?: Error }>}
 */
function spawnAsync(command, args = [], options = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    let stdout = '';
    let stderr = '';
    let child = null;

    const safeResolve = (result) => {
      if (settled) return;
      settled = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      resolve(result);
    };

    const timeoutMs = typeof options.timeout === 'number' && options.timeout > 0
      ? options.timeout
      : null;

    // Clonar options para manejar el timeout explícitamente y evitar interferencias
    const spawnOpts = { ...options };
    delete spawnOpts.timeout;

    try {
      child = spawn(command, args, spawnOpts);
    } catch (syncErr) {
      return safeResolve({
        status: 1,
        stdout: '',
        stderr: syncErr.message || String(syncErr),
        signal: null,
        timedOut: false,
        error: syncErr
      });
    }

    if (timeoutMs) {
      timer = setTimeout(() => {
        try {
          if (child && !child.killed) {
            child.kill('SIGTERM');
            // En caso de que el proceso persista en Windows, intentar forzar terminación
            setTimeout(() => {
              try {
                if (child && !child.killed) child.kill('SIGKILL');
              } catch (e) {}
            }, 500).unref();
          }
        } catch (killErr) {
          // Ignorar fallo de kill si el proceso ya cerró
        }
        safeResolve({
          status: 1,
          stdout,
          stderr: (stderr ? stderr + '\n' : '') + `Process timed out after ${timeoutMs}ms`,
          signal: 'SIGTERM',
          timedOut: true,
          error: new Error(`Process timed out after ${timeoutMs}ms`)
        });
      }, timeoutMs);
    }

    if (child.stdout) {
      child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    }
    if (child.stderr) {
      child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    }

    child.on('close', (status, signal) => {
      safeResolve({
        status: status === null ? (signal ? 1 : 0) : status,
        stdout,
        stderr,
        signal,
        timedOut: false
      });
    });

    child.on('error', (err) => {
      safeResolve({
        status: 1,
        stdout,
        stderr: err.message || String(err),
        signal: null,
        timedOut: false,
        error: err
      });
    });
  });
}

module.exports = {
  spawnAsync
};
