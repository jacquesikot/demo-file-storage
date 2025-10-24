import { useState } from 'react';
import './index.css';
import BrandDataTab from './components/BrandDataTab';
import BriefTab from './components/BriefTab';
import DraftTab from './components/DraftTab';
import ActiveJobsPanel from './components/ActiveJobsPanel';
import LogViewer from './components/LogViewer';

function App() {
  const [activeTab, setActiveTab] = useState('brand-data');
  const [activeJobs, setActiveJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);

  const addJob = (job) => {
    setActiveJobs((prev) => [...prev, job]);
    // Automatically select the newly created job
    setSelectedJobId(job.id);
  };

  const updateJob = (jobId, updates) => {
    setActiveJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, ...updates } : job))
    );
  };

  const removeJob = (jobId) => {
    setActiveJobs((prev) => prev.filter((job) => job.id !== jobId));
    // Clear selection if removed job was selected
    if (selectedJobId === jobId) {
      setSelectedJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-semibold text-text">
            Claude Workflow Manager
          </h1>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('brand-data')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'brand-data'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Brand Data
            </button>
            <button
              onClick={() => setActiveTab('brief')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'brief'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Brief Generation
            </button>
            <button
              onClick={() => setActiveTab('draft')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'draft'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Draft Generation
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Tab Content */}
          <div className="flex-1 space-y-6">
            {activeTab === 'brand-data' && (
              <BrandDataTab addJob={addJob} updateJob={updateJob} />
            )}
            {activeTab === 'brief' && (
              <BriefTab addJob={addJob} updateJob={updateJob} />
            )}
            {activeTab === 'draft' && (
              <DraftTab addJob={addJob} updateJob={updateJob} />
            )}

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
