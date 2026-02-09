# Drawing Canvas UX: Research & Brainstorm

**Purpose:** Improve the UX of the answer-drawing canvas in the HSC Generator, using free tools (e.g. Excalidraw) and alignment with the app’s workflow.  
**Context:** This doc uses the **current app context**—HSC question practice, written answers, image-based submission, and AI marking—as the basis for research and ideas.

---

## 1. Current State (App Context)

### Where the canvas lives
- **HSC Generator** (`/hsc-generator`): “Answer Area” for **written** (non–multiple choice) questions.
- **Legacy:** `public/hsc-question-generator.html` has a simpler canvas (color, brush size, clear, save).

### Current stack (HSC Generator)
- **Rendering:** HTML `<canvas>` with 2D context.
- **Stroke engine:** `perfect-freehand` for smooth paths + `lazy-brush` for smoothing.
- **Interaction:** Pointer, mouse, and touch (including iPad two-finger scroll).
- **Tools:** Pen, eraser (radius-based stroke removal), undo, redo, clear, “Add More Space” (extend canvas height).
- **Submission:** Canvas exported via `canvas.toDataURL('image/png')` **or** user-uploaded image; same image is sent to marking API.

### Workflow integration
1. User sees question (and optional TikZ/LaTeX diagrams).
2. User draws (and/or uploads an image) in the Answer Area.
3. User clicks **Submit** → image (PNG data URL or upload) is sent to `/api/hsc/mark`.
4. Marking returns score and feedback; user sees “Solution” and can move to next question or finish exam.

**Constraints that any new canvas must satisfy:**
- Export a **single PNG image** (or equivalent) for the marking API.
- Work on **desktop and tablet** (iPad); touch and pointer handling matter.
- Fit the existing **“Answer Area” → Submit → Marking** flow without breaking exam mode or multi-question papers.

---

## 2. Pain Points & UX Goals

### Observed / likely pain points
- **Limited tools:** Freehand only; no shapes, text, or arrows (e.g. for graphs or labelled diagrams).
- **No zoom/pan:** Large answers rely on “Add More Space” (vertical only); no canvas zoom or pan.
- **Eraser UX:** Eraser is stroke-based; no “erase by area” or clear selection.
- **No layers / structure:** Everything is flat strokes; hard to nudge or rearrange parts of the answer.
- **Mobile/tablet:** Touch is supported but toolbar and controls could be more touch-friendly.
- **Persistence:** Drawings are in-memory until submit; no “save draft” or per-question restore (in current flow).

### UX goals for improvement
1. **Faster, clearer answers:** Shapes (rectangles, circles, lines, arrows) and optional text for maths/science diagrams.
2. **Better control:** Zoom, pan, and/or infinite canvas so long answers don’t feel cramped.
3. **Familiar feel:** Toolbar and shortcuts that match user expectations (e.g. whiteboard/diagram tools).
4. **Robust submission:** One-click export to PNG that matches current marking pipeline.
5. **Accessibility & performance:** Keyboard-friendly where possible, smooth on iPad and lower-end devices.

---

## 3. Free Plugin Options (Research)

### 3.1 Excalidraw

- **What it is:** Open-source (MIT) virtual whiteboard; React component.
- **Install:** `npm install @excalidraw/excalidraw` (peer: `react`, `react-dom`).
- **Integration:** Use as a React component; container must have explicit height (e.g. `height: 500px` or `min-height: 60vh`).
- **Next.js:** Use dynamic import with `ssr: false` (client-only).

**Pros**
- **Rich toolset:** Freehand, rectangles, diamonds, ellipses, arrows, lines, text.
- **Selection, resize, rotate:** Move and edit elements; aligns well with “structure” and “rearrange” goals.
- **Zoom & pan:** Built-in (scroll, pinch).
- **Collaboration-ready:** Scene is serializable (JSON); could support save/restore or future collaboration.
- **Export:** Official API supports `exportToCanvas()` + `getSceneElements()` / `getAppState()` / `getFiles()` → then `canvas.toDataURL()` for PNG. Fits “submit one image” requirement.
- **Active project:** Good docs, TypeScript, maintained.

