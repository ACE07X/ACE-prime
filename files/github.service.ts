/**
 * Ultra ACE - GitHub Service
 * Comprehensive GitHub integration with secure operations
 */

import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit, CleanOptions } from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { log } from '../utils/logger';
import type {
  GitHubRepo,
  GitHubCommit,
  GitHubPullRequest,
  GitHubIssue,
  GitOperationResult,
  ServiceResult,
} from '../types';

interface GitHubConfig {
  token: string;
  org: string;
  defaultBranch: string;
}

export class GitHubService {
  private octokit: Octokit;
  private org: string;
  private defaultBranch: string;
  private workDir: string;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.org = config.org;
    this.defaultBranch = config.defaultBranch;
    this.workDir = path.join(os.tmpdir(), 'ultra-ace-repos');
    this.ensureWorkDir();
  }

  private async ensureWorkDir(): Promise<void> {
    try {
      await fs.mkdir(this.workDir, { recursive: true });
    } catch (err) {
      log.error('Failed to create work directory', err);
    }
  }

  private getRepoPath(repoName: string): string {
    return path.join(this.workDir, repoName.replace('/', '-'));
  }

  private async getGit(repoPath: string): Promise<SimpleGit> {
    await fs.mkdir(repoPath, { recursive: true });
    return simpleGit(repoPath);
  }

  /**
   * List repositories in the organization
   */
  async listRepos(): Promise<ServiceResult<GitHubRepo[]>> {
    try {
      const { data } = await this.octokit.repos.listForOrg({
        org: this.org,
        sort: 'updated',
        per_page: 100,
      });

      const repos: GitHubRepo[] = data.map(repo => ({
        name: repo.name,
        full_name: repo.full_name,
        clone_url: repo.clone_url || '',
        ssh_url: repo.ssh_url || '',
        default_branch: repo.default_branch || 'main',
        private: repo.private,
      }));

      return { success: true, data: repos };
    } catch (err) {
      log.error('Failed to list repos', err);
      return { success: false, error: 'Failed to list repositories' };
    }
  }

  /**
   * Get repository details
   */
  async getRepo(repoName: string): Promise<ServiceResult<GitHubRepo>> {
    try {
      const { data } = await this.octokit.repos.get({
        owner: this.org,
        repo: repoName,
      });

      return {
        success: true,
        data: {
          name: data.name,
          full_name: data.full_name,
          clone_url: data.clone_url || '',
          ssh_url: data.ssh_url || '',
          default_branch: data.default_branch || 'main',
          private: data.private,
        },
      };
    } catch (err) {
      log.error('Failed to get repo', err);
      return { success: false, error: `Repository "${repoName}" not found` };
    }
  }

  /**
   * Clone or pull a repository
   */
  async pull(repoName: string, branch?: string): Promise<GitOperationResult> {
    try {
      const repoPath = this.getRepoPath(repoName);
      const targetBranch = branch || this.defaultBranch;

      const exists = await fs.access(path.join(repoPath, '.git'))
        .then(() => true)
        .catch(() => false);

      let git: SimpleGit;

      if (exists) {
        git = await this.getGit(repoPath);
        await git.clean(CleanOptions.FORCE + CleanOptions.REMOVE_UNTRACKED);
        await git.reset(['--hard']);
        await git.fetch('origin');
        await git.checkout(targetBranch);
        await git.pull('origin', targetBranch);

        log.github('pull', repoName, { branch: targetBranch });

        const commits = await this.getRecentCommits(repoName, 5);

        return {
          success: true,
          message: `Successfully pulled latest changes from ${repoName}`,
          data: { branch: targetBranch, commits: commits.data },
        };
      } else {
        const cloneUrl = `https://github.com/${this.org}/${repoName}.git`;
        git = simpleGit();

        await git.clone(cloneUrl, repoPath, ['--branch', targetBranch, '--single-branch']);

        log.github('clone', repoName, { branch: targetBranch });

        return {
          success: true,
          message: `Successfully cloned ${repoName}`,
          data: { branch: targetBranch },
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('Git pull failed', err);
      return { success: false, message: `Failed to pull ${repoName}`, error: message };
    }
  }

  /**
   * Push changes to a repository
   * IMPORTANT: Requires confirmation for destructive operations
   */
  async push(
    repoName: string,
    commitMessage: string,
    options: { branch?: string; files?: string[]; force?: boolean; confirmed?: boolean } = {}
  ): Promise<GitOperationResult> {
    const { branch, files, force = false, confirmed = false } = options;

    if (force && !confirmed) {
      return {
        success: false,
        message: '⚠️ Force push requires explicit confirmation. This will overwrite remote history.',
        error: 'CONFIRMATION_REQUIRED',
      };
    }

    try {
      const repoPath = this.getRepoPath(repoName);
      const git = await this.getGit(repoPath);

      const exists = await fs.access(path.join(repoPath, '.git'))
        .then(() => true)
        .catch(() => false);

      if (!exists) {
        return {
          success: false,
          message: `Repository ${repoName} not found locally. Run /github pull first.`,
          error: 'REPO_NOT_FOUND',
        };
      }

      const targetBranch = branch || this.defaultBranch;

      if (files && files.length > 0) {
        await git.add(files);
      } else {
        await git.add('.');
      }

      const status = await git.status();
      if (status.staged.length === 0) {
        return { success: false, message: 'No changes to commit', error: 'NO_CHANGES' };
      }

      const cleanMessage = this.sanitizeCommitMessage(commitMessage);
      const commitResult = await git.commit(cleanMessage);

      const pushArgs: string[] = ['origin', targetBranch];
      if (force) pushArgs.push('--force');

      await git.push(pushArgs);

      log.github('push', repoName, { branch: targetBranch, sha: commitResult.commit, force });

      return {
        success: true,
        message: `Successfully pushed to ${repoName}`,
        data: { sha: commitResult.commit, branch: targetBranch, files_changed: status.staged },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('Git push failed', err);
      return { success: false, message: `Failed to push to ${repoName}`, error: message };
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(repoName: string, branchName: string, fromBranch?: string): Promise<GitOperationResult> {
    try {
      const repoPath = this.getRepoPath(repoName);
      const git = await this.getGit(repoPath);
      const sourceBranch = fromBranch || this.defaultBranch;

      await git.checkout(sourceBranch);
      await git.pull('origin', sourceBranch);
      await git.checkoutLocalBranch(branchName);
      await git.push('origin', branchName, ['--set-upstream']);

      log.github('branch:create', repoName, { branch: branchName, from: sourceBranch });

      return {
        success: true,
        message: `Created branch "${branchName}" from "${sourceBranch}"`,
        data: { branch: branchName },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      log.error('Branch creation failed', err);
      return { success: false, message: `Failed to create branch "${branchName}"`, error: message };
    }
  }

  /**
   * Get recent commits
   */
  async getRecentCommits(repoName: string, count: number = 10): Promise<ServiceResult<GitHubCommit[]>> {
    try {
      const { data } = await this.octokit.repos.listCommits({
        owner: this.org,
        repo: repoName,
        per_page: count,
      });

      const commits: GitHubCommit[] = data.map(commit => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0],
        author: commit.commit.author?.name || 'Unknown',
        date: commit.commit.author?.date || '',
        url: commit.html_url,
      }));

      return { success: true, data: commits };
    } catch (err) {
      log.error('Failed to get commits', err);
      return { success: false, error: 'Failed to fetch commits' };
    }
  }

  /**
   * List pull requests
   */
  async listPullRequests(repoName: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<ServiceResult<GitHubPullRequest[]>> {
    try {
      const { data } = await this.octokit.pulls.list({
        owner: this.org,
        repo: repoName,
        state,
        per_page: 25,
      });

      const prs: GitHubPullRequest[] = data.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.merged_at ? 'merged' : (pr.state as 'open' | 'closed'),
        author: pr.user?.login || 'Unknown',
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        url: pr.html_url,
      }));

      return { success: true, data: prs };
    } catch (err) {
      log.error('Failed to list PRs', err);
      return { success: false, error: 'Failed to fetch pull requests' };
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    repoName: string,
    title: string,
    body: string,
    options: { head: string; base?: string }
  ): Promise<ServiceResult<GitHubPullRequest>> {
    try {
      const { data } = await this.octokit.pulls.create({
        owner: this.org,
        repo: repoName,
        title,
        body,
        head: options.head,
        base: options.base || this.defaultBranch,
      });

      log.github('pr:create', repoName, { number: data.number, head: options.head });

      return {
        success: true,
        data: {
          number: data.number,
          title: data.title,
          state: 'open',
          author: data.user?.login || 'Unknown',
          created_at: data.created_at,
          updated_at: data.updated_at,
          url: data.html_url,
        },
      };
    } catch (err) {
      log.error('Failed to create PR', err);
      return { success: false, error: 'Failed to create pull request' };
    }
  }

  /**
   * List issues
   */
  async listIssues(repoName: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<ServiceResult<GitHubIssue[]>> {
    try {
      const { data } = await this.octokit.issues.listForRepo({
        owner: this.org,
        repo: repoName,
        state,
        per_page: 25,
      });

      const issues: GitHubIssue[] = data
        .filter(issue => !issue.pull_request)
        .map(issue => ({
          number: issue.number,
          title: issue.title,
          state: issue.state as 'open' | 'closed',
          author: issue.user?.login || 'Unknown',
          labels: issue.labels.map(l => (typeof l === 'string' ? l : l.name || '')),
          created_at: issue.created_at,
          url: issue.html_url,
        }));

      return { success: true, data: issues };
    } catch (err) {
      log.error('Failed to list issues', err);
      return { success: false, error: 'Failed to fetch issues' };
    }
  }

  /**
   * Create an issue
   */
  async createIssue(repoName: string, title: string, body: string, labels?: string[]): Promise<ServiceResult<GitHubIssue>> {
    try {
      const { data } = await this.octokit.issues.create({
        owner: this.org,
        repo: repoName,
        title,
        body,
        labels,
      });

      log.github('issue:create', repoName, { number: data.number });

      return {
        success: true,
        data: {
          number: data.number,
          title: data.title,
          state: 'open',
          author: data.user?.login || 'Unknown',
          labels: data.labels.map(l => (typeof l === 'string' ? l : l.name || '')),
          created_at: data.created_at,
          url: data.html_url,
        },
      };
    } catch (err) {
      log.error('Failed to create issue', err);
      return { success: false, error: 'Failed to create issue' };
    }
  }

  /**
   * Get file contents from repository
   */
  async getFileContent(repoName: string, filePath: string, branch?: string): Promise<ServiceResult<string>> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.org,
        repo: repoName,
        path: filePath,
        ref: branch || this.defaultBranch,
      });

      if (Array.isArray(data)) {
        return { success: false, error: 'Path is a directory' };
      }

      if (data.type !== 'file' || !('content' in data)) {
        return { success: false, error: 'Not a file' };
      }

      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { success: true, data: content };
    } catch (err) {
      log.error('Failed to get file content', err);
      return { success: false, error: 'Failed to fetch file content' };
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(repoName: string, dirPath: string = '', branch?: string): Promise<ServiceResult<{ name: string; type: 'file' | 'dir'; path: string }[]>> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.org,
        repo: repoName,
        path: dirPath,
        ref: branch || this.defaultBranch,
      });

      if (!Array.isArray(data)) {
        return { success: false, error: 'Path is not a directory' };
      }

      const items = data.map(item => ({
        name: item.name,
        type: (item.type === 'dir' ? 'dir' : 'file') as 'file' | 'dir',
        path: item.path,
      }));

      return { success: true, data: items };
    } catch (err) {
      log.error('Failed to list directory', err);
      return { success: false, error: 'Failed to list directory' };
    }
  }

  private sanitizeCommitMessage(message: string): string {
    return message
      .replace(/[<>]/g, '')
      .replace(/\r\n/g, '\n')
      .trim()
      .substring(0, 500);
  }

  /**
   * Get diff between two branches
   */
  async getDiff(repoName: string, base: string, head: string): Promise<ServiceResult<{ files_changed: number; additions: number; deletions: number }>> {
    try {
      const { data } = await this.octokit.repos.compareCommits({
        owner: this.org,
        repo: repoName,
        base,
        head,
      });

      return {
        success: true,
        data: {
          files_changed: data.files?.length || 0,
          additions: data.files?.reduce((sum, f) => sum + (f.additions || 0), 0) || 0,
          deletions: data.files?.reduce((sum, f) => sum + (f.deletions || 0), 0) || 0,
        },
      };
    } catch (err) {
      log.error('Failed to get diff', err);
      return { success: false, error: 'Failed to compare branches' };
    }
  }

  /**
   * Get repository status
   */
  async getLocalStatus(repoName: string): Promise<ServiceResult<{ current: string; modified: string[]; staged: string[]; untracked: string[] }>> {
    try {
      const repoPath = this.getRepoPath(repoName);
      const git = await this.getGit(repoPath);
      const status = await git.status();

      return {
        success: true,
        data: {
          current: status.current || 'unknown',
          modified: status.modified,
          staged: status.staged,
          untracked: status.not_added,
        },
      };
    } catch (err) {
      log.error('Failed to get status', err);
      return { success: false, error: 'Failed to get repository status' };
    }
  }

  /**
   * Clean up local repository
   */
  async cleanup(repoName: string): Promise<ServiceResult<void>> {
    try {
      const repoPath = this.getRepoPath(repoName);
      await fs.rm(repoPath, { recursive: true, force: true });
      log.info('Repository cleaned up', { repoName });
      return { success: true };
    } catch (err) {
      log.error('Failed to cleanup repo', err);
      return { success: false, error: 'Failed to cleanup repository' };
    }
  }
}

export function createGitHubService(): GitHubService {
  const config: GitHubConfig = {
    token: process.env.GITHUB_TOKEN || '',
    org: process.env.GITHUB_ORG || '',
    defaultBranch: process.env.GITHUB_DEFAULT_BRANCH || 'main',
  };
  return new GitHubService(config);
}

export const githubService = createGitHubService();
export default githubService;
