import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export interface ExportOptions {
  title: string;
  htmlContent: string;
  isDark?: boolean;
}

export function generateStandaloneHtml({ title, htmlContent, isDark = true }: ExportOptions): string {
  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const cardBg = isDark ? '#1e293b' : '#f1f5f9';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Markpad Native v2.0 by Vodiy">
  <title>${title} — Markpad Native</title>
  <style>
    body {
      background-color: ${bgColor};
      color: ${textColor};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.7;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
    }
    h1, h2, h3, h4 {
      border-bottom: 1px solid ${borderColor};
      padding-bottom: 0.3em;
      margin-top: 1.5em;
    }
    pre {
      background-color: ${cardBg};
      padding: 16px;
      border-radius: 8px;
      border: 1px solid ${borderColor};
      overflow-x: auto;
    }
    code {
      background-color: ${cardBg};
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 85%;
    }
    blockquote {
      border-left: 4px solid #38bdf8;
      margin: 0;
      padding-left: 16px;
      color: #94a3b8;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid ${borderColor};
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background-color: ${cardBg};
    }
    footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid ${borderColor};
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .container { max-width: 100%; }
      pre, code { border: 1px solid #ccc; background: #f5f5f5; color: #000; }
      footer { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${htmlContent}
    <footer>
      Exported with <strong>Markpad Native v2.0</strong> &bull; Published by Vodiy
    </footer>
  </div>
</body>
</html>`;
}

export async function exportAsHtml(title: string, htmlContent: string, isDark = true): Promise<boolean> {
  const fullHtml = generateStandaloneHtml({ title, htmlContent, isDark });
  const defaultPath = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;

  try {
    const filePath = await save({
      title: 'Export Standalone HTML',
      defaultPath,
      filters: [{ name: 'HTML Document', extensions: ['html'] }]
    });

    if (filePath) {
      await invoke('save_file_content', { path: filePath, content: fullHtml });
      return true;
    }
  } catch (e) {
    console.error('Failed to export HTML', e);
  }
  return false;
}

export function printToPdf(title: string, htmlContent: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  // Force light mode for PDF export to ensure clean paper-like appearance
  const fullHtml = generateStandaloneHtml({ title, htmlContent, isDark: false });

  doc.open();
  doc.write(fullHtml);
  doc.close();

  setTimeout(() => {
    if (iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
    // Clean up after print dialog closes
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 300);
}
