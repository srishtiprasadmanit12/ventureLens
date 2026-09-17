import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runPipeline } from '../src/cli.js';

test('fixture pipeline writes complete artifacts for all candidates', async () => {
	const outputPath = await mkdtemp(path.join(os.tmpdir(), 'ventureai-pipeline-'));
	try {
		const originalEnvironment = { ...process.env };
		delete process.env.VENTUREAI_LLM_API_KEY;
		delete process.env.VENTUREAI_LLM_MODEL;
		delete process.env.VENTUREAI_LLM_ENDPOINT;
		const { runDir, run } = await runPipeline({
			inputPath: 'data/startups.json',
			outputPath,
			now: new Date('2026-09-17T12:00:00.000Z')
		});

		assert.equal(run.candidate_count, 10);
		assert.equal(run.results.length, 10);
		assert.ok(run.results.every((result) => result.status === 'success'));
		const candidateDirs = await readdir(path.join(runDir, 'candidates'));
		assert.equal(candidateDirs.length, 10);
		for (const candidateDir of candidateDirs) {
			const directory = path.join(runDir, 'candidates', candidateDir);
			for (const file of ['input.json', 'analysis.json', 'score.json', 'memo.md']) {
				assert.ok((await readFile(path.join(directory, file), 'utf8')).length > 0);
			}
		}
		assert.equal(JSON.parse(await readFile(path.join(runDir, 'run.json'), 'utf8')).input_sha256.length, 64);
		Object.assign(process.env, originalEnvironment);
	} finally {
		await rm(outputPath, { recursive: true, force: true });
	}
});

test('a candidate failure is recorded without stopping other candidates', async () => {
	const outputPath = await mkdtemp(path.join(os.tmpdir(), 'ventureai-pipeline-errors-'));
	try {
		const adapter = async (candidate) => {
			if (candidate.name === 'Harvey') throw new Error('simulated provider failure');
			const { fixtureAnalysis } = await import('../src/llm.js');
			return fixtureAnalysis(candidate);
		};
		const { runDir, run } = await runPipeline({ inputPath: 'data/startups.json', outputPath, adapter });
		const failed = run.results.find((result) => result.name === 'Harvey');

		assert.equal(failed.status, 'error');
		assert.match(failed.error, /simulated provider failure/);
		assert.equal(run.results.filter((result) => result.status === 'success').length, 9);
		assert.ok(await readFile(path.join(runDir, 'candidates', 'harvey', 'input.json'), 'utf8'));
		assert.ok(await readFile(path.join(runDir, 'candidates', 'glean', 'memo.md'), 'utf8'));
	} finally {
		await rm(outputPath, { recursive: true, force: true });
	}
});