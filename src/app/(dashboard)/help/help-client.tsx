"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// Rewrite intra-doc links: ./02-call-sheet.md → #call-sheet, ./README.md → #overview
function rewriteHref(href: string | undefined): string | undefined {
  if (!href) return href;
  // Match optional ./ prefix, optional NN- numeric prefix, name, .md extension
  const m = href.match(/^(?:\.\/)?(?:\d{2}-)?([a-z0-9-]+)\.md(?:#.+)?$/i);
  if (!m) return href;
  const slug = m[1].toLowerCase();
  if (slug === "readme") return "#overview";
  return `#${slug}`;
}

const markdownComponents = {
  a: ({ href, children, ...props }: { href?: string; children?: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={rewriteHref(href)} {...props}>
      {children}
    </a>
  ),
};

interface DocSection {
  id: string;
  filename: string;
  title: string;
  body: string;
}

const proseClasses = cn(
  "text-sm text-zinc-700 leading-relaxed",
  "[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-black [&_h1]:tracking-tight [&_h1]:mt-0 [&_h1]:mb-4",
  "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-black [&_h2]:mt-6 [&_h2]:mb-2",
  "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-black [&_h3]:mt-4 [&_h3]:mb-1.5",
  "[&_p]:my-2",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul_ul]:list-[circle]",
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
  "[&_li]:my-1",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-600 [&_blockquote]:my-3",
  "[&_strong]:font-semibold [&_strong]:text-black",
  "[&_em]:italic",
  "[&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:font-mono [&_code]:text-zinc-800",
  "[&_pre]:rounded-md [&_pre]:bg-zinc-100 [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:my-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_a]:text-black [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-zinc-300 hover:[&_a]:decoration-zinc-500",
  "[&_hr]:my-6 [&_hr]:border-zinc-200",
  "[&_table]:w-full [&_table]:my-3 [&_table]:text-sm",
  "[&_th]:border-b [&_th]:border-zinc-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-zinc-600",
  "[&_td]:border-b [&_td]:border-zinc-100 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top"
);

export function HelpClient({
  readme,
  sections,
}: {
  readme: string;
  sections: DocSection[];
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-black">Help</h1>
        <p className="mt-1 text-sm text-zinc-500">User guide for the TSC app.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        {/* Sticky TOC */}
        <aside className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <nav className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
            <p className="mb-2 text-2xs font-medium uppercase tracking-wider text-zinc-400">
              On this page
            </p>
            <ul className="space-y-0.5">
              <li>
                <a
                  href="#overview"
                  className="block rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-black transition-colors"
                >
                  Overview
                </a>
              </li>
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="block rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-black transition-colors"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <article className="min-w-0 max-w-3xl">
          <section id="overview" className="rounded-lg border border-zinc-200 bg-white p-6 mb-6">
            <div className={proseClasses}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{readme}</ReactMarkdown>
            </div>
          </section>

          {sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="rounded-lg border border-zinc-200 bg-white p-6 mb-6 scroll-mt-6"
            >
              <div className={proseClasses}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{s.body}</ReactMarkdown>
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
