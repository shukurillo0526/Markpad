<script lang="ts">
  import DOMPurify from 'dompurify';

  let { content = '', extension = '' } = $props<{ content: string; extension: string }>();

  let zoom = $state(100);
  let viewDevice = $state<'desktop' | 'mobile' | 'tablet'>('desktop');

  let sanitizedSvg = $derived.by(() => {
    if (extension.toLowerCase() === 'svg') {
      return DOMPurify.sanitize(content, { USE_PROFILES: { svg: true, svgFilters: true } });
    }
    return '';
  });

  let htmlDocSrc = $derived.by(() => {
    if (['html', 'htm'].includes(extension.toLowerCase())) {
      return content;
    }
    return '';
  });

  function getDeviceWidth(): string {
    switch (viewDevice) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  }
</script>

<div class="web-preview-container">
  {#if extension.toLowerCase() === 'svg'}
    <div class="preview-toolbar">
      <span class="preview-title">SVG Vector Graphic Preview</span>
      <div class="controls">
        <button class="tool-btn" onclick={() => (zoom = Math.max(25, zoom - 25))}>-</button>
        <span class="zoom-readout">{zoom}%</span>
        <button class="tool-btn" onclick={() => (zoom = Math.min(400, zoom + 25))}>+</button>
        <button class="tool-btn" onclick={() => (zoom = 100)}>Reset</button>
      </div>
    </div>
    <div class="svg-canvas-wrapper">
      <div class="svg-stage" style="transform: scale({zoom / 100});">
        {@html sanitizedSvg}
      </div>
    </div>
  {:else}
    <div class="preview-toolbar">
      <span class="preview-title">Live HTML Web Preview</span>
      <div class="controls">
        <button class="tool-btn" class:active={viewDevice === 'desktop'} onclick={() => (viewDevice = 'desktop')}>Desktop</button>
        <button class="tool-btn" class:active={viewDevice === 'tablet'} onclick={() => (viewDevice = 'tablet')}>Tablet</button>
        <button class="tool-btn" class:active={viewDevice === 'mobile'} onclick={() => (viewDevice = 'mobile')}>Mobile</button>
      </div>
    </div>
    <div class="iframe-stage-container">
      <iframe
        title="Web Live Preview"
        srcdoc={htmlDocSrc}
        sandbox="allow-scripts"
        style="width: {getDeviceWidth()};"
        class="preview-iframe"
      ></iframe>
    </div>
  {/if}
</div>

<style>
  .web-preview-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #0f172a;
    color: #f8fafc;
  }

  .preview-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
    padding: 0 16px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    font-size: 12px;
    user-select: none;
  }

  .preview-title {
    font-weight: 600;
    color: #38bdf8;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tool-btn {
    background: transparent;
    border: 1px solid #475569;
    color: #cbd5e1;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .tool-btn:hover {
    background: #334155;
    color: #f8fafc;
  }

  .tool-btn.active {
    background: #38bdf8;
    color: #0f172a;
    border-color: #38bdf8;
    font-weight: 700;
  }

  .zoom-readout {
    font-family: monospace;
    font-size: 11px;
    color: #94a3b8;
    min-width: 36px;
    text-align: center;
  }

  .svg-canvas-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    background-image: radial-gradient(#334155 1px, transparent 0);
    background-size: 16px 16px;
    padding: 40px;
  }

  .svg-stage {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease-out;
    background: #1e293b;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    max-width: 90%;
    max-height: 90%;
  }

  :global(.svg-stage svg) {
    max-width: 100%;
    max-height: 100%;
  }

  .iframe-stage-container {
    flex: 1;
    display: flex;
    justify-content: center;
    background: #090d16;
    overflow: hidden;
    padding: 10px 0;
  }

  .preview-iframe {
    height: 100%;
    border: 1px solid #334155;
    border-radius: 8px;
    background: #ffffff;
    transition: width 0.25s ease-in-out;
  }
</style>
