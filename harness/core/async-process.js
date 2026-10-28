const { spawn } = require('child_process');

/**
 * Ejecuta un comando de forma asíncrona no bloqueante devolviendo una promesa.
 * Permite que múltiples procesos corran en paralelo sin bloquear el event loop de Node.js.
 *
 * @param {string} command - Binario o ejecutable
 * @param {Array<string>} args - Argumentos del comando
 * @param {object} options - Opciones de child_process.spawn
 * @returns {Promise<{ status: number, stdout: string, stderr: string, signal: string|null, error?: Error }>}
 */
function spawnAsync(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    }
    if (child.stderr) {
      child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    }

    child.on('close', (status, signal) => {
      resolve({
        status: status === null ? (signal ? 1 : 0) : status,
        stdout,
        stderr,
        signal
      });
    });

    child.on('error', (err) => {
      resolve({
        status: 1,
        stdout,
        stderr: err.message,
        error: err,
        signal: null
      });
    });
  });
}

module.exports = {
  spawnAsync
};
