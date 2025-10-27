import { useState } from 'react';
import './index.css';
import BrandDataTab from './components/BrandDataTab';
import BriefTab from './components/BriefTab';
import DraftTab from './components/DraftTab';
import ActiveJobsPanel from './components/ActiveJobsPanel';
import LogViewer from './components/LogViewer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import type { Job } from './types';

function App() {
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const addJob = (job: Job) => {
    setActiveJobs((prev) => [...prev, job]);
    // Automatically select the newly created job
    setSelectedJobId(job.id);
  };

  const updateJob = (jobId: string, updates: Partial<Job>) => {
    setActiveJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job))
    );
  };

  const removeJob = (jobId: string) => {
    setActiveJobs((prev) => prev.filter((job) => job.id !== jobId));
    // Clear selection if removed job was selected
    if (selectedJobId === jobId) {
      setSelectedJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Claude Workflow Manager
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                AI-powered content generation pipeline
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{activeJobs.filter(j => j.status === 'running').length}</span> active jobs
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Tab Content */}
          <div className="flex-1 space-y-6">
            <Tabs defaultValue="brand-data" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="brand-data">Brand Data</TabsTrigger>
                <TabsTrigger value="brief">Brief Generation</TabsTrigger>
                <TabsTrigger value="draft">Draft Generation</TabsTrigger>
              </TabsList>

              <TabsContent value="brand-data">
                <BrandDataTab addJob={addJob} updateJob={updateJob} />
              </TabsContent>

              <TabsContent value="brief">
                <BriefTab addJob={addJob} updateJob={updateJob} />
              </TabsContent>

              <TabsContent value="draft">
                <DraftTab addJob={addJob} updateJob={updateJob} />
              </TabsContent>
            </Tabs>

            {/* Log Viewer - Shows logs for selected job */}
            {selectedJobId && (
              <LogViewer
                jobId={selectedJobId}
                onClose={() => setSelectedJobId(null)}
              />
            )}
          </div>

          {/* Active Jobs Panel */}
          <ActiveJobsPanel
            jobs={activeJobs}
            updateJob={updateJob}
            removeJob={removeJob}
            selectedJobId={selectedJobId}
            onSelectJob={setSelectedJobId}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
