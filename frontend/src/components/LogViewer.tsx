import { useState, useEffect, useRef } from 'react';
import { Download, Pause, Play, X, Terminal } from 'lucide-react';
import { jobsAPI } from '../api';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface LogViewerProps {
  jobId: string;
  onClose?: () => void;
}

export default function LogViewer({ jobId, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = jobsAPI.streamLogs(
      jobId,
      (message: string) => {
        if (!isPaused) {
          setLogs((prev) => [...prev, message]);
        }
      },
      () => {
        setIsComplete(true);
      },
      (error: Event) => {
        console.error('Error streaming logs:', error);
        setIsComplete(true);
      }
    );

    return () => {
      eventSource.close();
    };
  }, [jobId, isPaused]);

  useEffect(() => {
    if (!isPaused && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  const downloadLogs = () => {
    const content = logs.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-${jobId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="animate-in slide-in-from-bottom-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Job Logs</CardTitle>
            <Badge variant="outline" className="ml-2">
              #{jobId}
            </Badge>
            {isComplete && (
              <Badge variant="success" className="ml-2">
                Complete
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? (
                <Play className="w-4 h-4" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={downloadLogs}
              title="Download logs"
            >
              <Download className="w-4 h-4" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          ref={containerRef}
          className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs h-96 overflow-y-auto border border-gray-800 shadow-inner"
        >
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Terminal className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500">Waiting for logs...</p>
              </div>
            </div>
          ) : (
            <>
              {logs.map((log, index) => (
                <div key={index} className="py-0.5 hover:bg-gray-800/50 px-2 -mx-2 rounded">
                  <span className="text-gray-600 select-none mr-2">{index + 1}</span>
                  <span>{log}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </>
          )}
          {isComplete && (
            <div className="text-yellow-400 mt-4 py-2 px-2 bg-yellow-900/20 rounded border border-yellow-900/30">
              ✓ Job completed successfully
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
