import { DocsNav } from "@/components/docs/DocsNav";

export const metadata = {
  title: "使い方 | ディレクトリマップ生成ツール",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[800px] mx-auto">
      <DocsNav />
      <article className="docs-prose">{children}</article>
    </div>
  );
}
