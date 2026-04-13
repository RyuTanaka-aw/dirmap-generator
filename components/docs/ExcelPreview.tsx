import { Badge } from "@/components/ui/badge";

interface PageData {
  no: number;
  level: number;
  title: string;
  url?: string;
  pageTitle?: string;
  description?: string;
  isSynthetic?: boolean;
}

// サンプルデータ（実際のツール出力に近い内容）
const sampleData: PageData[] = [
  {
    no: 1,
    level: 0,
    title: "テスト株式会社",
    url: "https://test-company.example.com/",
    pageTitle: "テスト株式会社",
    description: "テスト株式会社の公式サイトです",
  },
  {
    no: 2,
    level: 1,
    title: "会社概要",
    url: "https://test-company.example.com/about/",
    pageTitle: "会社概要",
    description: "私たちについて",
  },
  {
    no: 3,
    level: 1,
    title: "products",
    isSynthetic: true,
  },
  {
    no: 4,
    level: 2,
    title: "製品A",
    url: "https://test-company.example.com/products/a/",
    pageTitle: "製品A",
    description: "高性能な製品Aの紹介ページです",
  },
  {
    no: 5,
    level: 2,
    title: "製品B",
    url: "https://test-company.example.com/products/b/",
    pageTitle: "製品B",
    description: "コスパ抜群の製品Bの詳細",
  },
  {
    no: 6,
    level: 1,
    title: "お問い合わせ",
    url: "https://test-company.example.com/contact/",
    pageTitle: "お問い合わせ",
    description: "お気軽にご連絡ください",
  },
];

const maxLevel = 2; // サンプルデータの最大階層

const headers = [
  "No",
  "トップ",
  "第2階層",
  "第3階層",
  "URL",
  "タイトル",
  "ディスクリプション",
  "備考",
];

export function ExcelPreview() {
  return (
    <div className="my-8 not-prose">
      {/* タイトル・日時行 */}
      <div className="border border-slate-200 rounded-t-lg bg-white px-4 py-3">
        <p className="font-medium text-slate-900">
          テスト株式会社 ディレクトリマップ
        </p>
        <div className="flex justify-between items-center mt-1">
          <span />
          <span className="text-xs text-slate-400">
            出力日時: 2026/04/13 14:30
          </span>
        </div>
      </div>

      {/* メインテーブル */}
      <div className="overflow-x-auto border border-t-0 border-slate-200 rounded-b-lg">
        <table className="w-full text-sm border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-slate-50">
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-xs font-medium text-slate-500 text-center border-b border-slate-200 whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sampleData.map((row) => (
              <tr
                key={row.no}
                className={
                  row.isSynthetic
                    ? "bg-amber-50/50"
                    : "bg-white hover:bg-slate-50/50"
                }
              >
                {/* No */}
                <td className="px-3 py-2 text-center text-slate-400 border-b border-slate-100 w-10">
                  {row.no}
                </td>

                {/* 階層列: トップ〜第3階層 */}
                {Array.from({ length: maxLevel + 1 }, (_, i) => (
                  <td
                    key={i}
                    className="px-3 py-2 border-b border-slate-100"
                  >
                    {i === row.level ? (
                      <span
                        className={
                          row.isSynthetic
                            ? "text-slate-400 italic"
                            : "text-slate-900"
                        }
                      >
                        {row.title}
                        {row.isSynthetic && (
                          <Badge
                            variant="outline"
                            className="ml-2 text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 bg-amber-50"
                          >
                            自動補完
                          </Badge>
                        )}
                      </span>
                    ) : null}
                  </td>
                ))}

                {/* URL */}
                <td className="px-3 py-2 border-b border-slate-100">
                  {row.url && (
                    <span className="text-xs text-primary-500 whitespace-nowrap">
                      {row.url}
                    </span>
                  )}
                </td>

                {/* タイトル */}
                <td className="px-3 py-2 border-b border-slate-100">
                  {row.pageTitle && (
                    <span className="text-slate-700 text-xs">
                      {row.pageTitle}
                    </span>
                  )}
                </td>

                {/* ディスクリプション */}
                <td className="px-3 py-2 border-b border-slate-100">
                  {row.description && (
                    <span className="text-slate-500 text-xs">
                      {row.description}
                    </span>
                  )}
                </td>

                {/* 備考 */}
                <td className="px-3 py-2 border-b border-slate-100 w-16" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
