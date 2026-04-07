import { NextResponse } from 'next/server';
import { createCrawlJob, isActiveJobExistsError } from '@/lib/crawlJobs';
import type { CrawlRequest } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<CrawlRequest>;

    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json({ error: 'URLが必要です' }, { status: 400 });
    }

    const job = await createCrawlJob({
      url: body.url,
      username: body.username,
      password: body.password,
      excludePatterns: Array.isArray(body.excludePatterns) ? body.excludePatterns : [],
      includeDirectoryColumns: Boolean(body.includeDirectoryColumns),
      devDomain: body.devDomain
    });

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt
      },
      { status: 202 }
    );
  } catch (error) {
    if (isActiveJobExistsError(error)) {
      return NextResponse.json(
        {
          error: '別のクロールジョブが実行中です',
          activeJobId: error.activeJobId
        },
        { status: 409 }
      );
    }

    console.error('ジョブ作成エラー:', error);
    return NextResponse.json(
      { error: 'クロールジョブの作成に失敗しました' },
      { status: 500 }
    );
  }
}
