#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const Orchestrator = require('./core/orchestrator');
const { StateManager } = require('./core/state-manager');
const IntegrationVerifier = require('./core/integration-verifier');
const SpecLoader = require('./core/spec-loader');

function printUsage() {
  console.log(`
Uso: node harness/cli.js <comando> [argumentos]

Comandos disponibles:
  doctor                     Verifica la instalación y prerrequisitos del sistema (Git, Node, Python, OpenSpec, FoFo, gh).
  run <req-id> [--spec file] Inicia el ciclo autónomo para un requerimiento específico cargando su especificación formal.
  status [job-id]            Muestra el estado de una ejecución específica o lista todos los trabajos.
  resume <job-id>            Reanuda un trabajo interrumpido desde su último estado válido.
  batch <req-1> <req-2> ...  Ejecuta múltiples requerimientos concurrentemente en worktrees aislados cargando sus especificaciones completas.
  integrate <b1> <b2> ...    Verifica la integración coordinada de varias ramas funcionales sin merge a main.
  report                     Presenta el resumen consolidado de estados, evidencias y veredictos de FoFo.
  help                       Muestra esta ayuda.
`);
}

async function handleDoctor() {
  console.log('\n=== Verificación de Prerrequisitos del Harness Autónomo ===\n');
  const checks = [
    {
      name: 'Git',
      cmd: 'git --version',
      required: true
    },
    {
      name: 'Node.js',
      cmd: 'node -v',
      required: true
    },
    {
      name: 'npm',
      cmd: 'npm -v',
      required: true
    },
    {
      name: 'Python 3',
      cmd: 'python --version',
      required: true
    },
    {
      name: 'OpenSpec CLI',
      cmd: 'npx @fission-ai/openspec@latest --version',
      required: true
    },
    {
      name: 'FoFo Gates (Agentic-SDLC)',
      cmd: 'python harness/fofo/scripts/selftest',
      required: true
    },
    {
      name: 'GitHub CLI (gh)',
      cmd: 'gh --version',
      fallback: '"C:\\Program Files\\GitHub CLI\\gh.exe" --version',
      required: false
    }
  ];

  let allPassed = true;

  for (const item of checks) {
    let passed = false;
    let version = '';

    try {
      version = execSync(item.cmd, { stdio: 'pipe', encoding: 'utf-8' }).trim();
      passed = true;
    } catch (e) {
      if (item.fallback) {
        try {
          version = execSync(item.fallback, { stdio: 'pipe', encoding: 'utf-8' }).trim();
          passed = true;
        } catch (fbErr) {
          passed = false;
        }
      }
    }

    if (passed) {
      console.log(`  [OK] ${item.name.padEnd(28)} : ${version.split('\n')[0]}`);
    } else {
      if (item.required) {
        console.log(`  [FAIL] ${item.name.padEnd(28)} : NO DETECTADO (Requerido)`);
        allPassed = false;
      } else {
        console.log(`  [WARN] ${item.name.padEnd(28)} : NO DISPONIBLE EN PATH (Se usará fallback local)`);
      }
    }
  }

  console.log('\n-----------------------------------------------------------');
  if (allPassed) {
    console.log('✔ Todos los prerrequisitos obligatorios están instalados y operativos.\n');
  } else {
    console.log('✖ Faltan dependencias esenciales. Revise los componentes marcados con FAIL.\n');
  }
}

async function handleStatus(jobId) {
  const stateManager = new StateManager();
  if (jobId) {
    const s = stateManager.getState(jobId);
    if (!s) {
      console.error(`No se encontró el trabajo "${jobId}"`);
      process.exit(1);
    }
    console.log(`\n=== Estado del Trabajo: ${jobId} ===`);
    console.log(JSON.stringify(s, null, 2));
  } else {
    const jobs = stateManager.listJobs();
    console.log(`\n=== Trabajos Registrados en el Harness (${jobs.length}) ===\n`);
    if (jobs.length === 0) {
      console.log('No hay trabajos registrados.');
      return;
    }
    console.log('JOB ID'.padEnd(25) + 'REQ'.padEnd(12) + 'ESTADO'.padEnd(16) + 'PUERTO'.padEnd(10) + 'REINTENTOS');
    console.log('-'.repeat(70));
    for (const j of jobs) {
      console.log(
        j.jobId.padEnd(25) +
        j.reqId.padEnd(12) +
        j.status.padEnd(16) +
        String(j.port || '-').padEnd(10) +
        `${j.retryCount}/${j.maxRetries}`
      );
    }
    console.log('');
  }
}

