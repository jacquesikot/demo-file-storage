import { Download, Eye, FileText, Loader2, Sparkles, Trash2, Upload, Plus, X, Layers, Edit2, Save, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { brandDataAPI, briefsAPI, jobsAPI } from '../api';
import type { BriefFormData, FileInfo, Job } from '../types';
import MarkdownViewer from './MarkdownViewer';
import MarkdownEditor from './MarkdownEditor';
import DiffViewer from './DiffViewer';
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
  const [batchMode, setBatchMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showAIEdit, setShowAIEdit] = useState(false);
  const [aiEditPrompt, setAiEditPrompt] = useState('');
  const [aiEditing, setAiEditing] = useState(false);
  const [showDiffView, setShowDiffView] = useState(false);
  const [currentDiffId, setCurrentDiffId] = useState<string | null>(null);

  const [formData, setFormData] = useState<BriefFormData>({
    title: '',
    primary_keyword: '',
    secondary_keywords: '',
    brand_data: '',
  });

  const [batchForms, setBatchForms] = useState<BriefFormData[]>([
    {
      title: '',
      primary_keyword: '',
      secondary_keywords: '',
      brand_data: '',
    },
  ]);

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
        if (jobData.status !== 'running' && jobData.status !== 'queued') {
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

  const handleBatchGenerate = async () => {
    // Validate all forms
    const validForms = batchForms.filter(
      (form) => form.title && form.primary_keyword && form.brand_data
    );

    if (validForms.length === 0) {
      alert('Please fill in at least one complete brief');
      return;
    }

    if (validForms.length !== batchForms.length) {
      if (!confirm(`${batchForms.length - validForms.length} brief(s) have missing fields and will be skipped. Continue?`)) {
        return;
      }
    }

    setGenerating(true);

    try {
      const { batch_id, job_ids } = await briefsAPI.generateBatch(validForms);

      // Fetch all job data concurrently
      const jobDataPromises = job_ids.map((id) => jobsAPI.get(id));
      const jobDataArray = await Promise.all(jobDataPromises);

      // Add all jobs
      jobDataArray.forEach((jobData, i) => {
        addJob({
          id: job_ids[i],
          type: 'brief',
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
                  title: '',
                  primary_keyword: '',
                  secondary_keywords: '',
                  brand_data: '',
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
        title: '',
        primary_keyword: '',
        secondary_keywords: '',
        brand_data: '',
      },
    ]);
  };

  const removeBatchEntry = (index: number) => {
    if (batchForms.length === 1) {
      alert('You must have at least one brief');
      return;
    }
    setBatchForms(batchForms.filter((_, i) => i !== index));
  };

  const updateBatchForm = (index: number, updates: Partial<BriefFormData>) => {
    const newForms = [...batchForms];
    newForms[index] = { ...newForms[index], ...updates };
    setBatchForms(newForms);
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
      await briefsAPI.save(viewingFile.filename, editedContent);
      setViewingFile({ ...viewingFile, content: editedContent });
      setIsEditing(false);
      loadFiles(); // Reload to update preview
      alert('Brief saved successfully!');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save brief. Please check the console for details.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDialog = () => {
    setViewingFile(null);
    setIsEditing(false);
    setEditedContent('');
    setShowAIEdit(false);
    setAiEditPrompt('');
    setShowDiffView(false);
    setCurrentDiffId(null);
  };

  const handleAIEdit = async () => {
    if (!viewingFile || !aiEditPrompt.trim()) {
      alert('Please enter edit instructions');
      return;
    }

    setAiEditing(true);

    try {
      const { job_id, diff_id } = await briefsAPI.editWithAI(viewingFile.filename, aiEditPrompt);

      addJob({
        id: job_id,
        type: 'brief_edit',
        status: 'running',
        params: { filename: viewingFile.filename, edit_prompt: aiEditPrompt, diff_id },
      });

      // Poll for job completion
      const interval = setInterval(async () => {
        const jobData = await jobsAPI.get(job_id);
        if (jobData.status !== 'running' && jobData.status !== 'queued') {
          clearInterval(interval);
          setAiEditing(false);
          updateJob(job_id, { status: jobData.status });

          if (jobData.status === 'completed') {
            // Show diff view instead of automatically applying changes
            setCurrentDiffId(diff_id);
            setShowDiffView(true);
            setShowAIEdit(false);
            setAiEditPrompt('');
          } else {
            alert('AI edit failed. Please check the job logs for details.');
          }
        }
      }, 2000);
    } catch (error) {
      console.error('Error starting AI edit:', error);
      setAiEditing(false);
      alert('Failed to start AI edit. Please try again.');
    }
  };

  const handleDiffApprove = () => {
    // Reload the file content after approval
    if (viewingFile) {
      briefsAPI.get(viewingFile.filename).then((data) => {
        setViewingFile({ ...viewingFile, content: data.content });
        setEditedContent(data.content);
      });
    }
    setShowDiffView(false);
    setCurrentDiffId(null);
    loadFiles(); // Refresh file list
  };

  const handleDiffReject = () => {
    setShowDiffView(false);
    setCurrentDiffId(null);
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
              <CardTitle>Create New Brief{batchMode ? 's' : ''}</CardTitle>
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
              ? 'Generate multiple briefs at once (up to 5 concurrent jobs)'
              : 'Generate a comprehensive SEO brief with keywords and brand guidelines'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!batchMode ? (
            // Single Mode Form
            <>
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
            </>
          ) : (
            // Batch Mode Form
            <>
              <div className="space-y-4">
                {batchForms.map((form, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4 relative">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        Brief #{index + 1}
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
                        <Label htmlFor={`batch-title-${index}`}>Title *</Label>
                        <Input
                          id={`batch-title-${index}`}
                          type="text"
                          placeholder="Best Electric Cars 2025"
                          value={form.title}
                          onChange={(e) => updateBatchForm(index, { title: e.target.value })}
                          disabled={generating}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`batch-primary-${index}`}>Primary Keyword *</Label>
                        <Input
                          id={`batch-primary-${index}`}
                          type="text"
                          placeholder="electric cars 2025"
                          value={form.primary_keyword}
                          onChange={(e) => updateBatchForm(index, { primary_keyword: e.target.value })}
                          disabled={generating}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`batch-secondary-${index}`}>Secondary Keywords</Label>
                      <Textarea
                        id={`batch-secondary-${index}`}
                        rows={2}
                        placeholder="best electric vehicles, EV comparison"
                        value={form.secondary_keywords}
                        onChange={(e) => updateBatchForm(index, { secondary_keywords: e.target.value })}
                        disabled={generating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`batch-brand-${index}`}>Brand Data *</Label>
                      <Select
                        value={form.brand_data}
                        onValueChange={(value: string) => updateBatchForm(index, { brand_data: value })}
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
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={addBatchEntry} disabled={generating || batchForms.length >= 50}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Brief
                </Button>

                <Button onClick={handleBatchGenerate} disabled={generating} className="flex-1">
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating {batchForms.filter((f) => f.title && f.primary_keyword && f.brand_data).length}{' '}
                      Brief(s)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate {batchForms.filter((f) => f.title && f.primary_keyword && f.brand_data).length} Brief(s)
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
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
                  className="group border border-gray-200 rounded-lg p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200 bg-white"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                        {file.preview || file.name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs font-normal">
                          {new Date(file.created_at * 1000).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Badge>
                        {file.size && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {file.size.toLocaleString()} words
                          </Badge>
                        )}
                      </div>
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
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-semibold truncate" title={viewingFile?.filename}>
                  {viewingFile?.filename}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1.5">
                  {isEditing ? 'Editing brief' : 'Brief preview'}
                </p>
              </div>
              <div className="flex gap-2">
                {!isEditing && !showAIEdit ? (
                  <>
                    <Button onClick={() => setShowAIEdit(true)} size="sm" variant="outline">
                      <Wand2 className="w-4 h-4 mr-2" />
                      Edit with AI
                    </Button>
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
                ) : isEditing ? (
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
                ) : (
                  <>
                    <Button onClick={() => setShowAIEdit(false)} size="sm" variant="outline" disabled={aiEditing}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4" />

          {/* AI Edit Interface */}
          {showAIEdit && (
            <div className="mb-4 p-4 border border-primary/20 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Edit with AI</h3>
                  <p className="text-sm text-gray-600">
                    Describe the changes you want Claude to make to this brief. Be specific about what needs to be edited.
                  </p>
                </div>
              </div>
              <Textarea
                value={aiEditPrompt}
                onChange={(e) => setAiEditPrompt(e.target.value)}
                placeholder="Example: Change the tone to be more casual and conversational, or add a section about sustainability benefits..."
                rows={4}
                disabled={aiEditing}
                className="mb-3"
              />
              <div className="flex gap-2">
                <Button onClick={handleAIEdit} disabled={aiEditing || !aiEditPrompt.trim()} className="flex-1">
                  {aiEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      AI is editing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Apply AI Edits
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-auto">
            {showDiffView && currentDiffId ? (
              <DiffViewer
                diffId={currentDiffId}
                onApprove={handleDiffApprove}
                onReject={handleDiffReject}
              />
            ) : (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
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
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
