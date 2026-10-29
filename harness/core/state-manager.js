const fs = require('fs');
const path = require('path');

const VALID_STATES = [
  'pending',
  'specifying',
  'testing-red',
  'tests-locked',
  'implementing',
  'verifying',
  'pr-ready',
  'completed',
  'blocked',
  'failed'
];

class StateManager {
  constructor(baseDir = null) {
    this.baseDir = baseDir || path.resolve(process.cwd(), '.harness', 'jobs');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  getJobDir(jobId) {
    return path.join(this.baseDir, jobId);
  }

  getStateFilePath(jobId) {
    return path.join(this.getJobDir(jobId), 'state.json');
  }

  createJob(jobId, reqId, metadata = {}) {
    const jobDir = this.getJobDir(jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    const state = {
      jobId,
      reqId,
      status: 'pending',
      currentPhase: 0,
      phaseName: 'init',
      retryCount: 0,
      maxRetries: metadata.maxRetries || 3,
      branchName: metadata.branchName || `feat/${reqId.toLowerCase()}`,
      worktreePath: metadata.worktreePath || null,
      port: metadata.port || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          status: 'pending',
          timestamp: new Date().toISOString(),
          note: 'Job initialized'
        }
      ],
      errors: [],
      fofoVerdicts: [],
      prUrl: null,
      isBlocked: false,
      blockReason: null,
      metadata: { ...metadata }
    };

    this.saveState(jobId, state);
    return state;
  }

  getState(jobId) {
    const filePath = this.getStateFilePath(jobId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(`[StateManager] Error leyendo estado del trabajo ${jobId}: ${err.message}`);
    }
  }

  saveState(jobId, state) {
    const jobDir = this.getJobDir(jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    state.updatedAt = new Date().toISOString();
    const filePath = this.getStateFilePath(jobId);
    const tempPath = `${filePath}.tmp.${Date.now()}`;

    // Escritura atómica para evitar archivos corruptos en cancelaciones abruptas
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  transition(jobId, nextStatus, note = '', extraData = {}) {
    if (!VALID_STATES.includes(nextStatus)) {
      throw new Error(`[StateManager] Estado inválido: "${nextStatus}". Válidos: ${VALID_STATES.join(', ')}`);
    }

    const state = this.getState(jobId);
    if (!state) {
      throw new Error(`[StateManager] No se encontró el trabajo ${jobId}`);
    }

    // Garantía estricta de ciclo de vida: Un trabajo bloqueado o fallido jamás puede marcarse como 'completed'
    if (nextStatus === 'completed' && (state.isBlocked || state.status === 'blocked' || state.status === 'failed')) {
      throw new Error(`[StateManager Security] Transición ilegal rechazada: Un trabajo en estado "${state.status}" (bloqueado o fallido) no puede transicionar a "completed".`);
    }

    const previousStatus = state.status;
    state.status = nextStatus;
    state.history.push({
      from: previousStatus,
      to: nextStatus,
      timestamp: new Date().toISOString(),
      note
    });

    Object.assign(state, extraData);

    this.saveState(jobId, state);
    return state;
  }

  recordError(jobId, error, phase = null) {
    const state = this.getState(jobId);
    if (!state) return null;

    const errorEntry = {
      phase: phase || state.status,
      message: error.message || String(error),
      stack: error.stack || null,
      timestamp: new Date().toISOString()
    };

    state.errors.push(errorEntry);
    state.retryCount += 1;

    if (state.retryCount >= state.maxRetries) {
      state.status = 'failed';
      state.history.push({
        status: 'failed',
        timestamp: new Date().toISOString(),
        note: `Max retries (${state.maxRetries}) reached`
      });
    }

    this.saveState(jobId, state);
    return state;
  }

  listJobs() {
    if (!fs.existsSync(this.baseDir)) return [];
    const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
    const jobs = [];
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const s = this.getState(ent.name);
        if (s) jobs.push(s);
      }
    }
    return jobs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
}

module.exports = {
  StateManager,
  VALID_STATES
};
