const express = require('express');
const { mkdtemp, writeFile, readFile, rm } = require('fs/promises');
const { execFile } = require('child_process');
const os = require('os');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const app = express();
app.use(express.json({ limit: '2mb' }));

const PDFLATEX_PATH = process.env.PDFLATEX_PATH || '/usr/bin/pdflatex';
const PDFTOCAIRO_PATH = process.env.PDFTOCAIRO_PATH || '/usr/bin/pdftocairo';

app.post('/render', async (req, res) => {
  let tempDir;
  try {
    const { tikzCode } = req.body;

    if (!tikzCode) {
      return res.status(400).json({ error: 'tikzCode is required' });
    }

    let latex = tikzCode;
    if (!latex.includes('\\documentclass')) {
      latex = `\\documentclass{article}\n\\usepackage{xcolor}\n\\usepackage{tikz}\n\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}\n\\pagestyle{empty}\n\\pagecolor{transparent}\n\\begin{document}\n${tikzCode}\n\\end{document}`;
    }

    tempDir = await mkdtemp(path.join(os.tmpdir(), 'tikz-'));
    const texPath = path.join(tempDir, 'input.tex');
    const pdfPath = path.join(tempDir, 'input.pdf');
    const outputBase = path.join(tempDir, 'output');

    await writeFile(texPath, latex, 'utf8');

    await execFileAsync(PDFLATEX_PATH, [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-output-directory',
      tempDir,
      texPath,
    ], { timeout: 20000 });

    await execFileAsync(PDFTOCAIRO_PATH, [
      '-png',
      '-singlefile',
      pdfPath,
      outputBase,
    ], { timeout: 20000 });

    const pngPath = `${outputBase}.png`;
    const pngData = await readFile(pngPath);
    const dataUrl = `data:image/png;base64,${pngData.toString('base64')}`;

    return res.json({ success: true, type: 'png', dataUrl });
  } catch (error) {
    return res.status(500).json({ error: `Render failed: ${String(error)}` });
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 5005;
app.listen(port, () => {
  console.log(`TikZ render service running on ${port}`);
});
