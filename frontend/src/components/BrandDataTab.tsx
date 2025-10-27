import { useState, useEffect } from 'react';
import { Upload, Trash2, Eye, Loader2, Database, Sparkles, X } from 'lucide-react';
import { brandDataAPI, jobsAPI } from '../api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import JsonViewer from './JsonViewer';
import type { FileInfo, Job } from '../types';

interface BrandDataTabProps {
  addJob: (job: Job) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
}

export default function BrandDataTab({ addJob, updateJob }: BrandDataTabProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState('');
  const [brandName, setBrandName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ filename: string; data: any } | null>(null);

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

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await brandDataAPI.upload(file);
      loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      await brandDataAPI.delete(filename);
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleView = async (filename: string) => {
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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle>Generate Brand Data</CardTitle>
          </div>
          <CardDescription>
            Research and generate comprehensive brand data from multiple URLs
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name *</Label>
            <Input
              id="brandName"
              type="text"
              placeholder="e.g., Tesla, Nike, Apple"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              disabled={generating}
            />
            <p className="text-xs text-gray-500">
              The name of the brand you want to research
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urls">Brand URLs *</Label>
            <Input
              id="urls"
              type="text"
              placeholder="https://example.com https://blog.example.com"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              disabled={generating}
            />
            <p className="text-xs text-gray-500">
              Multiple URLs separated by spaces (main site, blog, store, etc.)
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!brandName.trim() || !urls.trim() || generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Brand Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Files */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Brand Data Files</CardTitle>
                <CardDescription className="mt-1">
                  {files.length} {files.length === 1 ? 'file' : 'files'} available
                </CardDescription>
              </div>
            </div>
            <label htmlFor="file-upload">
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload JSON
                </span>
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No brand data files yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Generate or upload a brand data file to get started
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {new Date(file.created_at * 1000).toLocaleDateString()}
                        </Badge>
                      </div>
                      {file.preview && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                          {file.preview}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(file.name)}
                        title="View file"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(file.name)}
                        title="Delete file"
                      >
                        <Trash2 className="w-4 h-4 text-error" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Modal */}
      <Dialog open={!!viewingFile} onOpenChange={() => setViewingFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{viewingFile?.filename}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {viewingFile && <JsonViewer data={viewingFile.data} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
