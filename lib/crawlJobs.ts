import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { crawlSiteFlat, buildHierarchy } from '@/lib/crawler';
import { generateExcelFromCrawlResult } from '@/lib/excelGenerator';
import { addSitemapMetadata, saveExcelFile } from '@/lib/fileManager';
import type { CrawlJobDetail, CrawlRequest, CrawlResult } from '@/lib/types';

interface PageRecord {
  url: string;
  title: string;
  description: string;
}

interface JobLock {
  jobId: string;
  createdAt: string;
}

class ActiveJobExistsError extends Error {
  constructor(public activeJobId?: string) {
    super('別のクロールジョブが実行中です');
  }
}

const DATA_DIR = path.join(process.cwd(), 'data');
const JOBS_DIR = path.join(DATA_DIR, 'jobs');
const ACTIVE_JOB_LOCK_FILE = path.join(JOBS_DIR, 'active-job.lock');
const STALE_JOB_MESSAGE = 'サーバー再起動またはプロセス終了により中断されました';
const STALE_JOB_THRESHOLD_MS = 60 * 1000; // 最終更新から1分以上経過でstale判定
const activeJobIds = new Set<string>();

function getJobDirectory(jobId: string): string {
  return path.join(JOBS_DIR, jobId);
}

function getJobFilePath(jobId: string): string {
  return path.join(getJobDirectory(jobId), 'job.json');
}

function getPagesFilePath(jobId: string): string {
  return path.join(getJobDirectory(jobId), 'pages.ndjson');
}

function getEventsFilePath(jobId: string): string {
  return path.join(getJobDirectory(jobId), 'events.ndjson');
}

function isJobOpen(status: CrawlJobDetail['status']): boolean {
  return status === 'queued' || status === 'running';
}

function calculateProgressPercent(visitedCount: number, queuedCount: number): number {
  if (visitedCount === 0 && queuedCount === 0) {
    return 0;
  }

  if (queuedCount === 0) {
    return 100;
  }

  return Math.min(99, Math.round((visitedCount / (visitedCount + queuedCount)) * 100));
}

async function ensureJobDirectories(): Promise<void> {
  await fs.mkdir(JOBS_DIR, { recursive: true });
}

async function appendNdjson(filePath: string, payload: unknown): Promise<void> {
  await fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, 'utf-8');
}

async function writeJob(job: CrawlJobDetail): Promise<void> {
  await ensureJobDirectories();
  await fs.mkdir(getJobDirectory(job.id), { recursive: true });
  await fs.writeFile(getJobFilePath(job.id), JSON.stringify(job, null, 2), 'utf-8');
}

