import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
import { execFile } from 'child_process';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { constants } from 'fs';

export const runtime = 'nodejs';

const execFileAsync = promisify(execFile);
const PDFLATEX_PATH = process.env.PDFLATEX_PATH ?? '/usr/bin/pdflatex';
const PDFTOCAIRO_PATH = process.env.PDFTOCAIRO_PATH ?? '/usr/bin/pdftocairo';

export async function POST(request: Request) {
  let tempDir: string | undefined;

  try {
    const body = await request.json();
    let { tikzCode } = body;

    if (!tikzCode) {
      return Response.json(
        { error: 'TikZ code is required' },
        { status: 400 }
      );
    }

    const externalRenderUrl = process.env.TIKZ_RENDER_URL;
    if (externalRenderUrl) {
      const response = await fetch(externalRenderUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tikzCode }),
      });

      const data = await response.json();

      return Response.json(data, { status: response.status });
    }

    // Wrap in document if not already wrapped
    if (!tikzCode.includes('\\documentclass')) {
      tikzCode = `\\documentclass{article}
    \\usepackage{xcolor}
    \\usepackage{tikz}
    \\usepackage{pgfplots}
    \\pgfplotsset{compat=1.18}
    \\pagestyle{empty}
    \\pagecolor{transparent}
    \\begin{document}
    ${tikzCode}
    \\end{document}`;
    }

    try {
      await access(PDFLATEX_PATH, constants.X_OK);
      await access(PDFTOCAIRO_PATH, constants.X_OK);

      tempDir = await mkdtemp(path.join(os.tmpdir(), 'tikz-'));
      const texPath = path.join(tempDir, 'input.tex');
      const pdfPath = path.join(tempDir, 'input.pdf');
      const svgBasePath = path.join(tempDir, 'output');

      await writeFile(texPath, tikzCode, 'utf8');

      await execFileAsync(PDFLATEX_PATH, [
        '-interaction=nonstopmode',
        '-halt-on-error',
        '-output-directory',
        tempDir,
        texPath,
      ]);

      const { stderr: svgStderr } = await execFileAsync(PDFTOCAIRO_PATH, [
        '-svg',
        pdfPath,
        svgBasePath,
      ]);

      const files = await readdir(tempDir);
      const svgFile = files.find((file) => file.endsWith('.svg'));

      if (svgFile) {
        const svg = await readFile(path.join(tempDir, svgFile), 'utf8');

        return Response.json({
          success: true,
          svg,
          type: 'svg',
        });
      }

      const { stderr: pngStderr } = await execFileAsync(PDFTOCAIRO_PATH, [
        '-png',
        '-singlefile',
        pdfPath,
        svgBasePath,
      ]);

      const pngPath = `${svgBasePath}.png`;
      const pngData = await readFile(pngPath);
      const dataUrl = `data:image/png;base64,${pngData.toString('base64')}`;

      return Response.json({
        success: true,
        dataUrl,
        type: 'png',
        warnings: [svgStderr, pngStderr].filter(Boolean),
      });
    } catch (localError) {
      console.warn('Local TikZ render failed, falling back to codecogs:', localError);

      const encodedLatex = encodeURIComponent(tikzCode);
      const imageUrl = `https://latex.codecogs.com/svg.image?${encodedLatex}`;

      return Response.json({
        success: true,
        url: imageUrl,
        type: 'image',
        fallback: true,
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return Response.json(
      { error: 'Failed to generate TikZ image: ' + String(error) },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

