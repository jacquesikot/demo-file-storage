import { useState, useEffect } from 'react';
import { Check, X, Loader2, Edit2, Save, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import MarkdownViewer from './MarkdownViewer';
import MarkdownEditor from './MarkdownEditor';
import { diffsAPI } from '../api';

interface DiffViewerProps {
  diffId: string;
  onApprove: () => void;
  onReject: () => void;
}

export default function DiffViewer({ diffId, onApprove, onReject }: DiffViewerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingAIOutput, setIsEditingAIOutput] = useState(false);

  const [diffData, setDiffData] = useState<{
    filename: string;
    file_type: string;
    original_content: string;
    edited_content: string;
  } | null>(null);

  const [editedAIContent, setEditedAIContent] = useState('');

  useEffect(() => {
    loadDiff();
  }, [diffId]);

  const loadDiff = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await diffsAPI.get(diffId);
      setDiffData(data);
      setEditedAIContent(data.edited_content);
    } catch (err) {
      console.error('Error loading diff:', err);
      setError('Failed to load diff. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!diffData) return;

    setSaving(true);
    try {
      await diffsAPI.approve(diffId, editedAIContent);
      alert('Changes approved and saved successfully!');
      onApprove();
    } catch (err) {
      console.error('Error approving diff:', err);
      alert('Failed to approve changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject these changes? This action cannot be undone.')) {
      return;
    }

    setRejecting(true);
    try {
      await diffsAPI.reject(diffId);
      alert('Changes rejected successfully.');
      onReject();
    } catch (err) {
      console.error('Error rejecting diff:', err);
      alert('Failed to reject changes. Please try again.');
    } finally {
      setRejecting(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditingAIOutput(true);
  };

  const handleCancelEdit = () => {
    setIsEditingAIOutput(false);
    if (diffData) {
      setEditedAIContent(diffData.edited_content);
    }
  };

  const handleSaveEdit = () => {
    setIsEditingAIOutput(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-gray-600">Loading diff...</span>
      </div>
    );
  }

  if (error || !diffData) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">{error || 'Failed to load diff'}</div>
        <Button onClick={loadDiff} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{diffData.filename}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {diffData.file_type === 'brief' ? 'Brief' : 'Draft'}
              </Badge>
              <span className="text-sm text-gray-500">Review AI-generated changes</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleReject} variant="outline" size="sm" disabled={saving || rejecting}>
            {rejecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                Reject
              </>
            )}
          </Button>
          <Button onClick={handleApprove} size="sm" disabled={saving || rejecting}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Approve & Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Side-by-side diff view */}
      <div className="grid grid-cols-2 gap-4">
        {/* Original content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Original</h4>
            <Badge variant="secondary" className="text-xs">
              Read-only
            </Badge>
          </div>
          <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 max-h-[600px] overflow-auto">
            <MarkdownViewer content={diffData.original_content} />
          </div>
        </div>

        {/* AI-edited content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
              AI-Generated Changes
            </h4>
            {!isEditingAIOutput ? (
              <Button onClick={handleStartEdit} variant="outline" size="sm">
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleCancelEdit} variant="outline" size="sm">
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} size="sm">
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Done
                </Button>
              </div>
            )}
          </div>
          <div className="border border-primary/30 rounded-lg bg-primary/5 p-4 max-h-[600px] overflow-auto">
            {isEditingAIOutput ? (
              <MarkdownEditor content={editedAIContent} onChange={setEditedAIContent} />
            ) : (
              <MarkdownViewer content={editedAIContent} />
            )}
          </div>
          {isEditingAIOutput && (
            <p className="text-xs text-gray-500 italic">
              You can edit the AI-generated content before approving.
            </p>
          )}
        </div>
      </div>

      {/* Help text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Review the changes:</strong> The left side shows your original content, and the right side
          shows the AI-generated changes. You can edit the AI output if needed before approving. Click
          "Approve & Save" to apply the changes to your original file, or "Reject" to discard them.
        </p>
      </div>
    </div>
  );
}
