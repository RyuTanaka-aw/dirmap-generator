"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const docsLinks = [
  { href: "/docs", label: "概要" },
  { href: "/docs/options", label: "詳細オプション" },
  { href: "/docs/faq", label: "よくある質問" },
];

export function DocsNav() {
  const pathname = usePathname();

  // basePath を考慮してマッチング
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <nav className="flex gap-1 mb-8 border-b border-slate-200">
      {docsLinks.map(({ href, label }) => {
        const fullHref = `${basePath}${href}`;
        const isActive = pathname === fullHref || pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={
              isActive
                ? "px-4 py-2.5 text-sm font-medium text-primary-500 border-b-2 border-primary-500 -mb-px"
                : "px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors -mb-px border-b-2 border-transparent"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