**Cons**
- **Bundle size:** Non-trivial; lazy-loading and code-splitting recommended.
- **Styling:** Theming possible but may need overrides to match app (e.g. `--clr-*`).
- **Scope:** Full whiteboard UI; we may want a “minimal” or “answer-only” mode (fewer tools, no library) to avoid overwhelming students.
- **SSR:** Must be client-only (already the case for our canvas).

**Relevance to our workflow**
- **Submit flow:** On “Submit”, call Excalidraw’s export utils → PNG data URL → same `submitAnswer()` path we use today (no backend change).
- **Upload image:** Could set Excalidraw background or import image as element so “upload then draw on it” still works.
- **Exam mode:** We can lock UI (e.g. hide library, restrict tools) and still export PNG at submit.

### 3.2 Tldraw

- **What it is:** Open-source (MIT) whiteboard/diagram editor; React, optional backend.
- **Install:** `npm install tldraw`.
- **Integration:** React component; supports theming and customisation.

**Pros**
- **Modern stack:** React, TypeScript; good DX.
- **Shapes & arrows:** Diagrams and flowcharts.
- **Extensible:** Custom shapes and tools.
- **Export:** Canvas/snapshot APIs for PNG export.

**Cons**
- **API surface:** More “app” than “embed”; integration may be heavier than Excalidraw for “answer box” use.
- **Bundle size:** Similar concern; lazy-load.

**Relevance**
- Strong alternative if we want a more “diagram-first” answer experience; export path must be verified to match our PNG submission.

### 3.3 Perfect Freehand + custom UI (current path, enhanced)

- **What it is:** Keep current stroke engine; add our own shapes, zoom, or panels.
- **Pros:** Full control; smallest dependency; already integrated.
- **Cons:** More dev work for shapes, zoom, pan, and polish; no out-of-the-box “whiteboard” UX.

### 3.4 Fabric.js / Konva.js

- **What it is:** Canvas libraries (object model, shapes, events).
- **Pros:** Flexible; good for “draw + shapes” and export to image.
- **Cons:** We build the whole UI (toolbar, tools, undo); not a ready-made “whiteboard” like Excalidraw.

---

## 4. Brainstorm: Directions for Improvement

### 4.1 Excalidraw as the answer canvas (replace current canvas)

- **Idea:** Swap the current custom canvas for an embedded Excalidraw instance in the Answer Area.
- **Workflow:**
  - Show question → user draws in Excalidraw (freehand + shapes + text).
  - “Submit” → `exportToCanvas()` + `toDataURL('image/png')` → existing `submitAnswer(imageDataUrl)` and marking API.
- **Integration points:**
  - **Theme:** Pass Excalidraw theme (e.g. dark) and override CSS variables to align with app (e.g. `--clr-surface-*`, `--clr-primary-*`).
  - **Upload:** On “Upload image”, load image and add as background or as an image element in the scene so user can annotate.
  - **Height:** Match current “Answer Area” behaviour (fixed or max height, scroll); “Add More Space” could increase container height or be replaced by infinite canvas.
- **Risks:** Bundle size; need to hide or simplify UI (e.g. no “Open”/“Export” in header) so it’s clearly “answer only”.

### 4.2 Excalidraw as optional “diagram mode”

- **Idea:** Keep current freehand canvas as default; add a “Diagram mode” or “Switch to whiteboard” that opens Excalidraw (e.g. in a modal or expanded panel).
- **Workflow:** User chooses “Draw” vs “Diagram”; diagram mode exports PNG on submit same way.
- **Pros:** No change for users who only need pen; power users get shapes/arrows.
- **Cons:** Two UIs to maintain and to explain.

### 4.3 Enhance current canvas (no Excalidraw)

- **Ideas:**
  - **Shapes:** Toolbar with line, rectangle, ellipse, arrow; draw with perfect-freehand or simple 2D path; store as shapes + strokes; flatten to canvas on export.
  - **Zoom/pan:** Pinch/scroll to zoom; pan with two-finger drag or middle mouse; keep “Add More Space” or replace with virtual scroll.
  - **Text:** Optional text tool (position + string); render with `fillText` on export.
  - **Eraser:** Keep stroke eraser; optionally add “clear selection” (select region → delete).
