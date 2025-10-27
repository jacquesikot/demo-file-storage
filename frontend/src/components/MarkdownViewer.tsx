import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface MarkdownViewerProps {
  content: string;
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
  const components: Components = {
    code({ node, inline, className, children, ...props }) {
      return !inline ? (
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-4">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className="bg-pink-50 text-pink-600 px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 prose-a:text-primary prose-strong:text-gray-900">
      <ReactMarkdown components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
