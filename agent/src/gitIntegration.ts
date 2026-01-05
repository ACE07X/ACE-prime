import simpleGit, { SimpleGit, DiffResult } from 'simple-git';
import * as path from 'path';

export interface GitChange {
    type: 'added' | 'modified' | 'deleted' | 'renamed';
    file: string;
    insertions: number;
    deletions: number;
}

export interface CommitInfo {
    hash: string;
    author: string;
    date: string;
    message: string;
    changes: GitChange[];
}

export class GitIntegration {
    private git: SimpleGit;
    private rootDir: string;

    constructor(rootDir: string) {
        this.rootDir = path.resolve(rootDir);
        this.git = simpleGit(this.rootDir);
    }

    async isGitRepo(): Promise<boolean> {
        try {
            await this.git.status();
            return true;
        } catch {
            return false;
        }
    }

    async getRecentCommits(count = 10): Promise<CommitInfo[]> {
        try {
            const log = await this.git.log({ maxCount: count });
            const commits: CommitInfo[] = [];

            for (const commit of log.all) {
                const diff = await this.git.diffSummary([`${commit.hash}^`, commit.hash]).catch(() => null);

                commits.push({
                    hash: commit.hash,
                    author: commit.author_name,
                    date: commit.date,
                    message: commit.message,
                    changes: diff?.files.map(f => ({
                        type: f.binary ? 'modified' : (f.insertions > 0 && f.deletions === 0 ? 'added' : 'modified'),
                        file: f.file,
                        insertions: f.insertions,
                        deletions: f.deletions,
                    })) || [],
                });
            }

            return commits;
        } catch (error) {
            console.error('Git log error:', error);
            return [];
        }
    }

    async getUncommittedChanges(): Promise<GitChange[]> {
        try {
            const status = await this.git.status();
            const changes: GitChange[] = [];

            status.created.forEach(file => {
                changes.push({ type: 'added', file, insertions: 0, deletions: 0 });
            });

            status.modified.forEach(file => {
                changes.push({ type: 'modified', file, insertions: 0, deletions: 0 });
            });

            status.deleted.forEach(file => {
                changes.push({ type: 'deleted', file, insertions: 0, deletions: 0 });
            });

            status.renamed.forEach(file => {
                changes.push({ type: 'renamed', file: file.to, insertions: 0, deletions: 0 });
            });

            return changes;
        } catch (error) {
            console.error('Git status error:', error);
            return [];
        }
    }

    async getCurrentBranch(): Promise<string> {
        try {
            const branch = await this.git.branch();
            return branch.current;
        } catch {
            return 'unknown';
        }
    }

    async getDiff(file?: string): Promise<string> {
        try {
            if (file) {
                return await this.git.diff([file]);
            }
            return await this.git.diff();
        } catch {
            return '';
        }
    }

    async getChangedFilesSince(commitHash: string): Promise<string[]> {
        try {
            const diff = await this.git.diffSummary([commitHash, 'HEAD']);
            return diff.files.map(f => f.file);
        } catch {
            return [];
        }
    }
}
