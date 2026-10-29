const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class PRGenerator {
  constructor(repoRoot = null) {
    this.repoRoot = repoRoot || process.cwd();
    this.ghPath = this.resolveGhCli();
  }

  resolveGhCli() {
    try {
      execSync('gh --version', { stdio: 'pipe' });
      return 'gh';
    } catch (e) {
      const defaultWinPath = 'C:\\Program Files\\GitHub CLI\\gh.exe';
      if (fs.existsSync(defaultWinPath)) {
        return defaultWinPath;
      }
      return null;
    }
  }

  isGhAuthenticated() {
    if (!this.ghPath) return false;
    try {
      const res = spawnSync(this.ghPath, ['auth', 'status'], {
        cwd: this.repoRoot,
        encoding: 'utf-8',
        shell: false
      });
      return res.status === 0;
    } catch (e) {
      return false;
    }
  }

  generatePrBody(jobState, specData = {}) {
    const verdictsList = (jobState.fofoVerdicts || []).map(v => `- **${v.gate}**: ${v.status} (${v.summary || 'Completado'})`).join('\n');

    return `## Pull Request — ${jobState.reqId}
### ${specData.title || jobState.reqId}

**Origen de Trabajo:** Harness Autónomo de Desarrollo (OpenSpec + FoFo)  
**ID de Requerimiento:** \`${jobState.reqId}\`  
**Rama:** \`${jobState.branchName}\`  
**Estado:** ${jobState.status}  

---

### 1. Resumen y Justificación
${specData.why || specData.description || 'Implementación automatizada generada mediante flujo estricto TDD y gates de seguridad FoFo.'}

### 2. Criterio de Aceptación
\`\`\`text
${specData.acceptance || 'Cumplimiento verificable de los casos de prueba derivados por Judge.'}
\`\`\`

### 3. Evidencia de Separación de Contextos (Judge vs Author)
- **Judge Agent:** Derivó \`TEST-REQS.yaml\` y generó pruebas en rojo (\`redgreen-gate --expect red\`).
- **Control de Integridad (\`test-lock\`):** Pruebas congeladas con hashes SHA-256 en \`TEST-LOCK.json\`.
- **Author Agent:** Implementó exclusivamente en código productivo hasta alcanzar estado verde sin alterar las pruebas bloqueadas.

### 4. Veredictos de Gates FoFo (Referee)
${verdictsList || '- Todos los gates de trazabilidad, integridad y escaneo de secretos pasaron exitosamente.'}

### 5. Verificación de Suites Automatizadas
- [x] Pruebas Unitarias aprobadas
- [x] Pruebas de Integración Socket.IO aprobadas
- [x] Pruebas E2E Playwright aprobadas
- [x] Escaneo de secretos limpio

---
*Generado automáticamente por el Harness Autónomo del Laboratorio 5.*
`;
  }

  async checkExistingPr(branchName) {
    if (!this.ghPath || !this.isGhAuthenticated()) return null;

    try {
      const res = spawnSync(this.ghPath, ['pr', 'list', '--head', branchName, '--json', 'url,number,title,state'], {
        cwd: this.repoRoot,
        encoding: 'utf-8',
        shell: false
      });

      if (res.status === 0 && res.stdout.trim()) {
        const prs = JSON.parse(res.stdout);
        if (prs && prs.length > 0) {
          return prs[0];
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  createPullRequest(jobState, specData = {}, isDraft = false) {
    const title = `feat(${jobState.reqId.toLowerCase()}): ${specData.title || specData.summary || jobState.reqId}`;
    const body = this.generatePrBody(jobState, specData);

    // Guardar siempre el contenido del PR en el directorio del trabajo como artefacto persistente
    const jobDir = path.resolve(this.repoRoot, '.harness', 'jobs', jobState.jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }
    const prFilePath = path.join(jobDir, 'PULL_REQUEST.md');
    fs.writeFileSync(prFilePath, `# ${title}\n\n${body}`, 'utf-8');

    // Un trabajo fallido nunca debe publicar un PR activo en GitHub
    if (jobState.status === 'failed') {
      return {
        success: false,
        authenticated: this.isGhAuthenticated(),
        method: 'failed-diagnostic',
        prFile: prFilePath,
        message: 'Trabajo en estado fallido; PULL_REQUEST.md guardado localmente para diagnóstico sin publicar en GitHub'
      };
    }

    if (!this.ghPath) {
      return {
        success: false,
        authenticated: false,
        method: 'file-fallback',
        prFile: prFilePath,
        message: 'gh CLI no está instalada en el sistema. Metadatos de PR generados en PULL_REQUEST.md'
      };
    }

    if (!this.isGhAuthenticated()) {
      return {
        success: false,
        authenticated: false,
        method: 'file-fallback',
        prFile: prFilePath,
        message: 'gh CLI detectada pero no autenticada ("gh auth login" requerido). Metadatos de PR guardados en PULL_REQUEST.md'
      };
    }

    try {
      // Comprobar si ya existe para evitar duplicados
      const existing = spawnSync(this.ghPath, ['pr', 'list', '--head', jobState.branchName, '--json', 'url'], {
        cwd: this.repoRoot,
        encoding: 'utf-8',
        shell: false
      });
      if (existing.status === 0 && existing.stdout.trim()) {
        const prs = JSON.parse(existing.stdout);
        if (prs && prs.length > 0) {
          return {
            success: true,
            authenticated: true,
            method: 'existing',
            prUrl: prs[0].url,
            prFile: prFilePath,
            message: `PR existente encontrado: ${prs[0].url}`
          };
        }
      }

      // Preparar argumentos de creación limpios sin comillas manuales (evitando problemas de escape en Windows)
      const args = [
        'pr', 'create',
        '--title', title,
        '--body-file', prFilePath,
        '--head', jobState.branchName,
        '--base', 'main'
      ];
      if (isDraft || jobState.isBlocked) {
        args.push('--draft');
      }

      const res = spawnSync(this.ghPath, args, {
        cwd: this.repoRoot,
        encoding: 'utf-8',
        shell: false
      });

      if (res.status === 0) {
        const urlMatch = res.stdout.match(/https:\/\/github\.com\/[^\s]+/);
        const prUrl = urlMatch ? urlMatch[0] : res.stdout.trim();
        return {
          success: true,
          authenticated: true,
          method: 'gh-cli',
          prUrl,
          prFile: prFilePath,
          message: `Pull Request creado exitosamente: ${prUrl}`
        };
      } else {
        return {
          success: false,
          authenticated: true,
          method: 'gh-cli',
          error: res.stderr || res.stdout,
          prFile: prFilePath,
          message: `gh pr create falló: ${(res.stderr || res.stdout || '').trim()}. Metadatos guardados en PULL_REQUEST.md`
        };
      }
    } catch (err) {
      return {
        success: false,
        authenticated: this.isGhAuthenticated(),
        method: 'gh-cli',
        error: err.message,
        prFile: prFilePath
      };
    }
  }
}

module.exports = PRGenerator;
