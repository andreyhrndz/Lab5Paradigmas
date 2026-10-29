const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const WorktreeManager = require('./worktree-manager');

class IntegrationVerifier {
  constructor(repoRoot = null) {
    this.repoRoot = repoRoot || process.cwd();
    this.worktreeManager = new WorktreeManager(this.repoRoot);
  }

  async verifyIntegration(branches, baseBranch = 'main') {
    const timestamp = Date.now();
    const tempJobId = `temp-integration-${timestamp}`;
    const tempBranch = `temp/coord-integration-${timestamp}`;

    const report = {
      timestamp: new Date().toISOString(),
      baseBranch,
      targetBranches: branches,
      tempBranch,
      conflicts: [],
      mergedBranches: [],
      suiteResults: null,
      verdict: 'PENDING',
      details: ''
    };

    let worktreePath = null;

    try {
      // 1. Crear worktree y rama temporal basada en baseBranch
      worktreePath = this.worktreeManager.createWorktree(tempJobId, tempBranch, baseBranch);

      // 2. Intentar fusionar secuencialmente cada rama funcional
      for (const branch of branches) {
        try {
          execSync(`git merge "${branch}" --no-edit`, {
            cwd: worktreePath,
            encoding: 'utf-8',
            stdio: 'pipe'
          });
          report.mergedBranches.push(branch);
        } catch (mergeErr) {
          // Detectar conflicto
          const statusOutput = execSync('git status --porcelain', {
            cwd: worktreePath,
            encoding: 'utf-8'
          });
          const conflictingFiles = statusOutput
            .split('\n')
            .filter(line => line.startsWith('UU') || line.startsWith('AA') || line.startsWith('DD'))
            .map(line => line.substring(3).trim());

          report.conflicts.push({
            branch,
            conflictingFiles,
            error: mergeErr.message
          });

          // Abortar merge conflictivo
          try {
            execSync('git merge --abort', { cwd: worktreePath, stdio: 'pipe' });
          } catch (e) {
            // Ignorar error si no había merge en progreso
          }

          report.verdict = 'CONFLICT_DETECTED';
          report.details = `Conflicto detectado al fusionar la rama ${branch}`;
          break;
        }
      }

      // 3. Si todas las ramas fusionaron sin conflictos, ejecutar suites completas
      if (report.conflicts.length === 0) {
        try {
          const testRes = spawnSync('npm', ['--prefix', 'despues', 'run', 'test:all'], {
            cwd: worktreePath,
            encoding: 'utf-8',
            shell: true,
            timeout: 60000
          });

          report.suiteResults = {
            exitCode: testRes.status,
            passed: testRes.status === 0,
            stdoutSnippet: testRes.stdout ? testRes.stdout.slice(-1500) : '',
            stderrSnippet: testRes.stderr ? testRes.stderr.slice(-1000) : ''
          };

          if (testRes.status === 0) {
            report.verdict = 'CLEAN_INTEGRATION';
            report.details = 'Todas las ramas se integraron limpiamente y las suites de pruebas pasaron al 100%.';
          } else {
            report.verdict = 'REGRESSION_DETECTED';
            report.details = 'Las ramas se fusionaron sin conflictos Git pero provocaron fallos en las pruebas combinadas.';
          }
        } catch (testErr) {
          report.verdict = 'REGRESSION_DETECTED';
          report.details = `Error al ejecutar pruebas sobre el código combinado: ${testErr.message}`;
        }
      }
    } catch (err) {
      report.verdict = 'ERROR';
      report.details = `Error de infraestructura durante la verificación: ${err.message}`;
    } finally {
      // 4. Limpieza absoluta: eliminar worktree y rama temporal (NUNCA hacer merge a main)
      if (worktreePath) {
        this.worktreeManager.removeWorktree(tempJobId);
      }
      try {
        execSync(`git branch -D "${tempBranch}"`, { cwd: this.repoRoot, stdio: 'pipe' });
      } catch (e) {
        // Ignorar si la rama no quedó registrada
      }
    }

    return report;
  }
}

module.exports = IntegrationVerifier;
