---
stepsCompleted:
  - step-01-init
  - step-02-discovery
inputDocuments:
  - _bmad-output/project-context.md
workflowType: 'prd'
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 1
classification:
  projectType: 'web-app-saas'
  domain: 'education-hsc-exam-prep'
  complexity: 'medium-high'
  projectContext: 'brownfield'
project_name: 'project'
user_name: 'Peter'
date: '2026-02-09'
---

# Product Requirements Document - project

**Author:** Peter  
**Date:** 2026-02-09

---

## Feature: PDF → HSC Questions Ingestion

### 1. Problem & Goal

You want to ingest HSC and school trial exam PDFs directly into the existing HSC questions database, with:

- Each written-response question extracted and converted to **LaTeX**.
- A **sample solution** generated for each question.
- Any associated **images/diagrams/graphs** attached to the relevant question.
- Minimal manual cleanup, even for long PDFs (10+ pages).

This extends the existing `api/hsc/pdf-ingest` pipeline, which already:

- Extracts text from exam PDFs (or LaTeX files).
- Sends chunked content to a model (xAI / Grok).
- Parses a structured response into questions and inserts them into `hsc_questions`.

### 2. Scope

- **In scope**
  - Uploading **HSC papers** with a corresponding **marking guideline** PDF.
  - Uploading **school trial papers** without a marking guideline.
  - Parsing written-response questions into:
    - Question text (LaTeX).
    - Marks.
    - Topic.
    - Sample solution (LaTeX).
    - Optional attached image data.
  - Writing all questions into the existing `hsc_questions` table.
  - Marking uncertain parses as `needs_review` (or equivalent flag).

- **Out of scope (for this iteration)**
  - MCQ extraction.
  - Rich admin UI for reviewing/approving ingested questions.
  - Advanced image segmentation (we will start with page- or region-level images returned by the model / pipeline).

### 3. User Types & Flows

#### 3.1 Admin – Upload HSC Paper + Marking Guideline

- **Actor**: Admin (you) on the web app.
- **Input**:
  - `exam` PDF (official HSC paper).
  - `criteria` PDF (official marking guideline).
  - `grade`, `year`, `subject`, `overwrite` flags (existing form fields).
- **Flow**:
  1. Admin uploads the exam PDF and marking guideline PDF via the existing upload UI.
  2. Backend:
     - Extracts text from both PDFs (using `pdfjs-dist`).
     - Chunks text and sends to xAI using `buildPdfPrompt` and `CRITERIA_PROMPT`.
     - Parses the returned content into structured questions and marking criteria.
     - Inserts/updates rows in `hsc_questions`.
  3. New questions are immediately available to users in the HSC generator.

#### 3.2 Admin – Upload School Trial Paper (No Guideline)

- **Actor**: Admin on the web app.
- **Input**:
  - `exam` PDF (school trial).
  - No `criteria` file.
  - `grade`, `year`, `subject`, `overwrite` as above.
- **Flow**:
  1. Admin uploads the trial paper.
  2. Backend:
     - Extracts text, chunks, and sends to xAI using `buildPdfPrompt`.
     - Parses questions and generates sample solutions directly from the model output.
  3. Questions are written into `hsc_questions`; no marking criteria are set.

#### 3.3 Admin – Upload Exam Images (Optional)

- **Actor**: Admin on the web app.
- **Input**:
  - `examImages[]` (set of page images, typically JPEG/PNG exports of scanned papers).
- **Flow**:
  1. Admin uploads one or more exam page images.
  2. Backend:
     - Sends each image (base64 data URL) to xAI vision model using `buildExamImagePrompt`.
     - Parses questions and sample answers from image-based responses.
  3. Questions are inserted into `hsc_questions` with `graph_image_data` set as appropriate (see below).

### 4. Functional Requirements

#### 4.1 Question Extraction & LaTeX Conversion

