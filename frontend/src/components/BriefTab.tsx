import { Download, Eye, FileText, Loader2, Sparkles, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { brandDataAPI, briefsAPI, jobsAPI } from '../api';
import type { BriefFormData, FileInfo, Job } from '../types';
import MarkdownViewer from './MarkdownViewer';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

interface BriefTabProps {
  addJob: (job: Job) => void;
  updateJob: (jobId: string, updates: Partial<Job>) => void;
}

export default function BriefTab({ addJob, updateJob }: BriefTabProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [brandFiles, setBrandFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewingFile, setViewingFile] = useState<{ filename: string; content: string } | null>(null);

  const [formData, setFormData] = useState<BriefFormData>({
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

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await briefsAPI.upload(file);
      loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      await briefsAPI.delete(filename);
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleView = async (filename: string) => {
    try {
      const data = await briefsAPI.get(filename);
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
            <CardTitle>Create New Brief</CardTitle>
          </div>
          <CardDescription>Generate a comprehensive SEO brief with keywords and brand guidelines</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              type="text"
              placeholder="Best Electric Cars 2025"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={generating}
              aria-label="Brief title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary_keyword">Primary Keyword *</Label>
            <Input
              id="primary_keyword"
              type="text"
              placeholder="electric cars 2025"
              value={formData.primary_keyword}
              onChange={(e) => setFormData({ ...formData, primary_keyword: e.target.value })}
              disabled={generating}
              aria-label="Primary keyword"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary_keywords">Secondary Keywords</Label>
            <Textarea
              id="secondary_keywords"
              rows={3}
              placeholder="best electric vehicles, EV comparison, affordable electric cars"
              value={formData.secondary_keywords}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  secondary_keywords: e.target.value,
                })
              }
              disabled={generating}
              aria-label="Secondary keywords"
            />
            <p className="text-xs text-gray-500">Comma-separated list of secondary keywords</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand_data">Brand Data *</Label>
            <Select
              value={formData.brand_data}
              onValueChange={(value: string) => setFormData({ ...formData, brand_data: value })}
              disabled={generating}
              aria-label="Select brand data file"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select brand data file..." />
              </SelectTrigger>
              <SelectContent>
                {brandFiles.map((file) => (
                  <SelectItem key={file.name} value={file.name}>
                    {file.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleGenerate} disabled={generating} className="flex-1">
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Brief
                </>
              )}
            </Button>

            <label htmlFor="file-upload">
              <Button variant="outline" asChild>
                <span className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Brief
                </span>
              </Button>
              <input id="file-upload" type="file" accept=".md" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Existing Briefs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Existing Briefs</CardTitle>
              <CardDescription className="mt-1">
                {files.length} {files.length === 1 ? 'brief' : 'briefs'} available
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
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No briefs yet</p>
              <p className="text-sm text-gray-400 mt-1">Generate or upload a brief to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <h3 className="font-medium text-gray-900 mb-2 truncate">{file.preview || file.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {new Date(file.created_at * 1000).toLocaleDateString()}
                    </Badge>
                    {file.size && (
                      <Badge variant="secondary" className="text-xs">
                        {file.size} words
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleView(file.name)} className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(file.name)} title="Delete brief">
                      <Trash2 className="w-4 h-4 text-error" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Modal */}
      <Dialog open={!!viewingFile} onOpenChange={() => setViewingFile(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold truncate" title={viewingFile?.filename}>
                  {viewingFile?.filename}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1.5">Brief preview</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => viewingFile && downloadFile(viewingFile.filename, viewingFile.content)}
                className="flex-shrink-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogHeader>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4" />

          {/* Scrollable content */}
          <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-6 max-h-[calc(85vh-200px)]">
            {viewingFile && <MarkdownViewer content={viewingFile.content} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
