import { NextResponse } from 'next/server';
import { getFeedbacks, addFeedback } from '@/lib/feedbackManager';
import { validateFeedbackMessage } from '@/lib/validation';

export async function GET() {
  try {
    const feedbacks = await getFeedbacks();
    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error('フィードバック取得エラー:', error);
    return NextResponse.json({ error: 'フィードバックの取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  const { message } = body as { message?: unknown };
  const validationError = validateFeedbackMessage(message);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const entry = await addFeedback(message as string);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('フィードバック保存エラー:', error);
    return NextResponse.json({ error: 'フィードバックの保存に失敗しました' }, { status: 500 });
  }
}
