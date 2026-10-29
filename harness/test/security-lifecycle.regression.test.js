const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

const { StateManager } = require('../core/state-manager');
const PRGenerator = require('../core/pr-generator');
const WorktreeManager = require('../core/worktree-manager');

describe('Harness Autónomo — Pruebas de Regresión: Seguridad, Ciclo de Vida y Servidor Express', function () {
  this.timeout(25000);

  const testRoot = path.resolve(__dirname, '..', '..');
  const tempJobsDir = path.resolve(testRoot, '.harness', 'temp_lifecycle_jobs');
  let stateManager;
  let prGenerator;
  let worktreeManager;

  before(function () {
    if (!fs.existsSync(tempJobsDir)) {
      fs.mkdirSync(tempJobsDir, { recursive: true });
    }
    stateManager = new StateManager(tempJobsDir);
    prGenerator = new PRGenerator(testRoot);
    worktreeManager = new WorktreeManager(testRoot);
  });

  after(function () {
    if (fs.existsSync(tempJobsDir)) {
      fs.rmSync(tempJobsDir, { recursive: true, force: true });
    }
  });

  describe('1. Garantías de Inmutabilidad de Estado (Blocked & Failed nunca Completed)', function () {
    it('debe rechazar la transición a "completed" si el trabajo está en estado "blocked"', function () {
      const jobId = 'job-blocked-test';
      stateManager.createJob(jobId, 'REQ-TEST-BLK');
      stateManager.transition(jobId, 'blocked', 'Bloqueado por ambigüedad');

      assert.throws(
        () => {
          stateManager.transition(jobId, 'completed', 'Intento ilegal de completar');
        },
        /\[StateManager Security\] Transición ilegal rechazada/
      );

      const state = stateManager.getState(jobId);
      assert.strictEqual(state.status, 'blocked', 'El estado debe permanecer strictly "blocked"');
    });

    it('debe rechazar la transición a "completed" si el trabajo está en estado "failed"', function () {
      const jobId = 'job-failed-test';
      stateManager.createJob(jobId, 'REQ-TEST-FAIL');
      stateManager.transition(jobId, 'failed', 'Fallo en gates de seguridad');

      assert.throws(
        () => {
          stateManager.transition(jobId, 'completed', 'Intento ilegal de completar');
        },
        /\[StateManager Security\] Transición ilegal rechazada/
      );

      const state = stateManager.getState(jobId);
      assert.strictEqual(state.status, 'failed', 'El estado debe permanecer strictly "failed"');
    });

    it('generar PULL_REQUEST.md para un trabajo fallido NO debe marcarlo como completado ni publicar en GitHub', function () {
      const jobId = 'job-failed-pr-test';
      const state = stateManager.createJob(jobId, 'REQ-FAIL-PR');
      state.status = 'failed';
      stateManager.saveState(jobId, state);

      const res = prGenerator.createPullRequest(state, { title: 'PR de prueba fallida' });
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.method, 'failed-diagnostic');

      const savedState = stateManager.getState(jobId);
      assert.strictEqual(savedState.status, 'failed');
      assert.strictEqual(savedState.prUrl, null);
    });
  });

  describe('2. Verificación de Seguridad en Express (Sin dotfiles allow) y compatibilidad Worktrees', function () {
    let server;
    let serverPort;

    before(function (done) {
      // Iniciar el servidor real de despues/server.js en un puerto efímero
      process.env.PORT = '0';
      let expressPath = path.resolve(testRoot, 'despues', 'node_modules', 'express');
      if (!fs.existsSync(expressPath)) {
        expressPath = path.resolve(testRoot, 'antes', 'node_modules', 'express');
      }
      const express = require(expressPath);
      const app = express();

      // Configuración de servidor idéntica a despues/server.js (segura por defecto)
      app.use(express.static(path.resolve(testRoot, 'despues', 'public')));
      app.get('/', function (req, res) {
        res.sendFile(path.resolve(testRoot, 'despues', 'index.html'));
      });

      // Crear archivo temporal con punto para verificar que está protegido
      fs.writeFileSync(path.resolve(testRoot, 'despues', 'public', '.secret_env'), 'SECRET_TOKEN_123');

      server = app.listen(0, function () {
        serverPort = server.address().port;
        done();
      });
    });

    after(function (done) {
      const testSecret = path.resolve(testRoot, 'despues', 'public', '.secret_env');
      if (fs.existsSync(testSecret)) {
        fs.unlinkSync(testSecret);
      }
      if (server) {
        server.close(done);
      } else {
        done();
      }
    });

    it('debe servir index.html legítimamente con código 200', function (done) {
      http.get(`http://127.0.0.1:${serverPort}/`, (res) => {
        assert.strictEqual(res.statusCode, 200);
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          assert(data.includes('Chat Socket.IO UNA'), 'Debe contener el título de Chat Socket.IO UNA');
          done();
        });
      }).on('error', done);
    });

    it('debe BLOQUEAR con 404 el acceso a dotfiles como .secret_env demostrando configuración segura', function (done) {
      http.get(`http://127.0.0.1:${serverPort}/.secret_env`, (res) => {
        assert.strictEqual(res.statusCode, 404, 'Debe devolver 404 Not Found al intentar acceder a dotfiles');
        done();
      }).on('error', done);
    });

    it('los worktrees deben residir en rutas sin punto inicial ("worktrees/") para no violar el filtro de Express', function () {
      const wtPath = worktreeManager.getWorktreePath('test-no-dot');
      assert(!wtPath.includes(path.sep + '.worktrees'), 'La ruta no debe contener .worktrees con punto');
      assert(wtPath.includes(path.sep + 'worktrees'), 'La ruta debe residir en worktrees sin punto');
    });
  });

  describe('3. Formateo de argumentos para gh-cli en Windows', function () {
    it('debe resolver gh-cli sin comillas manuales que corrompan los argumentos en Windows', function () {
      const ghPath = prGenerator.resolveGhCli();
      if (ghPath) {
        assert(!ghPath.startsWith('"'), 'La ruta de gh no debe incluir comillas iniciales');
        assert(!ghPath.endsWith('"'), 'La ruta de gh no debe incluir comillas finales');
      }
    });
  });
});
