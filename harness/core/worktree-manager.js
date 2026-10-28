const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class WorktreeManager {
  constructor(repoRoot = null) {
    this.repoRoot = repoRoot || process.cwd();
    this.worktreesBase = path.resolve(this.repoRoot, '.worktrees');
    if (!fs.existsSync(this.worktreesBase)) {
      fs.mkdirSync(this.worktreesBase, { recursive: true });
    }
  }

  getWorktreePath(jobId) {
    return path.resolve(this.worktreesBase, jobId);
  }

  createWorktree(jobId, branchName, baseRef = 'main') {
    const worktreePath = this.getWorktreePath(jobId);

    // Si ya existe en disco, verificar su estado o limpiarlo
    if (fs.existsSync(worktreePath)) {
      this.removeWorktree(jobId);
    }

    try {
      // Crear rama si no existe y asociar el worktree de forma aislada
      const cmd = `git worktree add -B "${branchName}" "${worktreePath}" "${baseRef}"`;
      execSync(cmd, { cwd: this.repoRoot, stdio: 'pipe' });

      // Instalar/vincular dependencias en el worktree si no existen
      this.linkOrInstallDeps(worktreePath);

      return worktreePath;
    } catch (err) {
      throw new Error(`[WorktreeManager] Error al crear worktree para ${jobId}: ${err.stderr ? err.stderr.toString() : err.message}`);
    }
  }

  linkOrInstallDeps(worktreePath) {
    const mainNodeModules = path.resolve(this.repoRoot, 'despues', 'node_modules');
    const targetNodeModules = path.resolve(worktreePath, 'despues', 'node_modules');

    if (fs.existsSync(mainNodeModules) && !fs.existsSync(targetNodeModules)) {
      try {
        fs.symlinkSync(mainNodeModules, targetNodeModules, 'junction');
      } catch (symlinkErr) {
        try {
          if (process.platform === 'win32') {
            execSync(`cmd /c mklink /J "${targetNodeModules}" "${mainNodeModules}"`, { stdio: 'pipe' });
          }
        } catch (mklinkErr) {
          try {
            execSync('npm --prefix despues install', { cwd: worktreePath, stdio: 'pipe' });
          } catch (installErr) {
            console.warn(`[WorktreeManager] Advertencia instalando dependencias en worktree: ${installErr.message}`);
          }
        }
      }
    }
  }

  removeWorktree(jobId) {
    const worktreePath = this.getWorktreePath(jobId);

    // CRÍTICO PARA WINDOWS: Desvincular de forma segura cualquier junction de node_modules
    // antes de remover el worktree, para evitar que fs.rmSync borre el target real
    const targetNodeModules = path.resolve(worktreePath, 'despues', 'node_modules');
    const rootNodeModules = path.resolve(worktreePath, 'node_modules');

    for (const juncPath of [targetNodeModules, rootNodeModules]) {
      if (fs.existsSync(juncPath)) {
        try {
          const stat = fs.lstatSync(juncPath);
          if (stat.isSymbolicLink()) {
            fs.unlinkSync(juncPath);
          }
        } catch (e) {
          try {
            if (process.platform === 'win32') {
              execSync(`cmd /c rmdir "${juncPath}"`, { stdio: 'pipe' });
            }
          } catch (e2) {}
        }
      }
    }

    try {
      execSync(`git worktree remove "${worktreePath}" --force`, { cwd: this.repoRoot, stdio: 'pipe' });
    } catch (e) {
      // Si git worktree remove falla por directorio residual, forzar eliminación manual
      if (fs.existsSync(worktreePath)) {
        try {
          fs.rmSync(worktreePath, { recursive: true, force: true });
        } catch (rmErr) {
          console.warn(`[WorktreeManager] Error al limpiar ruta residual: ${rmErr.message}`);
        }
      }
    }

    // Prune de metadatos de worktrees
    try {
      execSync('git worktree prune', { cwd: this.repoRoot, stdio: 'pipe' });
    } catch (e) {
      // Ignorar advertencias menores en prune
    }
  }

  listWorktrees() {
    try {
      const output = execSync('git worktree list --porcelain', { cwd: this.repoRoot, encoding: 'utf-8' });
      const worktrees = [];
      const blocks = output.split('\n\n');
      for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.split('\n');
        const entry = {};
        for (const line of lines) {
          const [key, ...rest] = line.split(' ');
          entry[key] = rest.join(' ');
        }
        worktrees.push(entry);
      }
      return worktrees;
    } catch (err) {
      return [];
    }
  }
}

module.exports = WorktreeManager;
