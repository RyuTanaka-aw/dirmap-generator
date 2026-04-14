import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { FeedbackEntry, FeedbackData } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(FEEDBACK_FILE);
  } catch {
    const initialData: FeedbackData = { version: '1.0', feedbacks: [] };
    await fs.writeFile(FEEDBACK_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

async function readFeedbackData(): Promise<FeedbackData> {
  try {
    await ensureDataDir();
    const content = await fs.readFile(FEEDBACK_FILE, 'utf-8');
    return JSON.parse(content) as FeedbackData;
  } catch (error) {
    console.error('フィードバック読み込みエラー:', error);
    return { version: '1.0', feedbacks: [] };
  }
}

export async function getFeedbacks(): Promise<FeedbackEntry[]> {
  const data = await readFeedbackData();
  return data.feedbacks;
}

// 同時書き込み競合を防ぐ簡易 mutex
let writeQueue: Promise<void> = Promise.resolve();

export function addFeedback(message: string): Promise<FeedbackEntry> {
  const result = writeQueue.then(async () => {
    await ensureDataDir();
    const data = await readFeedbackData();

    const entry: FeedbackEntry = {
      id: uuidv4(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    data.feedbacks.unshift(entry);

    // 一時ファイルへ書き込んだ後 rename で原子的に更新
    const tmpFile = `${FEEDBACK_FILE}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tmpFile, FEEDBACK_FILE);

    return entry;
  });

  writeQueue = result.then(() => undefined).catch(() => undefined);

  return result;
}
