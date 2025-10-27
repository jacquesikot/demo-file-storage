import { JsonView, darkStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

interface JsonViewerProps {
  data: any;
}

export default function JsonViewer({ data }: JsonViewerProps) {
  return (
    <div className="rounded-md overflow-hidden">
      <JsonView
        data={data}
        shouldInitiallyExpand={(level: number) => level < 2}
        style={{
          ...darkStyles,
          container: 'bg-gray-50 p-4 font-mono text-sm',
          label: 'text-blue-600 font-semibold',
          nullValue: 'text-gray-500',
          undefinedValue: 'text-gray-500',
          stringValue: 'text-green-600',
          booleanValue: 'text-purple-600',
          numberValue: 'text-orange-600',
          otherValue: 'text-gray-700',
        }}
      />
    </div>
  );
}
