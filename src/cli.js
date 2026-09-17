import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { analyzeCandidate } from './analysis.js';
import { loadCandidates } from './input.js';
import { createConfiguredAdapter } from './llm.js';
import { renderMemo } from './memo.js';
import { scoreAnalysis } from './scoring.js';

export const THESIS_VERSION = 'b2b-ai-workflow-v1';

function slugify(value) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'candidate';
}

function uniqueSlug(name, usedSlugs) {
	const base = slugify(name);
	let slug = base;
	let suffix = 2;
	while (usedSlugs.has(slug)) slug = `${base}-${suffix++}`;
	usedSlugs.add(slug);
	return slug;
}

async function writeJson(filePath, value) {
	await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function processCandidate(candidate, candidateDir, adapter) {
	await writeJson(path.join(candidateDir, 'input.json'), candidate);

	try {
		const analysis = await analyzeCandidate(candidate, { adapter });
		const score = scoreAnalysis(analysis);
		const memo = renderMemo(candidate, analysis, score);
		await writeJson(path.join(candidateDir, 'analysis.json'), analysis);
		await writeJson(path.join(candidateDir, 'score.json'), score);
		await writeFile(path.join(candidateDir, 'memo.md'), memo);
		return {
			name: candidate.name,
			status: 'success',
			recommendation: score.recommendation,
			score: score.score
		};
	} catch (error) {
		return {
			name: candidate.name,
			status: 'error',
			error: error instanceof Error ? error.message : String(error)
		};
	}
}

export async function runPipeline({ inputPath, outputPath = 'output', adapter, now = new Date() }) {
	const candidates = await loadCandidates(inputPath);
	const selectedAdapter = adapter ?? await createConfiguredAdapter();
	const rawInput = await readFile(inputPath);
	const inputHash = createHash('sha256').update(rawInput).digest('hex');
	const runTimestamp = now.toISOString();
	const runDir = path.join(outputPath, runTimestamp);
	await mkdir(path.join(runDir, 'candidates'), { recursive: true });

	const usedSlugs = new Set();
	const results = [];
	for (const candidate of candidates) {
		const candidateDir = path.join(runDir, 'candidates', uniqueSlug(candidate.name, usedSlugs));
		await mkdir(candidateDir, { recursive: true });
		results.push(await processCandidate(candidate, candidateDir, selectedAdapter));
	}

	const run = {
		run_timestamp: runTimestamp,
		input_path: inputPath,
		input_sha256: inputHash,
		thesis_version: THESIS_VERSION,
		model: adapter ? 'custom adapter' : process.env.VENTUREAI_LLM_MODEL || 'fixture',
		candidate_count: candidates.length,
		results
	};
	await writeJson(path.join(runDir, 'run.json'), run);
	return { runDir, run };
}

function parseArgs(args) {
	const values = { inputPath: 'data/startups.json', outputPath: 'output' };
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === '--input') values.inputPath = args[++index];
		else if (argument === '--output') values.outputPath = args[++index];
		else throw new Error(`unknown argument ${argument}`);
	}
	return values;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	runPipeline(parseArgs(process.argv.slice(2)))
		.then(({ runDir }) => console.log(`Pipeline output: ${runDir}`))
		.catch((error) => {
			console.error(error.message);
			process.exitCode = 1;
		});
}