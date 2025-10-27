import { Loader2, CheckCircle, XCircle, Briefcase, X } from 'lucide-react';
import { useEffect } from 'react';
import { jobsAPI } from '../api';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import type { Job } from '../types';

interface ActiveJobsPanelProps {
  jobs: Job[];
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  removeJob: (jobId: string) => void;
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
}

export default function ActiveJobsPanel({
  jobs,
  updateJob,
  removeJob,
  selectedJobId,
  onSelectJob,
}: ActiveJobsPanelProps) {
  const activeJobs = jobs.filter((job) => job.status === 'running');
  const completedJobs = jobs.filter((job) => job.status !== 'running');

  return (
    <div className="w-80 flex-shrink-0">
      <Card className="sticky top-24">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Jobs</CardTitle>
            <Badge variant="default" className="ml-auto">
              {activeJobs.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {activeJobs.length === 0 && completedJobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No jobs yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Start a generation task to see jobs here
              </p>
            </div>
          ) : (
            <>
              {activeJobs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Active ({activeJobs.length})
                  </h3>
                  {activeJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      updateJob={updateJob}
                      isSelected={selectedJobId === job.id}
                      onSelect={onSelectJob}
                    />
                  ))}
                </div>
              )}

              {completedJobs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Completed ({completedJobs.length})
                  </h3>
                  {completedJobs.map((job) => (
                    <CompletedJobCard
                      key={job.id}
                      job={job}
                      removeJob={removeJob}
                      isSelected={selectedJobId === job.id}
                      onSelect={onSelectJob}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface JobCardProps {
  job: Job;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
  isSelected: boolean;
  onSelect: (jobId: string) => void;
}

function JobCard({ job, updateJob, isSelected, onSelect }: JobCardProps) {
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

  const getJobTypeLabel = () => {
    switch (job.type) {
      case 'brand_data':
        return 'Brand Data';
      case 'brief':
        return 'Brief';
      case 'draft':
        return 'Draft';
      default:
        return job.type;
    }
  };

  return (
    <button
      onClick={() => onSelect(job.id)}
      className={`w-full text-left border rounded-lg p-3 transition-all hover:shadow-md ${
        isSelected
          ? 'border-primary bg-blue-50 shadow-sm'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
        <span className="text-sm font-medium truncate">#{job.id}</span>
      </div>
      <Badge variant="secondary" className="text-xs">
        {getJobTypeLabel()}
      </Badge>
    </button>
  );
}

interface CompletedJobCardProps {
  job: Job;
  removeJob: (jobId: string) => void;
  isSelected: boolean;
  onSelect: (jobId: string) => void;
}

function CompletedJobCard({ job, removeJob, isSelected, onSelect }: CompletedJobCardProps) {
  const isSuccess = job.status === 'completed';

  const getJobTypeLabel = () => {
    switch (job.type) {
      case 'brand_data':
        return 'Brand Data';
      case 'brief':
        return 'Brief';
      case 'draft':
        return 'Draft';
      default:
        return job.type;
    }
  };

  return (
    <div
      className={`border rounded-lg p-3 transition-all ${
        isSelected
          ? 'border-primary bg-blue-50 shadow-sm'
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <button
          onClick={() => onSelect(job.id)}
          className="flex items-center gap-2 flex-1 text-left hover:opacity-80"
        >
          {isSuccess ? (
            <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-error flex-shrink-0" />
          )}
          <span className="text-sm font-medium truncate">#{job.id}</span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            removeJob(job.id);
          }}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={isSuccess ? 'success' : 'error'} className="text-xs">
          {isSuccess ? 'Completed' : 'Failed'}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {getJobTypeLabel()}
        </Badge>
      </div>
    </div>
  );
}
