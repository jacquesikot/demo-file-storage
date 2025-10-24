import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { jobsAPI } from '../api';

export default function ActiveJobsPanel({ jobs, updateJob, removeJob, selectedJobId, onSelectJob }) {
  const activeJobs = jobs.filter((job) => job.status === 'running');

  return (
    <div className="w-80 flex-shrink-0">
      <div className="card sticky top-8">
        <h2 className="text-lg font-semibold mb-4">
          Active Jobs ({activeJobs.length})
        </h2>

        {activeJobs.length === 0 ? (
          <p className="text-text-secondary text-sm">No active jobs</p>
        ) : (
          <div className="space-y-4">
            {activeJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                updateJob={updateJob}
                removeJob={removeJob}
                isSelected={selectedJobId === job.id}
                onSelect={onSelectJob}
              />
            ))}
          </div>
        )}

        {jobs.some((job) => job.status !== 'running') && (
          <>
            <h3 className="text-md font-semibold mt-6 mb-3">Completed</h3>
            <div className="space-y-3">
              {jobs
                .filter((job) => job.status !== 'running')
                .map((job) => (
                  <CompletedJobCard
                    key={job.id}
                    job={job}
                    removeJob={removeJob}
                    isSelected={selectedJobId === job.id}
                    onSelect={onSelectJob}
                  />
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function JobCard({ job, updateJob, isSelected, onSelect }) {
  useEffect(() => {
    // Poll for job status updates
    const interval = setInterval(async () => {
      try {
        const data = await jobsAPI.get(job.id);
        if (data.status !== 'running') {
          updateJob(job.id, { status: data.status });
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error fetching job status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [job.id, updateJob]);

  return (
    <button
      onClick={() => onSelect(job.id)}
      className={`w-full text-left border rounded-md p-3 transition-colors ${
        isSelected
          ? 'border-primary bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm font-medium">Job #{job.id}</span>
        </div>
      </div>
      <p className="text-xs text-text-secondary">
        {job.type === 'brand_data' && 'Brand Data Generation'}
        {job.type === 'brief' && 'Brief Generation'}
        {job.type === 'draft' && 'Draft Generation'}
      </p>
    </button>
  );
}

function CompletedJobCard({ job, removeJob, isSelected, onSelect }) {
  const isSuccess = job.status === 'completed';

  return (
    <div
      className={`border rounded-md p-3 transition-colors ${
        isSelected
          ? 'border-primary bg-blue-50'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <button
          onClick={() => onSelect(job.id)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80"
        >
          {isSuccess ? (
            <CheckCircle className="w-4 h-4 text-success" />
          ) : (
            <XCircle className="w-4 h-4 text-error" />
          )}
          <span className="text-sm font-medium">Job #{job.id}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeJob(job.id);
          }}
          className="text-xs text-text-secondary hover:text-text"
        >
          Dismiss
        </button>
      </div>
      <p className="text-xs text-text-secondary">
        {isSuccess ? 'Completed' : 'Failed'}
      </p>
    </div>
  );
}
