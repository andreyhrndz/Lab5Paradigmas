const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const JudgeAgent = require('./judge-agent');
const AuthorAgent = require('./author-agent');

class AgentAdapter {
  constructor(options = {}) {
    this.cliPath = options.cliPath || this.resolveAgyCli();
    this.options = { ...options, cliPath: this.cliPath };
    this.judge = new JudgeAgent(this.options);
    this.author = new AuthorAgent(this.options);
  }

  resolveAgyCli() {
    if (process.env.AGY_CLI_PATH && fs.existsSync(process.env.AGY_CLI_PATH)) {
      return process.env.AGY_CLI_PATH;
    }
    const defaultLocalPath = path.join(
      process.env.LOCALAPPDATA || 'C:\\Users\\cuent\\AppData\\Local',
      'agy',
      'bin',
      'agy.exe'
    );
    if (fs.existsSync(defaultLocalPath)) {
      return defaultLocalPath;
    }
    // Probar si agy está en PATH
    try {
      const probe = spawnSync('agy', ['--version'], { encoding: 'utf-8', shell: true });
      if (probe.status === 0) {
        return 'agy';
      }
    } catch (e) {
      // Ignorar
    }
    return null;
  }

  isRealAgentAvailable() {
    if (!this.cliPath) return false;
    try {
      const probe = spawnSync(this.cliPath, ['--version'], { encoding: 'utf-8', shell: false });
      return probe.status === 0;
    } catch (e) {
      return false;
    }
  }

  recordProvenance(worktreePath, testFiles, codeFiles, jobId) {
    const provenancePath = path.join(worktreePath, 'PROVENANCE.yaml');
    const content = `# FoFo Provenance Manifest
job_id: "${jobId}"
timestamp: "${new Date().toISOString()}"
cli_engine: "${this.cliPath || 'programmatic-fallback'}"
real_agent_active: ${this.isRealAgentAvailable()}
judge:
  name: "${this.judge.name}"
  role: "${this.judge.role}"
  files_authored:
${testFiles.map(f => `    - "${f}"`).join('\n')}
author:
  name: "${this.author.name}"
  role: "${this.author.role}"
  files_authored:
${codeFiles.map(f => `    - "${f}"`).join('\n')}
separation_enforced: true
`;
    fs.writeFileSync(provenancePath, content, 'utf-8');
  }

  getJudge() {
    return this.judge;
  }

  getAuthor() {
    return this.author;
  }
}

module.exports = AgentAdapter;
