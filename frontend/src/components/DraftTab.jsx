import { useState, useEffect } from 'react';
import { Upload, Trash2, Eye, Loader2, Download, AlertTriangle } from 'lucide-react';
import { draftsAPI, briefsAPI, brandDataAPI, jobsAPI } from '../api';
import ReactMarkdown from 'react-markdown';

export default function DraftTab({ addJob, updateJob }) {
  const [files, setFiles] = useState([]);
  const [briefFiles, setBriefFiles] = useState([]);
  const [brandFiles, setBrandFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);

  const [formData, setFormData] = useState({
    brief_filename: '',
    brand_data_filename: '',
  });

  useEffect(() => {
    loadFiles();
    loadBriefFiles();
    loadBrandFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const data = await draftsAPI.list();
      setFiles(data.files);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBriefFiles = async () => {
    try {
      const data = await briefsAPI.list();
      setBriefFiles(data.files);
    } catch (error) {
      console.error('Error loading brief files:', error);
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
    if (!formData.brief_filename || !formData.brand_data_filename) {
      alert('Please select both a brief and brand data file');
      return;
    }

    setGenerating(true);

    try {
      const { job_id } = await draftsAPI.generate(formData);

      addJob({
        id: job_id,
        type: 'draft',
        status: 'running',
        params: formData,
      });

      const interval = setInterval(async () => {
        const jobData = await jobsAPI.get(job_id);
        if (jobData.status !== 'running') {
          clearInterval(interval);
          setGenerating(false);
          setFormData({
            brief_filename: '',
            brand_data_filename: '',
          });
          loadFiles();
          updateJob(job_id, { status: jobData.status });
        }
      }, 2000);
    } catch (error) {
      console.error('Error generating draft:', error);
      setGenerating(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await draftsAPI.upload(file);
      loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      await draftsAPI.delete(filename);
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleView = async (filename) => {
    try {
      const data = await draftsAPI.get(filename);
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
        <h2 className="text-xl font-semibold mb-4">Create New Draft</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Select Brief *</label>
            <select
              className="input"
              value={formData.brief_filename}
              onChange={(e) =>
                setFormData({ ...formData, brief_filename: e.target.value })
              }
              disabled={generating}
            >
              <option value="">Select brief file...</option>
              {briefFiles.map((file) => (
                <option key={file.name} value={file.name}>
                  {file.preview || file.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Select Brand Data *</label>
            <select
              className="input"
              value={formData.brand_data_filename}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  brand_data_filename: e.target.value,
                })
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
                'Generate Draft'
              )}
            </button>

            <label className="btn-secondary cursor-pointer">
              <Upload className="w-4 h-4 inline mr-2" />
              Upload Draft
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

      {/* Existing Drafts */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">
          Existing Drafts ({files.length})
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin inline" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-text-secondary text-center py-8">No drafts yet</p>
        ) : (
          <div className="space-y-4">
            {files.map((file) => {
              const wordCount = file.size;
              const isOverLimit = wordCount > 2500;
              const isWithinLimit = wordCount >= 2000 && wordCount <= 2500;

              return (
                <div
                  key={file.name}
                  className="border border-gray-200 rounded-md p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-text mb-2">
                        {file.preview || file.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-text-secondary mb-2">
                        <span>
                          {new Date(file.created_at * 1000).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          {wordCount} words
                          {isOverLimit && (
                            <AlertTriangle className="w-4 h-4 text-warning" />
                          )}
                          {isWithinLimit && (
                            <span className="text-success">✓</span>
                          )}
                        </span>
                      </div>
                      {isOverLimit && (
                        <p className="text-xs text-warning mb-2">
                          ⚠ Exceeds 2500 word limit
                        </p>
                      )}
                      {isWithinLimit && (
                        <p className="text-xs text-success mb-2">
                          ✓ Within target range
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleView(file.name)}
                        className="p-2 text-primary hover:bg-blue-50 rounded-md"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(file.name)}
                        className="p-2 text-error hover:bg-red-50 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
