"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { children: string; className?: string };

/**
 * Compact, chat-friendly markdown renderer.
 * - GFM enabled (lists, links, etc.)
 * - No raw HTML (input is untrusted LLM text)
 * - Headings downsized to inline chat text sizes
 */
export function Markdown({ children, className }: Props) {
  return (
    <div
      className={`text-body-sm text-on-surface [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${className ?? ""}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="my-1 whitespace-pre-wrap break-words">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-on-surface">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="my-1 list-disc space-y-0.5 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1 list-decimal space-y-0.5 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          code: ({ children }) => (
            <code className="rounded bg-on-surface/10 px-1 py-0.5 font-mono text-[0.85em] text-on-surface">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-md border border-on-surface/10 bg-surface-container p-2 text-label-sm">
              {children}
            </pre>
          ),
          h1: ({ children }) => (
            <p className="mt-2 mb-1 font-display text-body-md font-bold text-on-surface">
              {children}
            </p>
          ),
          h2: ({ children }) => (
            <p className="mt-2 mb-1 font-display text-body-md font-bold text-on-surface">
              {children}
            </p>
          ),
          h3: ({ children }) => (
            <p className="mt-1.5 mb-0.5 font-display text-label-md font-bold text-on-surface">
              {children}
            </p>
          ),
          h4: ({ children }) => (
            <p className="mt-1.5 mb-0.5 font-[var(--font-label)] text-label-md font-semibold text-on-surface">
              {children}
            </p>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-1 border-l-2 border-on-surface/25 pl-2 text-on-surface-variant">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-2 border-on-surface/15" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
