import { Badge } from "@/components/ui/badge";

interface PageData {
  no: number;
  level: number;
  title: string;
  url?: string;
  pageTitle?: string;
  description?: string;
  directoryName?: string;
  isSynthetic?: boolean;
}

interface ExcelPreviewProps {
  showDevUrl?: string;
  showDirectoryPath?: boolean;
}

// サンプルデータ（実際のツール出力に近い内容）
const sampleData: PageData[] = [
  {
    no: 1,
    level: 0,
    title: "テスト株式会社",
    url: "https://test.com/",
    pageTitle: "テスト株式会社",
    description: "テスト株式会社の公式サイトです",
    directoryName: "",
  },
  {
    no: 2,
    level: 1,
    title: "会社概要",
    url: "https://test.com/about/",
    pageTitle: "会社概要",
    description: "私たちについて",
    directoryName: "about/",
  },
  {
    no: 3,
    level: 1,
    title: "products",
    isSynthetic: true,
    directoryName: "products/",
  },
  {
    no: 4,
    level: 2,
    title: "ラインナップ",
    url: "https://test.com/products/lineup.html",
    pageTitle: "製品ラインナップ",
    description: "全製品の一覧です",
    directoryName: "lineup.html",
  },
  {
    no: 5,
    level: 2,
    title: "比較・価格",
    url: "https://test.com/products/compare.html",
    pageTitle: "製品比較・価格表",
    description: "プランの比較と料金をご確認いただけます",
    directoryName: "compare.html",
  },
  {
    no: 6,
    level: 1,
    title: "お問い合わせ",
    url: "https://test.com/contact/",
    pageTitle: "お問い合わせ",
    description: "お気軽にご連絡ください",
    directoryName: "contact/",
  },
];

const maxLevel = 2; // サンプルデータの最大階層

function generateDevUrl(prodUrl: string, devDomain: string): string {
  try {
    const prodUrlObj = new URL(prodUrl);
    const devDomainObj = new URL(devDomain);
    return devDomainObj.origin + prodUrlObj.pathname + prodUrlObj.search + prodUrlObj.hash;
  } catch {
    return prodUrl;
  }
}

export function ExcelPreview({ showDevUrl, showDirectoryPath }: ExcelPreviewProps = {}) {
  const headers: string[] = ["No", "トップ", "第2階層", "第3階層"];
  if (showDirectoryPath) {
    headers.push("directory", "");
  }
  headers.push("URL");
  if (showDevUrl) {
    headers.push("開発URL");
  }
  headers.push("タイトル", "ディスクリプション", "備考");

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
        <table className="w-full text-sm border-collapse min-w-[1600px]">
          <thead>
            <tr className="bg-slate-50">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-xs font-medium text-slate-500 text-center border-b border-slate-200 whitespace-nowrap min-w-[140px] first:min-w-[48px] last:min-w-[80px]"
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
                className="bg-white hover:bg-slate-50/50"
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

                {/* ディレクトリパス列（オプション）: 第2階層・第3階層のみ */}
                {showDirectoryPath &&
                  Array.from({ length: maxLevel }, (_, i) => (
                    <td
                      key={`dir-${i}`}
                      className="px-3 py-2 border-b border-slate-100 bg-amber-50/70"
                    >
                      {i + 1 === row.level ? (
                        <span className="text-xs text-slate-500 font-mono">
                          {row.directoryName}
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

                {/* 開発URL（オプション） */}
                {showDevUrl && (
                  <td className="px-3 py-2 border-b border-slate-100 bg-amber-50/70">
                    {row.url && !row.isSynthetic && (
                      <span className="text-xs text-primary-500 whitespace-nowrap">
                        {generateDevUrl(row.url, showDevUrl)}
                      </span>
                    )}
                  </td>
                )}

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
