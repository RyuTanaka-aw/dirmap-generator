import type { MDXComponents } from "mdx/types";
import { Video } from "@/components/docs/Video";
import { ExcelPreview } from "@/components/docs/ExcelPreview";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Video,
    ExcelPreview,
    ...components,
  };
}
