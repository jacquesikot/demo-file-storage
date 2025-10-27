import { useState, useEffect } from 'react';
import { Upload, Trash2, Eye, Loader2, Download, FileEdit, Sparkles, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { draftsAPI, briefsAPI, brandDataAPI, jobsAPI } from '../api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogBody } from './ui/dialog';
import MarkdownViewer from './MarkdownViewer';
import type { FileInfo, Job, DraftFormData } from '../types';

interface DraftTabProps {
  addJob: (job: Job) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
}

export default function DraftTab({ addJob, updateJob }: DraftTabProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [briefFiles, setBriefFiles] = useState<FileInfo[]>([]);
  const [brandFiles, setBrandFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ filename: string; content: string } | null>(null);

  const [formData, setFormData] = useState<DraftFormData>({
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

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await draftsAPI.upload(file);
      loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      await draftsAPI.delete(filename);
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleView = async (filename: string) => {
    try {
      const data = await draftsAPI.get(filename);
      setViewingFile({ filename, content: data.content });
    } catch (error) {
      console.error('Error viewing file:', error);
    }
  };

  const downloadFile = (filename: string, content: string) => {
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
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle>Create New Draft</CardTitle>
          </div>
          <CardDescription>
            Generate a complete SEO-optimized article draft from a brief
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brief_filename">Select Brief *</Label>
            <Select
              id="brief_filename"
              value={formData.brief_filename}
              onChange={(e) =>
                setFormData({ ...formData, brief_filename: e.target.value })
              }
              disabled={generating}
              aria-label="Select brief file"
            >
              <option value="">Select brief file...</option>
              {briefFiles.map((file) => (
                <option key={file.name} value={file.name}>
                  {file.preview || file.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand_data_filename">Select Brand Data *</Label>
            <Select
              id="brand_data_filename"
              value={formData.brand_data_filename}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  brand_data_filename: e.target.value,
                })
              }
              disabled={generating}
              aria-label="Select brand data file"
            >
              <option value="">Select brand data file...</option>
              {brandFiles.map((file) => (
                <option key={file.name} value={file.name}>
                  {file.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Draft
                </>
              )}
            </Button>

            <label htmlFor="file-upload">
              <Button variant="outline" asChild>
                <span className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Draft
                </span>
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".md"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Existing Drafts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Existing Drafts</CardTitle>
              <CardDescription className="mt-1">
                {files.length} {files.length === 1 ? 'draft' : 'drafts'} available
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <FileEdit className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No drafts yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Generate or upload a draft to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file) => {
                const wordCount = file.size || 0;
                const isOverLimit = wordCount > 2500;
                const isWithinLimit = wordCount >= 2000 && wordCount <= 2500;

                return (
                  <div
                    key={file.name}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 mb-2 truncate">
                          {file.preview || file.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {new Date(file.created_at * 1000).toLocaleDateString()}
                          </Badge>
                          <Badge
                            variant={isOverLimit ? "destructive" : isWithinLimit ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {wordCount} words
                          </Badge>
                        </div>
                        {isOverLimit && (
                          <div className="flex items-center gap-1 text-xs text-error mb-2">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Exceeds 2500 word limit</span>
                          </div>
                        )}
                        {isWithinLimit && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Within target range (2000-2500 words)</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(file.name)}
                          title="View draft"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(file.name)}
                          title="Delete draft"
                        >
                          <Trash2 className="w-4 h-4 text-error" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Modal */}
      <Dialog open={!!viewingFile} onOpenChange={() => setViewingFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{viewingFile?.filename}</DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  viewingFile && downloadFile(viewingFile.filename, viewingFile.content)
                }
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </Button>
              <DialogClose onClick={() => setViewingFile(null)} />
            </div>
          </DialogHeader>
          <DialogBody className="overflow-auto">
            {viewingFile && <MarkdownViewer content={viewingFile.content} />}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