- **Export:** Still `canvas.toDataURL('image/png')`; marking unchanged.
- **Pros:** Single canvas model; full control; smaller bundle.
- **Cons:** More custom code; UX may lag behind Excalidraw’s polish.

### 4.4 Hybrid: Excalidraw for “draft”, final export from our canvas

- **Idea:** Use Excalidraw for rich editing; on “Submit”, export its PNG and optionally draw it onto our canvas so the rest of the app (e.g. preview, upload overlay) stays unchanged.
- **Use case:** If we want to show “your answer” in a specific frame or with a watermark, we could composite Excalidraw’s PNG onto our canvas then export that. For most cases, exporting Excalidraw’s PNG directly is enough.

### 4.5 Persistence and drafts (future)

- **Idea:** Save scene (e.g. Excalidraw JSON or our stroke/shape format) in `localStorage` or API per question ID; restore when user returns to that question.
- **Fits:** Exam mode (save per question); practice mode (resume later). Export to PNG still happens only on explicit Submit.

---

## 5. Integration Checklist (Excalidraw-First)

If we choose Excalidraw as the main answer canvas:

| Item | Notes |
|------|--------|
| **Dynamic import** | `next/dynamic` with `ssr: false` for `@excalidraw/excalidraw`. |
| **Container size** | Answer Area container with min/max height (e.g. current 420–600px) and overflow/scroll as needed. |
| **Theme** | Map app `--clr-*` to Excalidraw theme so it matches dashboard/HSC generator. |
| **Submit** | On Submit: `excalidrawAPIRef.current.getSceneElements()` + `getAppState()` + `getFiles()` → `exportToCanvas(...)` → `canvas.toDataURL('image/png')` → existing `submitAnswer(imageDataUrl)`. |
| **Upload image** | On file select: load image, add to Excalidraw as background or image element; keep “draw on top” behaviour. |
| **Toolbar reduction** | Hide or remove “Open”, “Export”, “Save” in header; optional: restrict tools to freehand + shapes + text. |
| **Exam mode** | Disable export/open; optionally lock tool set; same PNG submit. |
| **Undo/redo** | Use Excalidraw’s built-in; remove or repurpose current undo/redo in Answer Area. |
| **Add More Space** | Replace with “tall” container + scroll, or rely on Excalidraw’s infinite canvas. |
| **Analytics / errors** | Log export errors; fallback message “Could not capture answer” (same as today). |

---

## 6. Summary Table

| Approach | Effort | UX gain | Fits current workflow | Risk |
|----------|--------|---------|------------------------|------|
| **Excalidraw as main canvas** | Medium | High (shapes, zoom, pan, text) | Yes (PNG export) | Bundle size; theming |
| **Excalidraw as optional diagram mode** | Medium | High for diagram users | Yes | Two UIs |
| **Enhance current canvas (shapes, zoom, text)** | High | Medium–High | Yes | Scope creep; maintenance |
| **Tldraw instead of Excalidraw** | Medium | High | Yes if export verified | Integration depth |
| **Fabric/Konva + custom UI** | High | High | Yes | Most custom work |

---

## 7. Context Summary (Use This When Implementing)

When implementing any change, **use this app context**:

1. **Flow:** HSC Generator → select question → Answer Area (draw/upload) → Submit → PNG to `/api/hsc/mark` → feedback + solution.
2. **Data contract:** Marking API expects a single image (base64 or URL); no change if we still submit one PNG.
3. **Modes:** Idle (practice), exam (timed, multi-question), and possibly “show solution” after submit; canvas must not leak between questions in exam mode.
4. **Users:** Students (desktop + iPad); touch and keyboard matter; clarity and simplicity over feature count.
5. **Existing behaviour to preserve:** Upload image, submit button, marking state, exam attempts, and “Show Solution” / “Add More Space” (or clear replacement).

Using this context, the highest-leverage improvement is **embedding Excalidraw as the Answer Area** with strict export-to-PNG and optional “minimal toolbar” mode, while keeping the rest of the HSC Generator workflow unchanged.

---

*Doc version: 1.0. Next step: prototype Excalidraw in a branch (dynamic import, themed container, export on Submit) and validate PNG output with current marking API.*
