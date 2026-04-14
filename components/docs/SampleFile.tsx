import { ExternalLink } from "lucide-react";

const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1E6hQWV85i-zzahUwZqpi3DuJC3YVDLKS5-BQ8uX0U88/edit?usp=sharing";

export function SampleFile() {
  return (
    <div className="my-8 not-prose">
      <div className="rounded-lg border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-slate-900">サンプルファイル</p>
          <p className="mt-1 text-sm text-slate-500">
            実際のWebサイトをクロールして生成したサンプルです。データ量が多いため、Google
            スプレッドシートにインポートしたものを公開しています。
          </p>
        </div>
        <a
          href={SPREADSHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 transition-colors"
        >
          Google スプレッドシートで見る
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
