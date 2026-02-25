'use client';

type EditQuestionModalProps = {
  isOpen: boolean;
  editQuestion: any;
  setEditQuestion: (value: any) => void;
  allTopics: string[];
  subjectsByYear: Record<string, readonly string[] | string[]>;
  getTopics: (grade: string, subject: string) => string[];
  handleEditGraphPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  handleEditGraphUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleEditModalImagePaste: (field: string, sizeField?: string) => (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isUpdatingQuestion: boolean;
  onClose: () => void;
  onSave: () => void;
};

export default function EditQuestionModal({
  isOpen,
  editQuestion,
  setEditQuestion,
  allTopics,
  subjectsByYear,
  getTopics,
  handleEditGraphPaste,
  handleEditGraphUpload,
  handleEditModalImagePaste,
  isUpdatingQuestion,
  onClose,
  onSave,
}: EditQuestionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-3xl rounded-2xl border p-6 shadow-2xl overflow-y-auto"
        style={{
          backgroundColor: 'var(--clr-surface-a10)',
          borderColor: 'var(--clr-surface-tonal-a20)',
          color: 'var(--clr-primary-a50)',
          maxHeight: '85vh',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Question</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg cursor-pointer"
            style={{ backgroundColor: 'var(--clr-surface-a20)' }}
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Grade</label>
            <select
              value={editQuestion.grade}
              onChange={(e) => {
                const nextGrade = e.target.value as 'Year 11' | 'Year 12';
                const nextSubject = subjectsByYear[nextGrade][0];
                const nextTopic = getTopics(nextGrade, nextSubject)[0] || '';
                setEditQuestion({
                  ...editQuestion,
                  grade: nextGrade,
                  subject: nextSubject,
                  topic: nextTopic,
                });
              }}
              className="w-full px-4 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            >
              <option>Year 11</option>
              <option>Year 12</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <input
              type="number"
              value={editQuestion.year}
              onChange={(e) => setEditQuestion({ ...editQuestion, year: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <select
              value={editQuestion.subject}
              onChange={(e) => {
                const nextSubject = e.target.value;
                const nextTopics = getTopics(editQuestion.grade, nextSubject);
                setEditQuestion({
                  ...editQuestion,
                  subject: nextSubject,
                  topic: nextTopics[0] || '',
                });
              }}
              className="w-full px-4 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            >
              {subjectsByYear[editQuestion.grade as 'Year 11' | 'Year 12']?.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Topic</label>
            <select
              value={editQuestion.topic}
              onChange={(e) => setEditQuestion({ ...editQuestion, topic: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            >
              {(() => {
                const current = editQuestion.topic?.trim();
                const options = current && !allTopics.includes(current) ? [current, ...allTopics] : allTopics;
                return options.map((topic) => <option key={topic} value={topic}>{topic}</option>);
              })()}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Marks</label>
            <input
              type="number"
              value={editQuestion.marks}
              onChange={(e) => setEditQuestion({ ...editQuestion, marks: parseInt(e.target.value) })}
              className="w-full px-4 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--clr-surface-a0)',
                borderColor: 'var(--clr-surface-tonal-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Question Type</label>
            <select
              value={editQuestion.questionType}
              onChange={(e) => setEditQuestion({ ...editQuestion, questionType: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border"
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
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Question Text</label>
          <textarea
            value={editQuestion.questionText}
            onChange={(e) => setEditQuestion({ ...editQuestion, questionText: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: 'var(--clr-surface-a0)',
              borderColor: 'var(--clr-surface-tonal-a20)',
              color: 'var(--clr-primary-a50)',
            }}
          />
        </div>

        {editQuestion.questionType === 'multiple_choice' ? (
          <>
            <div className="mt-4 space-y-4">
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--clr-surface-tonal-a20)', backgroundColor: 'var(--clr-surface-a05)' }}>
                <label className="block text-sm font-medium mb-1">Option A</label>
                <input type="text" placeholder="Text (LaTeX)" value={editQuestion.mcqOptionA} onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionA: e.target.value })} className="w-full px-3 py-2 rounded border text-sm mb-2" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }} />
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--clr-surface-a40)' }}>Or image URL (shows image instead of text)</label>
                <input type="url" placeholder="https://... or data:image/..." value={editQuestion.mcqOptionAImage} onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionAImage: e.target.value })} onPaste={handleEditModalImagePaste('mcqOptionAImage')} className="w-full px-3 py-2 rounded border text-sm" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }} />
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--clr-surface-tonal-a20)', backgroundColor: 'var(--clr-surface-a05)' }}>
                <label className="block text-sm font-medium mb-1">Option B</label>
                <input type="text" placeholder="Text (LaTeX)" value={editQuestion.mcqOptionB} onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionB: e.target.value })} className="w-full px-3 py-2 rounded border text-sm mb-2" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }} />
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--clr-surface-a40)' }}>Or image URL</label>
                <input type="url" placeholder="https://... or data:image/..." value={editQuestion.mcqOptionBImage} onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionBImage: e.target.value })} onPaste={handleEditModalImagePaste('mcqOptionBImage')} className="w-full px-3 py-2 rounded border text-sm" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }} />
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--clr-surface-tonal-a20)', backgroundColor: 'var(--clr-surface-a05)' }}>
                <label className="block text-sm font-medium mb-1">Option C</label>
                <input type="text" placeholder="Text (LaTeX)" value={editQuestion.mcqOptionC} onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionC: e.target.value })} className="w-full px-3 py-2 rounded border text-sm mb-2" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }} />
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--clr-surface-a40)' }}>Or image URL</label>
                <input type="url" placeholder="https://... or data:image/..." value={editQuestion.mcqOptionCImage} onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionCImage: e.target.value })} onPaste={handleEditModalImagePaste('mcqOptionCImage')} className="w-full px-3 py-2 rounded border text-sm" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }} />
              </div>
              <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--clr-surface-tonal-a20)', backgroundColor: 'var(--clr-surface-a05)' }}>
                <label className="block text-sm font-medium mb-1">Option D</label>
                <input type="text" placeholder="Text (LaTeX)" value={editQuestion.mcqOptionD} onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionD: e.target.value })} className="w-full px-3 py-2 rounded border text-sm mb-2" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }} />
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--clr-surface-a40)' }}>Or image URL</label>
                <input type="url" placeholder="https://... or data:image/..." value={editQuestion.mcqOptionDImage} onChange={(e) => setEditQuestion({ ...editQuestion, mcqOptionDImage: e.target.value })} onPaste={handleEditModalImagePaste('mcqOptionDImage')} className="w-full px-3 py-2 rounded border text-sm" style={{ backgroundColor: 'var(--clr-surface-a0)', borderColor: 'var(--clr-surface-tonal-a20)', color: 'var(--clr-primary-a50)' }} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Correct Answer</label>
                <select
                  value={editQuestion.mcqCorrectAnswer}
                  onChange={(e) => setEditQuestion({ ...editQuestion, mcqCorrectAnswer: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--clr-surface-a0)',
                    borderColor: 'var(--clr-surface-tonal-a20)',
                    color: 'var(--clr-primary-a50)',
                  }}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Answer Explanation</label>
              <textarea
                value={editQuestion.mcqExplanation}
                onChange={(e) => setEditQuestion({ ...editQuestion, mcqExplanation: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Marking Criteria</label>
              <textarea
                value={editQuestion.markingCriteria}
                onChange={(e) => setEditQuestion({ ...editQuestion, markingCriteria: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Sample Answer</label>
              <textarea
                value={editQuestion.sampleAnswer}
                onChange={(e) => setEditQuestion({ ...editQuestion, sampleAnswer: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: 'var(--clr-surface-a0)',
                  borderColor: 'var(--clr-surface-tonal-a20)',
                  color: 'var(--clr-primary-a50)',
                }}
              />
            </div>
          </>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Graph Image (data URL)</label>
          <textarea
            value={editQuestion.graphImageData}
            onChange={(e) => setEditQuestion({ ...editQuestion, graphImageData: e.target.value })}
            onPaste={handleEditGraphPaste}
            rows={3}
            className="w-full px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: 'var(--clr-surface-a0)',
              borderColor: 'var(--clr-surface-tonal-a20)',
              color: 'var(--clr-primary-a50)',
            }}
          />
          <div className="mt-3">
            <label className="block text-sm font-medium mb-2">Graph Size</label>
            <select
              value={editQuestion.graphImageSize}
              onChange={(e) => setEditQuestion({ ...editQuestion, graphImageSize: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border"
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
          <div className="mt-3 flex items-center gap-3">
            <label
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--clr-surface-a20)',
                color: 'var(--clr-primary-a50)',
              }}
            >
              Upload PNG
              <input type="file" accept="image/png" hidden onChange={handleEditGraphUpload} />
            </label>
            {editQuestion.graphImageData && (
              <span className="text-xs" style={{ color: 'var(--clr-surface-a40)' }}>
                Image loaded
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium cursor-pointer"
            style={{
              backgroundColor: 'var(--clr-surface-a20)',
              color: 'var(--clr-primary-a50)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isUpdatingQuestion}
            className="px-4 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: 'var(--clr-success-a0)',
              color: 'var(--clr-light-a0)',
            }}
          >
            {isUpdatingQuestion ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
