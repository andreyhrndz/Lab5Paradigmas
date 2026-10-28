const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

class AuthorAgent {
  constructor(options = {}) {
    this.name = 'fofo-author';
    this.role = 'Author — Production Code Implementer';
  }

  /**
   * El Author tiene prohibido modificar los archivos de prueba.
   * Su trabajo es modificar el código de implementación para que las pruebas pasen.
   */
  async implement(specData, worktreePath, implementorFn = null) {
    if (typeof implementorFn === 'function') {
      return await implementorFn(specData, worktreePath);
    }

    // Si se proporciona un parche o lógica directa
    if (specData.implementationPatch) {
      const targetFile = path.join(worktreePath, specData.implementationPatch.file);
      if (fs.existsSync(targetFile)) {
        let content = fs.readFileSync(targetFile, 'utf-8');
        content = specData.implementationPatch.apply(content);
        fs.writeFileSync(targetFile, content, 'utf-8');
        return {
          modifiedFiles: [specData.implementationPatch.file],
          status: 'applied'
        };
      }
    }

    return {
      modifiedFiles: [],
      status: 'no-op'
    };
  }

  /**
   * Ejecuta la suite de pruebas unitarias para validar si el código ya está en verde
   */
  verifyUnitTests(worktreePath) {
    const res = spawnSync('npm', ['--prefix', 'despues', 'run', 'test:unit'], {
      cwd: worktreePath,
      encoding: 'utf-8',
      shell: true
    });

    return {
      passed: res.status === 0,
      exitCode: res.status,
      stdout: res.stdout,
      stderr: res.stderr
    };
  }
}

module.exports = AuthorAgent;
