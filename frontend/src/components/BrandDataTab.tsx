import { useState, useEffect } from 'react';
import { Upload, Trash2, Eye, Loader2, Database, Sparkles, Edit2, Save, X } from 'lucide-react';
import { brandDataAPI, jobsAPI } from '../api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import JsonViewer from './JsonViewer';
import JsonEditor from './JsonEditor';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

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
        urls: urlList,
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
      setIsEditing(false);
      setEditedData(data);
    } catch (error) {
      console.error('Error viewing file:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedData(viewingFile?.data);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData(viewingFile?.data);
  };

  const handleSave = async () => {
    if (!viewingFile || !editedData) return;

    setSaving(true);
    try {
      await brandDataAPI.save(viewingFile.filename, editedData);
      setViewingFile({ ...viewingFile, data: editedData });
      setIsEditing(false);
      loadFiles(); // Reload to update preview
      alert('Brand data saved successfully!');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save brand data. Please check the console for details.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDialog = () => {
    setViewingFile(null);
    setIsEditing(false);
    setEditedData(null);
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
          <CardDescription>Research and generate comprehensive brand data from multiple URLs</CardDescription>
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
            <p className="text-xs text-gray-500">The name of the brand you want to research</p>
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
            <p className="text-xs text-gray-500">Multiple URLs separated by spaces (main site, blog, store, etc.)</p>
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
              <input id="file-upload" type="file" accept=".json" className="hidden" onChange={handleUpload} />
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
              <p className="text-sm text-gray-400 mt-1">Generate or upload a brand data file to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="group border border-gray-200 rounded-lg p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200 bg-white"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                      <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 leading-tight mb-2 truncate group-hover:text-primary transition-colors">
                        {file.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs font-normal">
                          {new Date(file.created_at * 1000).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Badge>
                      </div>
                      {file.preview && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{file.preview}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" onClick={() => handleView(file.name)} className="flex-1 h-8">
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(file.name)}
                      className="h-8 hover:bg-error/5 hover:border-error/30 hover:text-error"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View/Edit Modal */}
      <Dialog open={!!viewingFile} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold truncate" title={viewingFile?.filename}>
                  {viewingFile?.filename}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1.5">
                  {isEditing ? 'Editing brand data' : 'Brand data preview'}
                </p>
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button onClick={handleEdit} size="sm" variant="outline">
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleCancelEdit} size="sm" variant="outline" disabled={saving}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} size="sm" disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4" />

          {/* Scrollable content */}
          <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-6 max-h-[calc(85vh-200px)]">
            {viewingFile && (
              isEditing ? (
                <JsonEditor
                  data={editedData}
                  onChange={setEditedData}
                />
              ) : (
                <JsonViewer data={viewingFile.data} />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
