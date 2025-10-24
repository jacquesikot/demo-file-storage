import { useState, useEffect } from 'react';
import { Upload, Trash2, Eye, Loader2, Download } from 'lucide-react';
import { briefsAPI, brandDataAPI, jobsAPI } from '../api';
import ReactMarkdown from 'react-markdown';

export default function BriefTab({ addJob, updateJob }) {
  const [files, setFiles] = useState([]);
  const [brandFiles, setBrandFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    primary_keyword: '',
    secondary_keywords: '',
    brand_data: '',
  });

  useEffect(() => {
    loadFiles();
    loadBrandFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const data = await briefsAPI.list();
      setFiles(data.files);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBrandFiles = async () => {
    try {
      const data = await brandDataAPI.list();
      setBrandFiles(data.files);
    } catch (error) {
      console.error('Error loading brand files:', error);
    }
  };

  const handleGenerate = async () => {
    if (!formData.title || !formData.primary_keyword || !formData.brand_data) {
      alert('Please fill in all required fields');
      return;
    }

    setGenerating(true);

    try {
      const { job_id } = await briefsAPI.generate(formData);

      addJob({
        id: job_id,
        type: 'brief',
        status: 'running',
        params: formData,
      });

      const interval = setInterval(async () => {
        const jobData = await jobsAPI.get(job_id);
        if (jobData.status !== 'running') {
          clearInterval(interval);
          setGenerating(false);
          setFormData({
            title: '',
            primary_keyword: '',
            secondary_keywords: '',
            brand_data: '',
          });
          loadFiles();
          updateJob(job_id, { status: jobData.status });
        }
      }, 2000);
    } catch (error) {
      console.error('Error generating brief:', error);
      setGenerating(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await briefsAPI.upload(file);
      loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      await briefsAPI.delete(filename);
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleView = async (filename) => {
    try {
      const data = await briefsAPI.get(filename);
      setViewingFile({ filename, content: data.content });
    } catch (error) {
      console.error('Error viewing file:', error);
    }
  };

  const downloadFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Create New Brief</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              className="input"
              placeholder="Best Electric Cars 2025"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              disabled={generating}
            />
          </div>

          <div>
            <label className="label">Primary Keyword *</label>
            <input
              type="text"
              className="input"
              placeholder="electric cars 2025"
              value={formData.primary_keyword}
              onChange={(e) =>
                setFormData({ ...formData, primary_keyword: e.target.value })
              }
              disabled={generating}
            />
          </div>

          <div>
            <label className="label">Secondary Keywords</label>
            <textarea
              className="input"
              rows="3"
              placeholder="best electric vehicles, EV comparison, affordable electric cars"
              value={formData.secondary_keywords}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  secondary_keywords: e.target.value,
                })
              }
              disabled={generating}
            />
            <p className="text-xs text-text-secondary mt-1">
              Comma-separated list
            </p>
          </div>

          <div>
            <label className="label">Brand Data *</label>
            <select
              className="input"
              value={formData.brand_data}
              onChange={(e) =>
                setFormData({ ...formData, brand_data: e.target.value })
              }
              disabled={generating}
            >
              <option value="">Select brand data file...</option>
              {brandFiles.map((file) => (
                <option key={file.name} value={file.name}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Brief'
              )}
            </button>

            <label className="btn-secondary cursor-pointer">
              <Upload className="w-4 h-4 inline mr-2" />
              Upload Brief
              <input
                type="file"
                accept=".md"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Existing Briefs */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">
          Existing Briefs ({files.length})
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin inline" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            No briefs yet
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file) => (
              <div
                key={file.name}
                className="border border-gray-200 rounded-md p-4 hover:border-gray-300 transition-colors"
              >
                <h3 className="font-medium text-text mb-2">
                  {file.preview || file.name}
                </h3>
                <div className="flex items-center justify-between text-sm text-text-secondary mb-3">
                  <span>
                    {new Date(file.created_at * 1000).toLocaleDateString()}
                  </span>
                  <span>{file.size} words</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(file.name)}
                    className="flex-1 py-2 px-3 text-sm text-primary border border-primary rounded-md hover:bg-blue-50"
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(file.name)}
                    className="py-2 px-3 text-sm text-error border border-error rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{viewingFile.filename}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    downloadFile(viewingFile.filename, viewingFile.content)
                  }
                  className="p-2 text-text-secondary hover:text-text"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewingFile(null)}
                  className="text-text-secondary hover:text-text"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 prose prose-sm max-w-none">
              <ReactMarkdown>{viewingFile.content}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
