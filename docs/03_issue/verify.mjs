import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Read-only consistency check for the planning artifacts, not product acceptance.
const root = path.dirname(fileURLToPath(import.meta.url));
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const index = read(path.join(root, 'index.json'));
const pagesRoot = path.resolve(root, '../01_requirements/03_pages');
const api = read(path.resolve(root, '../01_requirements/04_api/openapi.json'));
const gaps = read(path.join(pagesRoot, 'api-gaps.json')).items;
const tasks = new Map(index.tasks.map(t => [t.id, t]));
const split = read(path.join(root, 'ui-connections.json'));
const graph = read(path.resolve(root, '../../TASK_GRAPH.json'));
assert.deepEqual(graph.ui_connection_split, split, 'Published migration/acceptance mapping differs');
assert.equal(tasks.size, index.tasks.length, 'Duplicate Issue ID');
assert.equal(index.policy.ui_owner, 'A');
for (const task of tasks.values()) {
  assert.equal(task.kind === 'ui', task.lane === 'A', `All UI stays with A: ${task.id}`);
  if (task.lane !== 'A') assert(!task.write_paths.some(p => p.startsWith('src/')), `Non-UI lane owns UI path: ${task.id}`);
  assert.deepEqual(task.connect_inputs.map(x => x.issue), task.connect_after, `Dependency inputs: ${task.id}`);
  assert(task.connect_inputs.every(x => x.required_output.length > 0));
  const body = fs.readFileSync(path.join(root, task.issue_file), 'utf8');
  assert(body.includes(`初期担当枠：${task.lane}。`), `Issue owner text: ${task.id}`);
  const line = body.match(/^- 実接続・完了前：([^\n]*)/m)?.[1] ?? '';
  const dependencies = [...line.matchAll(/\[([^\]]+)\]\(/g)].map(x => x[1]);
  assert.deepEqual(dependencies, task.connect_after, `Issue dependency text: ${task.id}`);
}
const same = (a, b, label) => assert.deepEqual([...a].sort(), [...b].sort(), label);
const pages = fs.readdirSync(pagesRoot).filter(p => fs.existsSync(path.join(pagesRoot, p, 'page.json')));
same(index.coverage.pages.map(p => p.page), pages, 'Page coverage');
same(index.tasks.filter(t => ['ui', 'deferred-ui'].includes(t.completion_scope?.phase))
  .flatMap(t => t.pages.filter(p => !(t.id === 'UI-SETTINGS' && split.health_deferral.pages.includes(p)))), pages, 'Each page has one effective UI owner');
let requirements = 0, capabilities = 0, acceptance = 0;
for (const page of pages) {
  const req = read(path.join(pagesRoot, page, 'requirements.json'));
  const acc = read(path.join(pagesRoot, page, 'acceptance.json'));
  const row = index.coverage.pages.find(p => p.page === page);
  const ui = tasks.get(row.ui_issue);
  const bindings = read(path.join(pagesRoot, page, 'api.json'));
  same(row.api_owners, new Set(bindings.bindings.map(b => [...index.coverage.operations, ...index.coverage.additional_operations].find(o => o.id === b.id)?.owner)), `Page API owners: ${page}`);
  same(row.gap_owners, new Set(bindings.gaps.map(g => index.gap_owners[g])), `Page gap owners: ${page}`);
  assert(ui?.lane === 'A' && ui.pages.includes(page), `UI owner: ${page}`);
  assert(tasks.has(row.connection_issue), `Connection owner: ${page}`);
  same(row.requirement_ids, req.map(r => r.id), `Requirements: ${page}`);
  same(row.acceptance_ids, acc.map(a => a.id), `Acceptance: ${page}`);
  requirements += req.length;
  capabilities += req.filter(r => r.kind === 'capability').length;
  acceptance += acc.length;
}
const operations = Object.entries(api.paths).flatMap(([p, methods]) => Object.entries(methods)
  .filter(([, o]) => o.operationId).map(([method, o]) => ({ id: o.operationId, method, path: p })));
