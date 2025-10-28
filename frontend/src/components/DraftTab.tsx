import { useState, useEffect } from 'react';
import { Trash2, Eye, Loader2, Download, FileEdit, Sparkles, AlertTriangle, CheckCircle2, Plus, X, Layers, Edit2, Save } from 'lucide-react';
import { draftsAPI, briefsAPI, brandDataAPI, jobsAPI } from '../api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import MarkdownViewer from './MarkdownViewer';
import MarkdownEditor from './MarkdownEditor';
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
  const [batchMode, setBatchMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<DraftFormData>({
    brief_filename: '',
    brand_data_filename: '',
  });

  const [batchForms, setBatchForms] = useState<DraftFormData[]>([
    {
      brief_filename: '',
      brand_data_filename: '',
    },
  ]);

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
        if (jobData.status !== 'running' && jobData.status !== 'queued') {
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

  const handleBatchGenerate = async () => {
    // Validate all forms
    const validForms = batchForms.filter(
      (form) => form.brief_filename && form.brand_data_filename
    );

    if (validForms.length === 0) {
      alert('Please fill in at least one complete draft');
      return;
    }

    if (validForms.length !== batchForms.length) {
      if (!confirm(`${batchForms.length - validForms.length} draft(s) have missing fields and will be skipped. Continue?`)) {
        return;
      }
    }

    setGenerating(true);

    try {
      const { batch_id, job_ids } = await draftsAPI.generateBatch(validForms);

      // Fetch all job data concurrently
      const jobDataPromises = job_ids.map((id) => jobsAPI.get(id));
      const jobDataArray = await Promise.all(jobDataPromises);

      // Add all jobs
      jobDataArray.forEach((jobData, i) => {
        addJob({
          id: job_ids[i],
          type: 'draft',
          status: jobData.status,
          params: validForms[i],
          batch_id: batch_id,
          queue_position: jobData.queue_position,
        });
      });

      // Monitor all jobs
      const intervals = job_ids.map((job_id) =>
        setInterval(async () => {
          const jobData = await jobsAPI.get(job_id);
          if (jobData.status !== 'running' && jobData.status !== 'queued') {
            clearInterval(intervals[job_ids.indexOf(job_id)]);
            updateJob(job_id, { status: jobData.status, queue_position: jobData.queue_position });

            // Check if all jobs are done
            const allDone = job_ids.every(async (id) => {
              const data = await jobsAPI.get(id);
              return data.status !== 'running' && data.status !== 'queued';
            });

            if (allDone) {
              setGenerating(false);
              setBatchForms([
                {
                  brief_filename: '',
                  brand_data_filename: '',
                },
              ]);
              loadFiles();
            }
          } else {
            // Update queue position
            updateJob(job_id, { queue_position: jobData.queue_position });
          }
        }, 2000)
      );
    } catch (error) {
      console.error('Error generating batch:', error);
      setGenerating(false);
    }
  };

  const addBatchEntry = () => {
    setBatchForms([
      ...batchForms,
      {
        brief_filename: '',
        brand_data_filename: '',
      },
    ]);
  };

  const removeBatchEntry = (index: number) => {
    if (batchForms.length === 1) {
      alert('You must have at least one draft');
      return;
    }
    setBatchForms(batchForms.filter((_, i) => i !== index));
  };

  const updateBatchForm = (index: number, updates: Partial<DraftFormData>) => {
    const newForms = [...batchForms];
    newForms[index] = { ...newForms[index], ...updates };
    setBatchForms(newForms);
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
      setIsEditing(false);
      setEditedContent(data.content);
    } catch (error) {
      console.error('Error viewing file:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(viewingFile?.content || '');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(viewingFile?.content || '');
  };

  const handleSave = async () => {
    if (!viewingFile || !editedContent) return;

    setSaving(true);
    try {
      await draftsAPI.save(viewingFile.filename, editedContent);
      setViewingFile({ ...viewingFile, content: editedContent });
      setIsEditing(false);
      loadFiles(); // Reload to update preview
      alert('Draft saved successfully!');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save draft. Please check the console for details.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDialog = () => {
    setViewingFile(null);
    setIsEditing(false);
    setEditedContent('');
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle>Create New Draft{batchMode ? 's' : ''}</CardTitle>
            </div>
            <Button
              variant={batchMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBatchMode(!batchMode)}
              disabled={generating}
            >
              <Layers className="w-4 h-4 mr-2" />
              {batchMode ? 'Batch Mode' : 'Single Mode'}
            </Button>
          </div>
          <CardDescription>
            {batchMode
              ? 'Generate multiple drafts at once (up to 5 concurrent jobs)'
              : 'Generate a complete SEO-optimized article draft from a brief'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!batchMode ? (
            // Single Mode Form
            <>
              <div className="space-y-2">
                <Label htmlFor="brief_filename">Select Brief *</Label>
                <Select
                  value={formData.brief_filename}
                  onValueChange={(value: string) => setFormData({ ...formData, brief_filename: value })}
                  disabled={generating}
                  aria-label="Select brief file"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brief file..." />
                  </SelectTrigger>
                  <SelectContent>
                    {briefFiles.map((file) => (
                      <SelectItem key={file.name} value={file.name}>
                        {file.preview || file.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand_data_filename">Select Brand Data *</Label>
                <Select
                  value={formData.brand_data_filename}
                  onValueChange={(value: string) => setFormData({ ...formData, brand_data_filename: value })}
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
                      Generate Draft
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            // Batch Mode Form
            <>
              <div className="space-y-4">
                {batchForms.map((form, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4 relative">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        Draft #{index + 1}
                      </Badge>
                      {batchForms.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBatchEntry(index)}
                          disabled={generating}
                          className="h-6 w-6 p-0 hover:bg-error/10 hover:text-error"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`batch-brief-${index}`}>Select Brief *</Label>
                        <Select
                          value={form.brief_filename}
                          onValueChange={(value: string) => updateBatchForm(index, { brief_filename: value })}
                          disabled={generating}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select brief file..." />
                          </SelectTrigger>
                          <SelectContent>
                            {briefFiles.map((file) => (
                              <SelectItem key={file.name} value={file.name}>
                                {file.preview || file.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`batch-brand-${index}`}>Select Brand Data *</Label>
                        <Select
                          value={form.brand_data_filename}
                          onValueChange={(value: string) => updateBatchForm(index, { brand_data_filename: value })}
                          disabled={generating}
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
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={addBatchEntry} disabled={generating || batchForms.length >= 50}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Draft
                </Button>

                <Button onClick={handleBatchGenerate} disabled={generating} className="flex-1">
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating {batchForms.filter((f) => f.brief_filename && f.brand_data_filename).length}{' '}
                      Draft(s)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate {batchForms.filter((f) => f.brief_filename && f.brand_data_filename).length} Draft(s)
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
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
              <p className="text-sm text-gray-400 mt-1">Generate a draft to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {files.map((file) => {
                const wordCount = file.size || 0;
                const isOverLimit = wordCount > 2500;
                const isWithinLimit = wordCount >= 2000 && wordCount <= 2500;

                return (
                  <div
                    key={file.name}
                    className="group border border-gray-200 rounded-lg p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200 bg-white"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mt-0.5 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                        <FileEdit className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-gray-900 leading-tight group-hover:text-primary transition-colors">
                            {file.preview || file.name}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant="outline" className="text-xs font-normal">
                            {new Date(file.created_at * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </Badge>
                          <Badge
                            variant={isOverLimit ? 'destructive' : isWithinLimit ? 'default' : 'secondary'}
                            className="text-xs font-normal"
                          >
                            {wordCount.toLocaleString()} words
                          </Badge>
                          {isOverLimit && (
                            <Badge variant="outline" className="text-xs text-error border-error/50">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Over limit
                            </Badge>
                          )}
                          {isWithinLimit && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Optimal
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="default" size="sm" onClick={() => handleView(file.name)} className="h-8">
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
                    </div>
                  </div>
                );
              })}
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
                  {isEditing ? 'Editing draft' : 'Draft preview'}
                </p>
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    <Button onClick={handleEdit} size="sm" variant="outline">
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewingFile && downloadFile(viewingFile.filename, viewingFile.content)}
                      className="flex-shrink-0"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </>
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
                <MarkdownEditor
                  content={editedContent}
                  onChange={setEditedContent}
                />
              ) : (
                <MarkdownViewer content={viewingFile.content} />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
