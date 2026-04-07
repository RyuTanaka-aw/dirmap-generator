import { NextResponse } from 'next/server';
import { getCrawlJob } from '@/lib/crawlJobs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: '無効なジョブIDです' }, { status: 400 });
  }

  try {
    const job = await getCrawlJob(id);

    if (!job) {
      return NextResponse.json({ error: 'ジョブが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('ジョブ取得エラー:', error);
    return NextResponse.json(
      { error: 'クロールジョブの取得に失敗しました' },
      { status: 500 }
    );
  }
}
