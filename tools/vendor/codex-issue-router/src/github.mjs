import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
export class GitHub {
  constructor(executable = process.env.ISSUE_ROUTER_GH || 'gh') { this.executable = executable; }
  async api(endpoint, extra = []) {
    const { stdout } = await exec(this.executable, ['api', '-H', 'Accept: application/vnd.github+json', endpoint, ...extra], { timeout: 30000, maxBuffer: 20 * 1024 * 1024 });
    return stdout.trim() ? JSON.parse(stdout) : null;
  }
  user() { return this.api('user'); }
  async collaborators(repo) { return (await this.api(`repos/${repo}/collaborators?per_page=100`, ['--paginate', '--slurp'])).flat().map(u => u.login); }
  issue(repo, issue) { return this.api(`repos/${repo}/issues/${issue}`); }
  async comments(repo, issue, since) {
    return (await this.api(`repos/${repo}/issues/${issue}/comments?per_page=100&since=${encodeURIComponent(since)}`, ['--paginate', '--slurp'])).flat();
  }
  eyes(repo, id) { return this.api(`repos/${repo}/issues/comments/${id}/reactions`, ['--method', 'POST', '-f', 'content=eyes']); }
}
