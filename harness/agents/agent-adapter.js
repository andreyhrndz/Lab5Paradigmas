const fs = require('fs');
const path = require('path');
const JudgeAgent = require('./judge-agent');
const AuthorAgent = require('./author-agent');

class AgentAdapter {
  constructor(options = {}) {
    this.judge = new JudgeAgent(options);
    this.author = new AuthorAgent(options);
  }

  recordProvenance(worktreePath, testFiles, codeFiles, jobId) {
    const provenancePath = path.join(worktreePath, 'PROVENANCE.yaml');
    const content = `# FoFo Provenance Manifest
job_id: "${jobId}"
timestamp: "${new Date().toISOString()}"
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
