import { useState, useEffect } from 'react';
import { Upload, Trash2, Eye, Loader2 } from 'lucide-react';
import { brandDataAPI, jobsAPI } from '../api';

export default function BrandDataTab({ addJob, updateJob }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState('');
  const [brandName, setBrandName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const data = await brandDataAPI.list();
      setFiles(data.files);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!brandName.trim() || !urls.trim()) return;

    const urlList = urls.trim().split(/\s+/);
    setGenerating(true);

    try {
      const { job_id } = await brandDataAPI.generate({
        brand_name: brandName.trim(),
        urls: urlList
      });

      addJob({
        id: job_id,
        type: 'brand_data',
        status: 'running',
        params: { brand_name: brandName.trim(), urls: urlList },
      });

      // Monitor job completion
      const interval = setInterval(async () => {
        const jobData = await jobsAPI.get(job_id);
        if (jobData.status !== 'running') {
          clearInterval(interval);
          setGenerating(false);
          setUrls('');
          setBrandName('');
          loadFiles();
          updateJob(job_id, { status: jobData.status });
        }
      }, 2000);
    } catch (error) {
      console.error('Error generating brand data:', error);
      setGenerating(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await brandDataAPI.upload(file);
      loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      await brandDataAPI.delete(filename);
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleView = async (filename) => {
    try {
      const data = await brandDataAPI.get(filename);
      setViewingFile({ filename, data });
    } catch (error) {
      console.error('Error viewing file:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Generate Brand Data</h2>

        <div className="mb-4">
          <label className="label">Brand Name</label>
          <input
            type="text"
            className="input"
            placeholder="e.g., Get Carro"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            disabled={generating}
          />
          <p className="text-xs text-text-secondary mt-1">
            The name of the brand you want to research
          </p>
        </div>

        <div className="mb-4">
          <label className="label">Brand URL(s)</label>
          <input
            type="text"
            className="input"
            placeholder="https://example.com https://blog.example.com https://help.example.com"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            disabled={generating}
          />
          <p className="text-xs text-text-secondary mt-1">
            Multiple URLs for the same brand (main site, blog, store, help center, etc.) - separate with spaces
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!brandName.trim() || !urls.trim() || generating}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Brand Data'
          )}
        </button>
      </div>

      {/* Existing Files */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Existing Brand Data Files</h2>
          <label className="btn-secondary cursor-pointer">
            <Upload className="w-4 h-4 inline mr-2" />
            Upload JSON
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin inline" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            No brand data files yet
          </p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.name}
                className="border border-gray-200 rounded-md p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-text">{file.name}</h3>
                    <p className="text-sm text-text-secondary mt-1">
                      {new Date(file.created_at * 1000).toLocaleDateString()}
                    </p>
                    {file.preview && (
                      <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                        {file.preview}
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
              <button
                onClick={() => setViewingFile(null)}
                className="text-text-secondary hover:text-text"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs bg-gray-50 p-4 rounded">
                {JSON.stringify(viewingFile.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