async function readJob(jobId: string): Promise<CrawlJobDetail | null> {
  try {
    const content = await fs.readFile(getJobFilePath(jobId), 'utf-8');
    return JSON.parse(content) as CrawlJobDetail;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function readActiveJobLock(): Promise<JobLock | null> {
  try {
    const content = await fs.readFile(ACTIVE_JOB_LOCK_FILE, 'utf-8');
    return JSON.parse(content) as JobLock;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function acquireActiveJobLock(jobId: string): Promise<void> {
  const lockPayload: JobLock = {
    jobId,
    createdAt: new Date().toISOString()
  };

  try {
    const handle = await fs.open(ACTIVE_JOB_LOCK_FILE, 'wx');
    await handle.writeFile(JSON.stringify(lockPayload, null, 2), 'utf-8');
    await handle.close();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      const activeLock = await readActiveJobLock();
      throw new ActiveJobExistsError(activeLock?.jobId);
    }
    throw error;
  }
}

async function releaseActiveJobLock(jobId: string): Promise<void> {
  const activeLock = await readActiveJobLock();
  if (!activeLock || activeLock.jobId !== jobId) {
    return;
  }

  await fs.unlink(ACTIVE_JOB_LOCK_FILE).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  });
}

async function updateJob(
  jobId: string,
  updater: (job: CrawlJobDetail) => CrawlJobDetail | Promise<CrawlJobDetail>
): Promise<CrawlJobDetail> {
  const currentJob = await readJob(jobId);
  if (!currentJob) {
    throw new Error(`ジョブ ${jobId} が見つかりません`);
  }

  const updatedJob = await updater(currentJob);
  await writeJob(updatedJob);
  return updatedJob;
}

async function reconstructCrawlResult(job: CrawlJobDetail): Promise<CrawlResult> {
  const content = await fs.readFile(getPagesFilePath(job.id), 'utf-8');
  const pages = new Map<string, PageRecord>();

  for (const line of content.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    const page = JSON.parse(line) as PageRecord;
    pages.set(page.url, page);
  }

  const hierarchy = buildHierarchy(pages, job.requestedUrl);
  return {
    ...hierarchy,
    completed_at: job.completedAt
  };
}

async function finalizeJobSuccess(jobId: string): Promise<void> {
  const job = await updateJob(jobId, (currentJob) => ({
    ...currentJob,
    status: 'completed',
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    progressPercent: 100
  }));

  try {
    const crawlResult = await reconstructCrawlResult(job);
    const { buffer } = await generateExcelFromCrawlResult({
      crawlResult,
      completedAt: job.completedAt,
      includeDirectoryColumns: job.options.includeDirectoryColumns,
      devDomain: job.options.devDomain
    });

    const timestamp = job.completedAt ? new Date(job.completedAt) : undefined;
    const { filePath, fileName } = await saveExcelFile(buffer, job.requestedUrl, timestamp);

    await addSitemapMetadata(
      job.requestedUrl,
      crawlResult.title,
      fileName,
      filePath,
      crawlResult
    );

    await updateJob(jobId, (currentJob) => ({
      ...currentJob,
      artifactStatus: 'ready',
      resultFileName: fileName,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateJob(jobId, (currentJob) => ({
      ...currentJob,
      artifactStatus: 'failed',
      artifactError: errorMessage,
      updatedAt: new Date().toISOString()
    }));
  } finally {
    await releaseActiveJobLock(jobId);
  }
}

async function detectFirstPageError(jobId: string): Promise<string> {
  try {
    const content = await fs.readFile(getEventsFilePath(jobId), 'utf-8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as { type: string; error?: string };
      if (event.type === 'page_error' && event.error) {
        if (event.error.includes('403')) {
          return '対象サーバーによりアクセスが拒否されました。クローラーのアクセスがブロックされている可能性があります。';
        }
        if (event.error.includes('401') || event.error.includes('認証に失敗')) {
          return '認証に失敗しました。ユーザー名とパスワードを確認してください。';
        }
      }
    }
  } catch {
    // events.ndjson が読めない場合は汎用メッセージ
  }
  return 'クロールに成功したページがありませんでした';
}

async function failJob(jobId: string, errorMessage: string): Promise<void> {
  await updateJob(jobId, (currentJob) => ({
    ...currentJob,
    status: 'failed',
    error: errorMessage,
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  }));
  await releaseActiveJobLock(jobId);
}

async function runJob(jobId: string): Promise<void> {
  try {
    await updateJob(jobId, (currentJob) => ({
      ...currentJob,
      status: 'running',
      startedAt: currentJob.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const job = await readJob(jobId);
    if (!job) {
      throw new Error(`ジョブ ${jobId} が見つかりません`);
    }

    await crawlSiteFlat(
      job.requestedUrl,
      {
        url: job.options.url,
        username: job.options.username,
        password: job.options.password,
        excludePatterns: job.options.excludePatterns,
        maxPages: job.options.maxPages
      },
      {
        collectPages: false,
        onPage: async (page) => {
          await appendNdjson(getPagesFilePath(jobId), page);
        },
        onError: async (url, errorMessage) => {
          await appendNdjson(getEventsFilePath(jobId), {
            type: 'page_error',
            url,
            error: errorMessage,
            createdAt: new Date().toISOString()
          });
        },
        onProgress: async (event) => {
          await updateJob(jobId, (currentJob) => ({
            ...currentJob,
            visitedCount: event.visitedCount,
            queuedCount: event.queuedCount,
            failedCount: event.failedCount,
            lastProcessedUrl: event.lastProcessedUrl,
            progressPercent: calculateProgressPercent(event.visitedCount, event.queuedCount),
            updatedAt: new Date().toISOString()
          }));
        }
      }
    );

    const finalJob = await readJob(jobId);
    const successCount = (finalJob?.visitedCount ?? 0) - (finalJob?.failedCount ?? 0);

    if (successCount <= 0) {
      const failMessage = await detectFirstPageError(jobId);
      await failJob(jobId, failMessage);
    } else {
      await finalizeJobSuccess(jobId);
    }
  } finally {
    activeJobIds.delete(jobId);
  }
}

export async function cleanupStaleJob(): Promise<void> {
  await ensureJobDirectories();
  const activeLock = await readActiveJobLock();

  if (!activeLock) {
    return;
  }

  const job = await readJob(activeLock.jobId);
  if (!job || !isJobOpen(job.status)) {
    await releaseActiveJobLock(activeLock.jobId);
    return;
  }

  if (activeJobIds.has(activeLock.jobId)) {
    return;
  }

  // 最近更新されているジョブはまだ動作中とみなす（Hot Reload等によるfalse positive防止）
  const lastUpdate = new Date(job.updatedAt).getTime();
  if (Date.now() - lastUpdate < STALE_JOB_THRESHOLD_MS) {
    return;
  }

  await updateJob(activeLock.jobId, (currentJob) => ({
    ...currentJob,
    status: 'failed',
    error: STALE_JOB_MESSAGE,
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  }));
  await appendNdjson(getEventsFilePath(activeLock.jobId), {
    type: 'stale_job_cleanup',
    error: STALE_JOB_MESSAGE,
    createdAt: new Date().toISOString()
  });
  await releaseActiveJobLock(activeLock.jobId);
}

export async function createCrawlJob(options: CrawlRequest): Promise<CrawlJobDetail> {
  await ensureJobDirectories();
  await cleanupStaleJob();

  const createdAt = new Date().toISOString();
  const jobId = randomUUID();

  await acquireActiveJobLock(jobId);
  try {
    const job: CrawlJobDetail = {
      id: jobId,
      status: 'queued',
      artifactStatus: 'pending',
      requestedUrl: options.url,
      createdAt,
      updatedAt: createdAt,
      visitedCount: 0,
      queuedCount: 0,
      failedCount: 0,
      progressPercent: 0,
      options: {
        url: options.url,
        username: options.username,
        password: options.password,
        excludePatterns: options.excludePatterns ?? [],
        includeDirectoryColumns: options.includeDirectoryColumns ?? false,
        devDomain: options.devDomain,
        maxPages: options.maxPages
      }
    };

    await fs.mkdir(getJobDirectory(jobId), { recursive: true });
    await fs.writeFile(getPagesFilePath(jobId), '', 'utf-8');
    await fs.writeFile(getEventsFilePath(jobId), '', 'utf-8');
    await writeJob(job);
    activeJobIds.add(jobId);

    setTimeout(() => {
      void runJob(jobId).catch(async (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await appendNdjson(getEventsFilePath(jobId), {
          type: 'job_error',
          error: errorMessage,
          createdAt: new Date().toISOString()
        }).catch(() => {});
        await failJob(jobId, errorMessage).catch(() => {});
      });
    }, 0);

    return job;
  } catch (error) {
    activeJobIds.delete(jobId);
    await releaseActiveJobLock(jobId).catch(() => {});
    throw error;
  }
}

export async function getCrawlJob(jobId: string): Promise<CrawlJobDetail | null> {
  await cleanupStaleJob();
  return readJob(jobId);
}

export function isActiveJobExistsError(error: unknown): error is ActiveJobExistsError {
  return error instanceof ActiveJobExistsError;
}
