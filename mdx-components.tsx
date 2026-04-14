import type { MDXComponents } from "mdx/types";
import { Video } from "@/components/docs/Video";
import { ExcelPreview } from "@/components/docs/ExcelPreview";
import { SampleFile } from "@/components/docs/SampleFile";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Video,
    ExcelPreview,
    SampleFile,
    ...components,
  };
}
