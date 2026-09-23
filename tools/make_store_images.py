import os
import subprocess
import base64

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
project_root = r'd:\dev\projects\Markpad\markpad'
screenshots_dir = os.path.join(project_root, 'screenshots')
output_dir = os.path.join(project_root, 'store-assets')
os.makedirs(output_dir, exist_ok=True)

slides = [
    {
        'id': 'hero_markdown_preview',
        'title': 'The <em>VLC of text files</em>. All in one place.',
        'subtitle': 'Sub-millisecond native speed • 100% offline privacy • Zero bloat',
        'file': 'Screenshot 2026-09-23 220730.png',
        'badge': 'MARKDOWN PREVIEW & MULTI-TAB'
    },
    {
        'id': 'excel_spreadsheet_editor',
        'title': 'Open and edit spreadsheets. <em>No Office required</em>.',
        'subtitle': 'Multi-sheet Excel viewer • Cell editing • Instant CSV and PDF export',
        'file': 'Screenshot 2026-09-23 220838.png',
        'badge': 'NATIVE EXCEL (.XLSX) VIEWER'
    },
    {
        'id': 'json_yaml_tree_explorer',
        'title': 'Inspect complex data. <em>Collapsible visual trees</em>.',
        'subtitle': 'Color-coded type tags • Deep nesting explorer • Live key-value search',
        'file': 'Screenshot 2026-09-23 220918.png',
        'badge': 'JSON & YAML TREE EXPLORER'
    },
    {
        'id': 'offline_pdf_document_reader',
        'title': 'Read and search documents. <em>Zero cloud, 100% local</em>.',
        'subtitle': 'Vector page rendering • In-document text search • Local PDF print engine',
        'file': 'Screenshot 2026-09-23 221110.png',
        'badge': 'OFFLINE PDF DOCUMENT VIEWER'
    },
    {
        'id': 'realtime_log_analyzer',
        'title': 'Filter logs in real time. <em>Find errors in milliseconds</em>.',
        'subtitle': 'Instant severity tags (INFO, WARN, ERROR) • Fast regex • Stream buffer',
        'file': 'Screenshot 2026-09-23 221042.png',
        'badge': 'REAL-TIME LOG FILTER'
    },
    {
        'id': 'word_editor_7_languages',
        'title': 'Your universal workspace. <em>26+ formats, 7 languages</em>.',
        'subtitle': 'Native Word (.docx) editor • Dark and paper modes • Localized worldwide',
        'file': 'Screenshot 2026-09-23 221302.png',
        'badge': 'WORD (.DOCX) & 7 NATIVE LANGUAGES'
    },
    {
        'id': 'codemirror_text_editor',
        'title': 'Distraction-free code editing. <em>Extreme responsiveness</em>.',
        'subtitle': 'CodeMirror 6 engine • Multi-language syntax • Built-in line folding',
        'file': 'Screenshot 2026-09-23 220813.png',
        'badge': 'NATIVE TEXT & CODE EDITOR'
    }
]

html_template = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..600&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  html, body {
    width: 1920px;
    height: 1080px;
    overflow: hidden;
  }
  body {
    background: radial-gradient(circle at 50% 18%, #c5edfc 0%, #a2def5 45%, #92d6f2 75%, #7ec2f0 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    font-family: 'Newsreader', Georgia, serif;
    position: relative;
  }

  /* Soft Vignette Overlay */
  body::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, transparent 60%, rgba(30, 80, 120, 0.12) 100%);
    pointer-events: none;
    z-index: 1;
  }

  /* Header Section */
  .header {
    margin-top: 48px;
    margin-bottom: 26px;
    text-align: center;
    z-index: 2;
  }
  .headline {
    font-size: 50px;
    font-weight: 500;
    color: #0b192c;
    letter-spacing: -0.6px;
    line-height: 1.15;
  }
  .headline em {
    font-style: italic;
    color: #0f172a;
    font-weight: 500;
  }
  .subline {
    margin-top: 9px;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    font-size: 18px;
    font-weight: 500;
    color: #1e3a5f;
    letter-spacing: 0.1px;
    opacity: 0.88;
  }

  /* Floating App Window Container */
  .window-wrap {
    width: 1530px;
    position: relative;
    z-index: 2;
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 40px;
    box-shadow: 
      0 35px 80px -15px rgba(11, 25, 44, 0.45),
      0 15px 35px -10px rgba(11, 25, 44, 0.25),
      0 0 0 1px rgba(255, 255, 255, 0.6),
      0 0 0 1px rgba(15, 23, 42, 0.08);
    background: #05080f;
  }

  .window-img {
    width: 100%;
    display: block;
    border-radius: 20px;
  }
</style>
</head>
<body>
  <div class="header">
    <h1 class="headline">__TITLE__</h1>
    <p class="subline">__SUBLINE__</p>
  </div>
  <div class="window-wrap">
    <img class="window-img" src="__IMG_DATA__" alt="Markpad Native">
  </div>
</body>
</html>
"""

temp_html = os.path.join(output_dir, 'temp_render.html')

for idx, slide in enumerate(slides, 1):
    img_path = os.path.join(screenshots_dir, slide['file'])
    if not os.path.exists(img_path):
        print(f"Skipping {slide['id']}: {img_path} not found")
        continue

    with open(img_path, 'rb') as f:
        b64_data = base64.b64encode(f.read()).decode('utf-8')
    data_uri = f"data:image/png;base64,{b64_data}"

    html_content = html_template.replace('__TITLE__', slide['title'])
    html_content = html_content.replace('__SUBLINE__', slide['subtitle'])
    html_content = html_content.replace('__IMG_DATA__', data_uri)

    with open(temp_html, 'w', encoding='utf-8') as f:
        f.write(html_content)

    out_png = os.path.join(output_dir, f"{idx:02d}_{slide['id']}.png")
    
    cmd = [
        edge_path,
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--window-size=1920,1080',
        f'--screenshot={out_png}',
        f'file:///{temp_html}'
    ]
    
    print(f"Rendering Slide {idx}: {slide['id']}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(out_png):
        size_kb = os.path.getsize(out_png) / 1024
        print(f"  [OK] Created: {os.path.basename(out_png)} ({size_kb:.1f} KB)")
    else:
        print(f"  [ERROR] Failed to create {out_png}")

if os.path.exists(temp_html):
    os.remove(temp_html)

print("\nDone! All store showcase images generated.")
