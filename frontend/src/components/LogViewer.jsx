import { useState, useEffect, useRef } from 'react';
import { Download, Pause, Play, X } from 'lucide-react';
import { jobsAPI } from '../api';

export default function LogViewer({ jobId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const logsEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const eventSource = jobsAPI.streamLogs(
      jobId,
      (message) => {
        if (!isPaused) {
          setLogs((prev) => [...prev, message]);
        }
      },
      (data) => {
        setIsComplete(true);
      },
      (error) => {
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
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Job Logs (#{jobId})</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 text-text-secondary hover:text-text rounded-md hover:bg-gray-100"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? (
              <Play className="w-4 h-4" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={downloadLogs}
            className="p-2 text-text-secondary hover:text-text rounded-md hover:bg-gray-100"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text rounded-md hover:bg-gray-100"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-xs h-96 overflow-y-auto"
      >
        {logs.length === 0 ? (
          <p className="text-gray-500">Waiting for logs...</p>
        ) : (
          <>
            {logs.map((log, index) => (
              <div key={index} className="py-0.5">
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </>
        )}
        {isComplete && (
          <div className="text-yellow-400 mt-2">--- Job Complete ---</div>
        )}
      </div>
    </div>
  );
}
