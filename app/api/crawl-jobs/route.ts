import { NextResponse } from 'next/server';
import { createCrawlJob, isActiveJobExistsError } from '@/lib/crawlJobs';
import type { CrawlRequest } from '@/lib/types';
import { validateCrawlForm, hasErrors } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<CrawlRequest>;

    const formValues = {
      url: typeof body.url === 'string' ? body.url : '',
      devDomain: typeof body.devDomain === 'string' ? body.devDomain : '',
      excludePatterns: Array.isArray(body.excludePatterns) ? body.excludePatterns.join(', ') : '',
      useAuth: Boolean(body.username || body.password),
      username: typeof body.username === 'string' ? body.username : '',
      password: typeof body.password === 'string' ? body.password : '',
    };

    const errors = validateCrawlForm(formValues);
    if (hasErrors(errors)) {
      return NextResponse.json({ error: '入力内容に誤りがあります', fields: errors }, { status: 400 });
    }

    const job = await createCrawlJob({
      url: body.url as string,
      username: body.username,
      password: body.password,
      excludePatterns: Array.isArray(body.excludePatterns) ? body.excludePatterns : [],
      includeDirectoryColumns: Boolean(body.includeDirectoryColumns),
      devDomain: body.devDomain,
      maxPages: typeof body.maxPages === 'number' ? body.maxPages : undefined
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