async function handleRun(reqId, args = []) {
  if (!reqId) {
    console.error('Error: Debe especificar un identificador de requerimiento (ej: REQ-010).');
    process.exit(1);
  }

  const specLoader = new SpecLoader();
  const specIdx = args.indexOf('--spec');
  const customSpecPath = (specIdx !== -1 && args[specIdx + 1]) ? args[specIdx + 1] : null;

  let specData;
  try {
    specData = specLoader.loadSpec(reqId, customSpecPath);
  } catch (err) {
    console.error(`[Error de Requisito] ${err.message}`);
    process.exit(1);
  }

  console.log(`\n[Harness] Iniciando ejecución autónoma para ${reqId}...`);
  console.log(`[Harness] Título: ${specData.title}`);
  console.log(`[Harness] Criterio de Aceptación: "${specData.acceptance}"`);
  console.log(`[Harness] Archivos productivos autorizados: ${specData.targetFiles.join(', ')}`);

  const orchestrator = new Orchestrator();
  const finalState = await orchestrator.runJob(reqId, specData);

  console.log(`\n[Harness] Trabajo finalizado. Estado resultante: ${finalState.status}`);
  if (finalState.prUrl) {
    console.log(`[Harness] PR disponible en: ${finalState.prUrl}`);
  }
}

async function handleBatch(reqIds) {
  if (!reqIds || reqIds.length === 0) {
    console.error('Error: Indique al menos un requerimiento para la ejecución por lotes (ej: batch REQ-010 REQ-011 REQ-012).');
    process.exit(1);
  }

  const specLoader = new SpecLoader();
  const specs = [];

  // Validar y cargar todos los requerimientos antes de iniciar el batch (rechaza requisitos desconocidos)
  for (const id of reqIds) {
    try {
      const spec = specLoader.loadSpec(id);
      specs.push(spec);
    } catch (err) {
      console.error(`[Error de Requisito en Batch] ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`\n[Harness] Iniciando ejecución por lotes concurrente para ${specs.length} requerimientos:`);
  for (const s of specs) {
    console.log(`  - [${s.reqId}] ${s.title}`);
    console.log(`    Criterio: "${s.acceptance}"`);
    console.log(`    Archivos autorizados: ${s.targetFiles.join(', ')}`);
  }

  const orchestrator = new Orchestrator();
  const results = await orchestrator.runBatch(specs);

  console.log('\n=== Resumen de Ejecución Concurrente ===\n');
  for (const res of results) {
    console.log(`- ${res.reqId}: ${res.status} (Rama: ${res.branchName}, Puerto: ${res.port})`);
    if (res.prUrl) console.log(`  PR: ${res.prUrl}`);
  }
}

async function handleIntegrate(branches) {
  if (!branches || branches.length < 2) {
    console.error('Error: Especifique al menos dos ramas para verificar su integración conjunta.');
    process.exit(1);
  }

  console.log(`\n[Harness] Verificando integración coordinada para: ${branches.join(', ')}...`);
  const verifier = new IntegrationVerifier();
  const report = await verifier.verifyIntegration(branches);

  console.log(`\n=== Veredicto de Integración Coordinada ===`);
  console.log(`Veredicto : ${report.verdict}`);
  console.log(`Detalles  : ${report.details}`);
  if (report.conflicts.length > 0) {
    console.log(`Conflictos:`, JSON.stringify(report.conflicts, null, 2));
  }
  if (report.suiteResults) {
    console.log(`Pruebas combinadas aprobadas: ${report.suiteResults.passed}`);
  }
}

async function handleReport() {
  const stateManager = new StateManager();
  const jobs = stateManager.listJobs();

  console.log('\n=== Reporte de Ejecución y Evidencias del Harness ===\n');
  console.log(`Total de trabajos registrados: ${jobs.length}\n`);

  for (const j of jobs) {
    console.log(`[Trabajo] ${j.jobId} — Requisito: ${j.reqId}`);
    console.log(`  Estado       : ${j.status}`);
    console.log(`  Rama         : ${j.branchName}`);
    console.log(`  Worktree     : ${j.worktreePath || '-'}`);
    console.log(`  PR URL       : ${j.prUrl || '(Metadatos en PULL_REQUEST.md)'}`);
    console.log(`  Veredictos FoFo:`);
    if (j.fofoVerdicts && j.fofoVerdicts.length > 0) {
      for (const v of j.fofoVerdicts) {
        console.log(`    - ${v.gate.padEnd(24)} : [${v.status}] ${v.summary || ''}`);
      }
    } else {
      console.log('    - Sin veredictos registrados');
    }
    if (j.errors && j.errors.length > 0) {
      console.log(`  Errores registrados: ${j.errors.length}`);
    }
    console.log('');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'doctor':
    case 'check':
      await handleDoctor();
      break;
    case 'run':
      await handleRun(args[1], args.slice(2));
      break;
    case 'status':
      await handleStatus(args[1]);
      break;
    case 'resume':
      const orchestrator = new Orchestrator();
      const state = await orchestrator.runJob(args[1], {});
      console.log(`Trabajo reanudado: ${state.status}`);
      break;
    case 'batch':
      await handleBatch(args.slice(1));
      break;
    case 'integrate':
      await handleIntegrate(args.slice(1));
      break;
    case 'report':
      await handleReport();
      break;
    default:
      printUsage();
      break;
  }
}

main().catch(err => {
  console.error('[CLI Error]', err);
  process.exit(1);
});
