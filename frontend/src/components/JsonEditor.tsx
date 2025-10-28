import { useState, useEffect } from 'react';
import { Textarea } from './ui/textarea';

interface JsonEditorProps {
  data: any;
  onChange: (data: any) => void;
  readOnly?: boolean;
}

export default function JsonEditor({ data, onChange, readOnly = false }: JsonEditorProps) {
  const [jsonString, setJsonString] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize with formatted JSON
  useEffect(() => {
    try {
      setJsonString(JSON.stringify(data, null, 2));
      setError(null);
    } catch (e) {
      setError('Failed to parse JSON data');
    }
  }, [data]);

  const handleChange = (value: string) => {
    setJsonString(value);

    // Try to parse and update parent
    try {
      const parsed = JSON.parse(value);
      setError(null);
      onChange(parsed);
    } catch (e) {
      setError('Invalid JSON format');
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={jsonString}
        onChange={(e) => handleChange(e.target.value)}
        readOnly={readOnly}
        className="font-mono text-sm min-h-[500px] resize-y"
        placeholder="Enter JSON data..."
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
