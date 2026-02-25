'use client';

import { X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

type InlineQuestionEditorModalProps = {
  isOpen: boolean;
  draft: any | null;
  saving: boolean;
  allTopics: string[];
  subjectsByYear: Record<string, readonly string[] | string[]>;
  getTopics: (grade: string, subject: string) => string[];
  onClose: () => void;
  onSave: () => void;
  setDraft: Dispatch<SetStateAction<any | null>>;
};

export default function InlineQuestionEditorModal({
  isOpen,
  draft,
  saving,
  allTopics,
  subjectsByYear,
  getTopics,
  onClose,
  onSave,
  setDraft,
}: InlineQuestionEditorModalProps) {
  if (!isOpen || draft == null) return null;

  const handleImagePaste = (field: string, sizeField?: string) =>
    (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (!item.type.startsWith('image/')) continue;
        const file = item.getAsFile();
        if (!file) continue;

        e.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          if (!dataUrl) return;
          setDraft((prev: any) => {
            if (!prev) return prev;
            const next = { ...prev, [field]: dataUrl };
            if (sizeField && !String(prev[sizeField] || '').trim()) {
              next[sizeField] = 'medium';
            }
            return next;
          });
        };
        reader.readAsDataURL(file);
        return;
      }
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={() => !saving && onClose()}
      />
      <div
        className="relative w-full max-w-2xl rounded-2xl border p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{
          backgroundColor: 'var(--clr-surface-a10)',
          borderColor: 'var(--clr-surface-tonal-a20)',
          color: 'var(--clr-primary-a50)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit question (here)</h2>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="p-2 rounded-lg cursor-pointer"
            style={{ backgroundColor: 'var(--clr-surface-a20)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Grade</label>
              <select
                value={draft.grade || 'Year 12'}
                onChange={(e) => {
                  const nextGrade = e.target.value as 'Year 7' | 'Year 8' | 'Year 9' | 'Year 10' | 'Year 11' | 'Year 12';
                  const nextSubjects = subjectsByYear[nextGrade] || subjectsByYear['Year 12'] || [];
                  const nextSubject = nextSubjects.includes(draft.subject) ? draft.subject : nextSubjects[0];
                  const nextTopics = getTopics(nextGrade, nextSubject);
                  const nextTopic = nextTopics.includes(draft.topic) ? draft.topic : (nextTopics[0] || allTopics[0] || 'Unspecified');
                  setDraft({
                    ...draft,
                    grade: nextGrade,
                    subject: nextSubject,
                    topic: nextTopic,
                  });
                }}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              >
                <option value="Year 7">Year 7</option>
                <option value="Year 8">Year 8</option>
                <option value="Year 9">Year 9</option>
                <option value="Year 10">Year 10</option>
                <option value="Year 11">Year 11</option>
                <option value="Year 12">Year 12</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Year</label>
              <input
                type="number"
                value={draft.year || ''}
                onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Subject</label>
              <select
                value={draft.subject || ''}
                onChange={(e) => {
                  const nextSubject = e.target.value;
                  const nextTopics = getTopics(draft.grade || 'Year 12', nextSubject);
                  const nextTopic = nextTopics.includes(draft.topic) ? draft.topic : (nextTopics[0] || allTopics[0] || 'Unspecified');
                  setDraft({
                    ...draft,
                    subject: nextSubject,
                    topic: nextTopic,
                  });
                }}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              >
                {(subjectsByYear[draft.grade || 'Year 12'] || subjectsByYear['Year 12'] || []).map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>School Name</label>
              <input
                type="text"
                value={draft.school_name || ''}
                onChange={(e) => setDraft({ ...draft, school_name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Paper Number</label>
              <input
                type="number"
                min={1}
                step={1}
                value={draft.paper_number ?? ''}
                onChange={(e) => setDraft({ ...draft, paper_number: e.target.value ? Number.parseInt(e.target.value, 10) : null })}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Paper Label</label>
              <input
                type="text"
                value={draft.paper_label || ''}
                onChange={(e) => setDraft({ ...draft, paper_label: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Question Number</label>
              <input
                type="text"
                value={draft.question_number || ''}
                onChange={(e) => setDraft({ ...draft, question_number: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Marks</label>
              <input
                type="number"
                min={0}
                step={1}
                value={draft.marks ?? 0}
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  setDraft({ ...draft, marks: Number.isNaN(parsed) ? 0 : Math.max(0, parsed) });
                }}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Question Type</label>
              <select
                value={draft.question_type || 'written'}
                onChange={(e) => setDraft({ ...draft, question_type: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              >
                <option value="written">Written Response</option>
                <option value="multiple_choice">Multiple Choice</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Topic</label>
              <select
                value={draft.topic || ''}
                onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              >
                {(() => {
                  const current = draft.topic?.trim();
                  const options = current && !allTopics.includes(current) ? [current, ...allTopics] : allTopics;
                  return options.map((t) => <option key={t} value={t}>{t}</option>);
                })()}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Subtopic</label>
              <input
                type="text"
                value={draft.subtopic || ''}
                onChange={(e) => setDraft({ ...draft, subtopic: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Syllabus Dot Point</label>
            <input
              type="text"
              value={draft.syllabus_dot_point || ''}
              onChange={(e) => setDraft({ ...draft, syllabus_dot_point: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Question (LaTeX)</label>
            <textarea
              value={draft.question_text || ''}
              onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 rounded-lg border font-mono text-sm"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Marking Criteria (LaTeX)</label>
            <textarea
              value={draft.marking_criteria || ''}
              onChange={(e) => setDraft({ ...draft, marking_criteria: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border font-mono text-sm"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Sample Answer (LaTeX)</label>
            <textarea
              value={draft.sample_answer || ''}
              onChange={(e) => setDraft({ ...draft, sample_answer: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border font-mono text-sm"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Sample Answer Image URL</label>
            <input
              type="text"
              value={draft.sample_answer_image || ''}
              onChange={(e) => setDraft({ ...draft, sample_answer_image: e.target.value })}
              onPaste={handleImagePaste('sample_answer_image', 'sample_answer_image_size')}
              placeholder="https://... or data:image/png;base64,..."
              className="w-full px-4 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--clr-surface-a40)' }}>If provided, image will be shown instead of LaTeX text</p>
          </div>
          <div>
            <label className="text-sm font-medium mt-3 block" style={{ color: 'var(--clr-surface-a50)' }}>Sample Answer Image Size</label>
            <select
              value={draft.sample_answer_image_size || 'medium'}
              onChange={(e) => setDraft({ ...draft, sample_answer_image_size: e.target.value })}
              className="mt-2 w-full px-4 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Graph Image URL</label>
            <input
              type="text"
              value={draft.graph_image_data || ''}
              onChange={(e) => {
                const nextUrl = e.target.value;
                setDraft({
                  ...draft,
                  graph_image_data: nextUrl,
                  graph_image_size: nextUrl ? (draft.graph_image_size || 'medium') : draft.graph_image_size,
                });
              }}
              onPaste={handleImagePaste('graph_image_data', 'graph_image_size')}
              placeholder="https://... or data:image/png;base64,..."
              className="w-full px-4 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--clr-surface-a50)' }}>Graph Image Size</label>
            <select
              value={draft.graph_image_size || 'medium'}
              onChange={(e) => setDraft({ ...draft, graph_image_size: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="missing">Missing</option>
            </select>
          </div>
          {draft.question_type === 'multiple_choice' && (
            <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--clr-surface-tonal-a20)' }}>
              <h5 className="text-sm font-bold" style={{ color: 'var(--clr-surface-a50)' }}>MCQ Options</h5>
              {[
                { key: 'A', text: 'mcq_option_a', image: 'mcq_option_a_image' },
                { key: 'B', text: 'mcq_option_b', image: 'mcq_option_b_image' },
                { key: 'C', text: 'mcq_option_c', image: 'mcq_option_c_image' },
                { key: 'D', text: 'mcq_option_d', image: 'mcq_option_d_image' },
              ].map(({ key, text, image }) => (
                <div key={key} className="p-3 rounded border" style={{ borderColor: 'var(--clr-surface-tonal-a20)', backgroundColor: 'var(--clr-surface-a05)' }}>
                  <label className="block text-xs font-medium mb-1">Option {key}</label>
                  <input type="text" placeholder="Text (LaTeX)" value={draft[text] || ''} onChange={(e) => setDraft({ ...draft, [text]: e.target.value })} className="w-full px-3 py-2 rounded border text-sm mb-2" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }} />
                  <input type="url" placeholder="Or image URL" value={draft[image] || ''} onChange={(e) => setDraft({ ...draft, [image]: e.target.value })} onPaste={handleImagePaste(image)} className="w-full px-3 py-2 rounded border text-sm" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1">Correct Answer</label>
                <select value={draft.mcq_correct_answer || 'A'} onChange={(e) => setDraft({ ...draft, mcq_correct_answer: e.target.value })} className="w-full px-3 py-2 rounded border text-sm" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }}>
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Explanation (LaTeX)</label>
                <textarea value={draft.mcq_explanation || ''} onChange={(e) => setDraft({ ...draft, mcq_explanation: e.target.value })} rows={3} className="w-full px-3 py-2 rounded border text-sm" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--clr-success-a0)', color: 'var(--clr-light-a0)' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--clr-surface-a20)', color: 'var(--clr-primary-a50)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