- For each written-response question:
  - Extract the full question text, preserving substructure:
    - Lettered subparts (a), (b), (c) become separate questions.
    - Roman subparts (i), (ii), (iii) stay grouped under the same lettered question.
  - Convert question content to **LaTeX**:
    - Respect existing render-safe LaTeX rules (inline `$...$`, display `$$...$$`, `aligned` instead of `align`, etc.).

#### 4.2 Sample Solution Generation

- For **HSC + guideline**:
  - Use the marking guideline text as the primary ground truth.
  - Generate a LaTeX sample solution that:
    - Follows the marking scheme.
    - Is fully worked and readable.

- For **school trials (no guideline)**:
  - Generate a best-effort LaTeX solution purely from the question context.

#### 4.3 Image / Diagram Handling

- For questions that include images/diagrams/graphs:
  - Use one of:
    - Vision model responses that explicitly identify images per question.
    - A separate image-extraction step that associates page-level images with questions.
  - Store image data in `hsc_questions.graph_image_data` (e.g. base64 string or URL).
  - Set `graph_image_size` to:
    - `'missing'` when the model indicates `HAS_IMAGE = TRUE` but no actual image data is attached yet.
    - `'small' | 'medium' | 'large'` once a concrete image is saved (existing pattern).

#### 4.4 Uncertain Parsing & Review Flag

- Introduce a logical `needs_review` concept for questions where parsing was uncertain, such as:
  - Local OCR noise / partial sentences.
  - Very short or obviously malformed LaTeX.
  - Conflicting or missing marks/topic data.
- Implementation detail:
  - If you prefer not to alter the DB schema immediately, use a string tag field such as:
    - `topic: 'Needs Review – ' + topic` or
    - A future `needs_review` column (boolean) on `hsc_questions`.

#### 4.5 Immediate Availability

- New questions are **immediately** usable by the HSC generator:
  - They are written into `hsc_questions` under the correct `grade`, `year`, `subject`.
  - No additional approval or staging step in the user flow.

### 5. Non-Functional Requirements

- **Accuracy**:
  - For a typical 20-page exam (≤ 3MB), ≥ **95%** of questions must:
    - Be correctly grouped (no broken/missing subparts).
    - Have valid LaTeX that renders without fatal errors.
    - Have a reasonably correct sample solution.

- **Latency**:
  - Processing for a 20-page exam should complete in **≤ 5 minutes** end-to-end:
    - PDF/OCR extraction.
    - Chunked model calls.
    - Parsing & DB writes.

- **Scalability / Chunking**:
  - Continue using `chunkText` with a configurable `GROK_PDF_CHUNK_MAX_CHARS` (default 20k).
  - Ensure each xAI call stays within token limits, and partial questions at chunk boundaries are skipped as currently described in `buildPdfPrompt`.

### 6. Technical Notes & Integration Points

- **API route**:
  - All functionality is centered in `src/app/api/hsc/pdf-ingest/route.ts`.
  - Existing structures to preserve:
    - `buildPdfPrompt`, `buildExamImagePrompt`, `CRITERIA_PROMPT`.
    - `parseQuestions`, `parseCriteria`, `chunkText`, `normalizeQuestionKey`.
    - xAI helper `createChatCompletion`.

- **Database**:
  - Table: `hsc_questions` (via `supabaseAdmin`).
  - Insert payload currently includes:
    - `grade`, `year`, `subject`, `topic`, `marks`, `question_number`,
      `question_text`, `question_type`, `marking_criteria`,
      `sample_answer`, `graph_image_data`, `graph_image_size`.
  - Extensions for review / origin tracking can be layered on top:
    - New boolean or enum fields (e.g. `needs_review`, `origin`), or
    - Encoded within existing text fields as an interim step.

- **Image linking**:
  - Vision pipeline already produces ions with `HAS_IMAGE TRUE/FALSE`.
  - Extend this to:
    - Capture actual image data and tie it to the corresponding question row.
    - Leave `graph_image_size = 'missing'` when the model flags an image but no data was attached.

This section summarizes the technical specifications needed to implement the PDF ingestion feature end-to-end.