const allOperations = [...index.coverage.operations, ...index.coverage.additional_operations];
same(allOperations.map(o => o.id), operations.map(o => o.id), 'Operation coverage including integrated CORE additions');
same(index.tasks.flatMap(t => t.owned_operations), index.coverage.operations.map(o => o.id), 'Original operation ownership stays unchanged');
for (const op of index.coverage.additional_operations) assert.equal(op.owner, 'CORE');
for (const op of operations) {
  const row = allOperations.find(o => o.id === op.id);
  assert.equal(row.method, op.method);
  assert.equal(row.path, op.path);
  assert(tasks.get(row.owner)?.owned_operations.includes(op.id) || index.coverage.additional_operations.includes(row), `Operation owner: ${op.id}`);
}
let mappedRequirements = 0, mappedAcceptance = 0;
for (const [id, pair] of Object.entries(split.pairs)) {
  const ui = tasks.get(id), connection = tasks.get(pair.connection_task);
  same(ui.requirement_ids, pair.criteria.map(c => c.source_requirement_id), `Mapped requirements: ${id}`);
  same(ui.acceptance_ids, pair.criteria.flatMap(c => c.source_acceptance_ids), `Mapped acceptance: ${id}`);
  same(connection.requirement_ids, ui.requirement_ids, `Connection retains source IDs: ${id}`);
  assert.deepEqual(connection.hard_dependencies, []);
  assert.deepEqual(connection.start_gate, split.connection_start_policy.handoffs[pair.connection_task]);

  for (const criterion of pair.criteria) {
    const folder = path.join(pagesRoot, criterion.page);
    assert.deepEqual(criterion.source_requirement, read(path.join(folder, 'requirements.json')).find(x => x.id === criterion.source_requirement_id));
    assert.deepEqual(criterion.source_acceptance, read(path.join(folder, 'acceptance.json')).filter(x => x.requirement === criterion.source_requirement_id));
    assert(criterion.ui_check && criterion.connection_check && criterion.failure_check);
    mappedRequirements++;
    mappedAcceptance += criterion.source_acceptance_ids.length;
  }
  for (const page of pair.pages) {
    const binding = read(path.join(pagesRoot, page.page, 'api.json'));
    assert.deepEqual(page.api_bindings, binding.bindings, `Original binding: ${page.page}`);
    assert.deepEqual(page.api_gaps, binding.gaps, `Original gaps: ${page.page}`);
  }
}
assert.equal(mappedRequirements, requirements);
assert.equal(mappedAcceptance, acceptance);
for (const task of index.tasks) {
  const actual = graph.tasks.find(x => x.id === task.id);
  const withoutPriority = ({priority, effective_priority, ...rest}) => rest;
  assert.deepEqual(withoutPriority(actual), withoutPriority(task), `Index/graph: ${task.id}`);
  assert.equal(graph.task_policy.issue_numbers[task.id], task.github_issue);
}
same(Object.keys(index.gap_owners), gaps.map(g => g.id), 'Gap coverage');
for (const gap of gaps) assert(tasks.get(index.gap_owners[gap.id])?.owned_gaps.includes(gap.id), `Gap owner: ${gap.id}`);
const visiting = new Set(), visited = new Set();
function visit(id, chain = []) {
  assert(tasks.has(id), `Unknown dependency: ${id}`);
  assert(!visiting.has(id), `Dependency cycle: ${[...chain, id].join(' -> ')}`);
  if (visited.has(id)) return;
  visiting.add(id);
  const task = tasks.get(id);
  for (const dep of [...task.hard_dependencies, ...task.connect_after]) visit(dep, [...chain, id]);
  visiting.delete(id); visited.add(id);
}
for (const id of tasks.keys()) visit(id);
const first = Object.entries(index.lanes).map(([lane, config]) => {
  const t = tasks.get(config.first);
  assert.equal(t.lane, lane); assert.equal(t.hard_dependencies.length, 0);
  same([config.first, ...config.queue], index.tasks.filter(t => t.lane === lane).map(t => t.id), `Complete queue: ${lane}`);
  for (const id of [...config.reserve, ...config.next_candidates]) assert.equal(tasks.get(id)?.lane, lane, `Queue owner: ${id}`);
  return t;
});
assert.equal(first.length, 4);
const overlaps = (a, b) => a === b || (a.endsWith('/') && b.startsWith(a)) || (b.endsWith('/') && a.startsWith(b));
for (let i = 0; i < first.length; i++) for (let j = i + 1; j < first.length; j++)
  for (const a of first[i].write_paths) for (const b of first[j].write_paths)
    assert(!overlaps(a, b), `Initial path conflict: ${first[i].id}/${first[j].id}: ${a} ${b}`);
const documents = ['README.md', 'execution.md', 'delivery.md', 'connect-start.md', 'coverage.md', 'contract-gates.md', ...index.tasks.map(t => t.issue_file)];
for (const relative of documents) {
  const file = path.join(root, relative), text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    assert(fs.existsSync(path.resolve(path.dirname(file), decodeURI(target))), `Broken link in ${relative}: ${target}`);
  }
}
assert.equal(index.counts.tasks, tasks.size);
assert.equal(index.counts.pages, pages.length);
assert.equal(index.counts.requirements, requirements);
assert.equal(index.counts.capabilities, capabilities);
assert.equal(index.counts.existing_operations, index.coverage.operations.length);
assert.equal(index.counts.current_operations, operations.length);
assert.equal(index.counts.gaps, gaps.length);
console.log(JSON.stringify({ status: 'PASS', issues: tasks.size, pages: pages.length, requirements, capabilities, acceptance,
  operations: operations.length, gaps: gaps.length, dependencyCycles: 0, initialPathConflicts: 0, documents: documents.length,
  limit: 'Document correspondence only; product acceptance and runtime utilization are not verified.' }, null, 2));
