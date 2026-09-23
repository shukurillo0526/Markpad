import os
import subprocess
import base64
from PIL import Image

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
project_root = r'd:\dev\projects\Markpad\markpad'
screenshots_dir = os.path.join(project_root, 'screenshots')
output_dir = os.path.join(project_root, 'store-assets', 'zh-CN')
os.makedirs(output_dir, exist_ok=True)

slides_zh = [
    {
        'num': '01',
        'id': 'hero_markdown_preview',
        'title': '文本文件的“VLC”。<em>全能合一。</em>',
        'subtitle': '毫秒级极速启动 • 100% 离线隐私 • 零冗余纯净体验',
        'file': 'raw_app_01.png'
    },
    {
        'num': '02',
        'id': 'excel_spreadsheet_editor',
        'title': '直接查看与编辑表格。<em>无需安装 Office。</em>',
        'subtitle': '多工作表 Excel 浏览 • 单元格直接编辑 • 一键导出 CSV 与 PDF',
        'file': 'raw_app_02.png'
    },
    {
        'num': '03',
        'id': 'json_yaml_tree_explorer',
        'title': '探索复杂结构化数据。<em>可视化树状折叠。</em>',
        'subtitle': '颜色标记数据类型 • 深度嵌套节点展开 • 实时键值模糊搜索',
        'file': 'raw_app_03.png'
    },
    {
        'num': '04',
        'id': 'offline_pdf_document_reader',
        'title': '极速阅读与搜索文档。<em>无需云端，100% 本地运行。</em>',
        'subtitle': '高质量矢量渲染 • 全文即时高亮检索 • 本地原生打印引擎',
        'file': 'raw_app_04.png'
    },
    {
        'num': '05',
        'id': 'realtime_log_analyzer',
        'title': '毫秒级实时日志分析。<em>瞬间捕获系统错误。</em>',
        'subtitle': '严重级别标签过滤 (INFO, WARN, ERROR) • 高效正则匹配与流式缓冲',
        'file': 'raw_app_05.png'
    },
    {
        'num': '06',
        'id': 'word_editor_7_languages',
        'title': '您的全能通用工作台。<em>支持 26+ 格式与 7 种语言。</em>',
        'subtitle': '原生 Word (.docx) 文档编辑 • 暗黑与纸张双模式 • 全球本地化',
        'file': 'raw_app_06.png'
    },
    {
        'num': '07',
        'id': 'codemirror_text_editor',
        'title': '极速无干扰代码编辑。<em>丝滑响应，即开即写。</em>',
        'subtitle': 'CodeMirror 6 极速核心 • 多语言语法高亮 • 代码折叠与多标签',
        'file': 'raw_app_07.png'
    },
    {
        'num': '08',
        'id': 'live_html_web_preview',
        'title': '即时网页渲染预览。<em>响应式多设备切换。</em>',
        'subtitle': '安全沙盒渲染 HTML 与 SVG • 桌面、平板、手机视图无缝切换',
        'file': 'Screenshot 2026-09-23 222856.png'
    },
    {
        'num': '09',
        'id': 'env_keyvalue_inspector',
        'title': '轻松查看环境配置。<em>一键脱敏隐私密钥。</em>',
        'subtitle': '结构化解析 .env、.ini、.conf • 一键隐藏敏感 API 凭证',
        'file': 'Screenshot 2026-09-23 222916.png'
    },
    {
        'num': '10',
        'id': 'export_and_print_engine',
        'title': '随心导出，随处分享。<em>PDF、独立 HTML 与富文本。</em>',
        'subtitle': '高保真原生打印引擎 • 一键复制格式化富文本至剪贴板',
        'file': 'Screenshot 2026-09-23 222927.png'
    }
]

html_template = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet">
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
    font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'SimSun', 'Microsoft YaHei', serif;
    position: relative;
  }

  body::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, transparent 60%, rgba(30, 80, 120, 0.12) 100%);
    pointer-events: none;
    z-index: 1;
  }

  .header {
    margin-top: 44px;
    margin-bottom: 24px;
    text-align: center;
    z-index: 2;
  }
  .headline {
    font-size: 52px;
    font-weight: 600;
    color: #0b192c;
    letter-spacing: 0.5px;
    line-height: 1.18;
  }
  .headline em {
    font-style: normal;
    color: #0369a1;
    font-weight: 700;
  }
  .subline {
    margin-top: 10px;
    font-family: 'Plus Jakarta Sans', 'Microsoft YaHei', 'PingFang SC', sans-serif;
    font-size: 19px;
    font-weight: 500;
    color: #1e3a5f;
    letter-spacing: 0.5px;
    opacity: 0.92;
  }

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

temp_html = os.path.join(output_dir, 'temp_render_zh.html')

for slide in slides_zh:
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

    out_png = os.path.join(output_dir, f"{slide['num']}_{slide['id']}.png")
    
    cmd = [
        edge_path,
        '--headless',
        '--disable-gpu',
        '--hide-scrollbars',
        '--window-size=1920,1080',
        f'--screenshot={out_png}',
        f'file:///{temp_html}'
    ]
    
    print(f"Rendering Chinese Slide {slide['num']}: {slide['id']}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(out_png):
        size_kb = os.path.getsize(out_png) / 1024
        print(f"  [OK] Created: {os.path.basename(out_png)} ({size_kb:.1f} KB)")
    else:
        print(f"  [ERROR] Failed to create {out_png}")

if os.path.exists(temp_html):
    os.remove(temp_html)

print("\nDone! All Chinese store showcase images generated.")
