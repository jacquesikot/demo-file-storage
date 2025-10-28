import { Textarea } from './ui/textarea';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export default function MarkdownEditor({ content, onChange, readOnly = false }: MarkdownEditorProps) {
  return (
    <Textarea
      value={content}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      className="font-mono text-sm min-h-[500px] resize-y"
      placeholder="Enter markdown content..."
    />
  );
}
