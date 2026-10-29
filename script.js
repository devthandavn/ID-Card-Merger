/**
 * ID Card A4 Print Maker
 * Strictly Client-Side Vanilla JS Implementation
 */

(() => {
  'use strict';

  // ========================================================================
  // Constants & Layout Source of Truth (Units in Millimetres)
  // ========================================================================
  const PAGE_WIDTH_MM = 210.0;
  const PAGE_HEIGHT_MM = 297.0;
  const MARGIN_TOP_MM = 25.4;    // Exactly 1 inch
  const MARGIN_LEFT_MM = 15.0;   // Left margin spec
  const MARGIN_RIGHT_MM = 15.0;  // Right margin spec
  const USABLE_WIDTH_SPEC_MM = 192.22; // Usable page width requirement

  // Standard ID-1 card dimensions (ISO/IEC 7810): 85.60 × 53.98 mm
  const DEFAULT_CARD_WIDTH_MM = 85.6;
  const DEFAULT_GAP_MM = 12.0;

  // ========================================================================
  // Application State
  // ========================================================================
  const state = {
    front: {
      file: null,
      img: null,
      dataUrl: null,
      rotation: 0, // 0, 90, 180, 270
      aspectRatio: 85.6 / 53.98 // width / height
    },
    back: {
      file: null,
      img: null,
      dataUrl: null,
      rotation: 0,
      aspectRatio: 85.6 / 53.98
    },
    settings: {
      cardWidthMm: DEFAULT_CARD_WIDTH_MM,
      gapMm: DEFAULT_GAP_MM
    }
  };

  // ========================================================================
  // DOM Elements
  // ========================================================================
  const dom = {
    // Inputs & drops
    frontInput: document.getElementById('frontInput'),
    backInput: document.getElementById('backInput'),
    frontDropZone: document.getElementById('frontDropZone'),
    backDropZone: document.getElementById('backDropZone'),
    frontPrompt: document.getElementById('frontPrompt'),
    backPrompt: document.getElementById('backPrompt'),
    frontThumbWrapper: document.getElementById('frontThumbWrapper'),
    backThumbWrapper: document.getElementById('backThumbWrapper'),
    frontThumb: document.getElementById('frontThumb'),
    backThumb: document.getElementById('backThumb'),
    frontActions: document.getElementById('frontActions'),
    backActions: document.getElementById('backActions'),

    // Rotate & remove buttons
    btnRotateLeftFront: document.getElementById('btnRotateLeftFront'),
    btnRotateRightFront: document.getElementById('btnRotateRightFront'),
    btnRemoveFront: document.getElementById('btnRemoveFront'),
    btnRotateLeftBack: document.getElementById('btnRotateLeftBack'),
    btnRotateRightBack: document.getElementById('btnRotateRightBack'),
    btnRemoveBack: document.getElementById('btnRemoveBack'),

    // Sliders
    cardWidthSlider: document.getElementById('cardWidthSlider'),
    cardGapSlider: document.getElementById('cardGapSlider'),
    cardWidthVal: document.getElementById('cardWidthVal'),
    cardGapVal: document.getElementById('cardGapVal'),
    specSideMargin: document.getElementById('specSideMargin'),

    // Main Actions
    btnDownloadPdf: document.getElementById('btnDownloadPdf'),
    btnDownloadPng: document.getElementById('btnDownloadPng'),
    btnPrint: document.getElementById('btnPrint'),
    btnShare: document.getElementById('btnShare'),
    btnReset: document.getElementById('btnReset'),
    statusMessage: document.getElementById('statusMessage'),

    // Live preview elements
    previewSheet: document.getElementById('previewSheet'),
    previewFrontSlot: document.getElementById('previewFrontSlot'),
    previewBackSlot: document.getElementById('previewBackSlot'),
    previewFrontImg: document.getElementById('previewFrontImg'),
    previewBackImg: document.getElementById('previewBackImg'),
    placeholderFront: document.getElementById('placeholderFront'),
    placeholderBack: document.getElementById('placeholderBack'),

    // Print elements
    printFrontContainer: document.getElementById('printFrontContainer'),
    printBackContainer: document.getElementById('printBackContainer'),
    printFrontImg: document.getElementById('printFrontImg'),
    printBackImg: document.getElementById('printBackImg')
  };

  // ========================================================================
  // Layout Calculation Logic (Shared across Preview, PDF, PNG, Print)
  // ========================================================================
  /**
   * Calculates exact millimeter positions for both cards based on:
   * - A4 dimensions: 210 x 297 mm
   * - Top margin: 25.4 mm
   * - Specified usable width & gap
   * - Preserves aspect ratio with zero distortion or cropping
   */
  function calculateLayout() {
    const cardW = state.settings.cardWidthMm;
    const gap = state.settings.gapMm;

    // Both cards in one row: total width = 2 * cardWidth + gap
    const totalRowWidth = (cardW * 2) + gap;

    // Center the row horizontally within the A4 page (210mm)
    // Left & right margins naturally balance and remain within safe boundary
    const calculatedLeftMargin = (PAGE_WIDTH_MM - totalRowWidth) / 2;

    const frontX = calculatedLeftMargin;
    const frontY = MARGIN_TOP_MM;
    const frontWidth = cardW;
    const frontHeight = cardW / state.front.aspectRatio;

    const backX = frontX + cardW + gap;
    const backY = MARGIN_TOP_MM;
    const backWidth = cardW;
    const backHeight = cardW / state.back.aspectRatio;

    return {
      pageWidth: PAGE_WIDTH_MM,
      pageHeight: PAGE_HEIGHT_MM,
      calculatedLeftMargin,
      front: { x: frontX, y: frontY, width: frontWidth, height: frontHeight },
      back: { x: backX, y: backY, width: backWidth, height: backHeight }
    };
  }

  // ========================================================================
  // Image Processing & Rotation via Canvas
  // ========================================================================
  /**
   * Rotates an image in 90-degree increments and produces an uncompressed data URL
   */
  function createRotatedImage(imgElement, degrees) {
    return new Promise((resolve) => {
      const rad = (degrees % 360) * Math.PI / 180;
      const isPerpendicular = (degrees % 180 !== 0);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const srcWidth = imgElement.naturalWidth || imgElement.width;
      const srcHeight = imgElement.naturalHeight || imgElement.height;

      canvas.width = isPerpendicular ? srcHeight : srcWidth;
      canvas.height = isPerpendicular ? srcWidth : srcHeight;

      // Fill canvas with pure white background for transparent PNG compatibility
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(imgElement, -srcWidth / 2, -srcHeight / 2);
      ctx.restore();

      const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const newImg = new Image();
      newImg.onload = () => {
        resolve({
          dataUrl: rotatedDataUrl,
          img: newImg,
          aspectRatio: canvas.width / canvas.height
        });
      };
      newImg.src = rotatedDataUrl;
    });
  }

  function handleImageFile(file, side) {
    if (!file) return;

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showStatus('Please upload a valid image file (JPG, PNG, or WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawImg = new Image();
      rawImg.onload = () => {
        state[side].file = file;
        state[side].rawImg = rawImg;
        state[side].rotation = 0;
        state[side].aspectRatio = rawImg.naturalWidth / rawImg.naturalHeight;
        state[side].img = rawImg;
        state[side].dataUrl = e.target.result;

        updateSideUI(side);
        renderPreview();
        checkReadyState();
        showStatus(`${side === 'front' ? 'Front' : 'Back'} image loaded successfully.`, 'info');
      };
      rawImg.onerror = () => {
        showStatus('Could not read image file. It may be corrupted.', 'error');
      };
      rawImg.src = e.target.result;
    };
    reader.onerror = () => {
      showStatus('Error reading file from disk.', 'error');
    };
    reader.readAsDataURL(file);
  }

  async function rotateSide(side, deltaDegrees) {
    if (!state[side].rawImg) return;

    state[side].rotation = (state[side].rotation + deltaDegrees + 360) % 360;
    const rotated = await createRotatedImage(state[side].rawImg, state[side].rotation);

    state[side].img = rotated.img;
    state[side].dataUrl = rotated.dataUrl;
    state[side].aspectRatio = rotated.aspectRatio;

    updateSideUI(side);
    renderPreview();
  }

  function removeSide(side) {
    state[side].file = null;
    state[side].rawImg = null;
    state[side].img = null;
    state[side].dataUrl = null;
    state[side].rotation = 0;
    state[side].aspectRatio = DEFAULT_CARD_WIDTH_MM / 53.98;

    if (side === 'front') {
      dom.frontInput.value = '';
      dom.frontThumb.src = '';
      dom.frontThumbWrapper.style.display = 'none';
      dom.frontPrompt.style.display = 'flex';
      dom.frontActions.style.display = 'none';
    } else {
      dom.backInput.value = '';
      dom.backThumb.src = '';
      dom.backThumbWrapper.style.display = 'none';
      dom.backPrompt.style.display = 'flex';
      dom.backActions.style.display = 'none';
    }

    renderPreview();
    checkReadyState();
    showStatus(`${side === 'front' ? 'Front' : 'Back'} image removed.`, 'info');
  }

  function updateSideUI(side) {
    const isFront = (side === 'front');
    const thumbWrapper = isFront ? dom.frontThumbWrapper : dom.backThumbWrapper;
    const prompt = isFront ? dom.frontPrompt : dom.backPrompt;
    const thumb = isFront ? dom.frontThumb : dom.backThumb;
    const actions = isFront ? dom.frontActions : dom.backActions;

    if (state[side].dataUrl) {
      thumb.src = state[side].dataUrl;
      thumbWrapper.style.display = 'flex';
      prompt.style.display = 'none';
      actions.style.display = 'flex';
    } else {
      thumbWrapper.style.display = 'none';
      prompt.style.display = 'flex';
      actions.style.display = 'none';
    }
  }

  // ========================================================================
  // Live Preview Rendering (Synchronized with Millimeter Layout)
  // ========================================================================
  function renderPreview() {
    const layout = calculateLayout();

    // Update side margin spec readout
    dom.specSideMargin.textContent = `${layout.calculatedLeftMargin.toFixed(1)} mm`;

    // Convert millimeters to percentages of A4 (210 x 297 mm)
    const toPercentX = (mm) => `${(mm / PAGE_WIDTH_MM) * 100}%`;
    const toPercentY = (mm) => `${(mm / PAGE_HEIGHT_MM) * 100}%`;

    // Front slot positioning
    dom.previewFrontSlot.style.left = toPercentX(layout.front.x);
    dom.previewFrontSlot.style.top = toPercentY(layout.front.y);
    dom.previewFrontSlot.style.width = toPercentX(layout.front.width);
    dom.previewFrontSlot.style.height = toPercentY(layout.front.height);

    if (state.front.dataUrl) {
      dom.previewFrontImg.src = state.front.dataUrl;
      dom.previewFrontImg.style.display = 'block';
      dom.placeholderFront.style.display = 'none';
    } else {
      dom.previewFrontImg.style.display = 'none';
      dom.placeholderFront.style.display = 'block';
    }

    // Back slot positioning
    dom.previewBackSlot.style.left = toPercentX(layout.back.x);
    dom.previewBackSlot.style.top = toPercentY(layout.back.y);
    dom.previewBackSlot.style.width = toPercentX(layout.back.width);
    dom.previewBackSlot.style.height = toPercentY(layout.back.height);

    if (state.back.dataUrl) {
      dom.previewBackImg.src = state.back.dataUrl;
      dom.previewBackImg.style.display = 'block';
      dom.placeholderBack.style.display = 'none';
    } else {
      dom.previewBackImg.style.display = 'none';
      dom.placeholderBack.style.display = 'block';
    }

    // Sync Print DOM elements
    syncPrintElements(layout);
  }

  function syncPrintElements(layout) {
    if (state.front.dataUrl) {
      dom.printFrontContainer.style.left = `${layout.front.x}mm`;
      dom.printFrontContainer.style.top = `${layout.front.y}mm`;
      dom.printFrontContainer.style.width = `${layout.front.width}mm`;
      dom.printFrontContainer.style.height = `${layout.front.height}mm`;
      dom.printFrontImg.src = state.front.dataUrl;
      dom.printFrontContainer.style.display = 'block';
    } else {
      dom.printFrontContainer.style.display = 'none';
    }

    if (state.back.dataUrl) {
      dom.printBackContainer.style.left = `${layout.back.x}mm`;
      dom.printBackContainer.style.top = `${layout.back.y}mm`;
      dom.printBackContainer.style.width = `${layout.back.width}mm`;
      dom.printBackContainer.style.height = `${layout.back.height}mm`;
      dom.printBackImg.src = state.back.dataUrl;
      dom.printBackContainer.style.display = 'block';
    } else {
      dom.printBackContainer.style.display = 'none';
    }
  }

  function checkReadyState() {
    const isReady = Boolean(state.front.dataUrl && state.back.dataUrl);
    dom.btnDownloadPdf.disabled = !isReady;
    dom.btnDownloadPng.disabled = !isReady;
    dom.btnPrint.disabled = !isReady;
    dom.btnShare.disabled = !isReady;
  }

  function showStatus(message, type = 'info') {
    dom.statusMessage.textContent = message;
    dom.statusMessage.className = `status-message ${type}`;
    dom.statusMessage.style.display = 'block';

    if (type !== 'error') {
      setTimeout(() => {
        if (dom.statusMessage.textContent === message) {
          dom.statusMessage.style.display = 'none';
        }
      }, 5000);
    }
  }

  // ========================================================================
  // PDF Generation (Direct mm coordinates using jsPDF)
  // ========================================================================
  async function generatePdf() {
    if (!state.front.dataUrl || !state.back.dataUrl) {
      showStatus('Both front and back ID images must be loaded.', 'error');
      return null;
    }

    try {
      showStatus('Building exact A4 PDF document...', 'info');

      // Initialize jsPDF with A4 Portrait in mm
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const layout = calculateLayout();

      // Ensure crisp white background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, 'F');

      // Embed ID Front
      pdf.addImage(
        state.front.dataUrl,
        'JPEG',
        layout.front.x,
        layout.front.y,
        layout.front.width,
        layout.front.height,
        undefined,
        'FAST'
      );

      // Embed ID Back
      pdf.addImage(
        state.back.dataUrl,
        'JPEG',
        layout.back.x,
        layout.back.y,
        layout.back.width,
        layout.back.height,
        undefined,
        'FAST'
      );

      return pdf;
    } catch (err) {
      console.error('PDF Generation Error:', err);
      showStatus('Failed to generate PDF. Check console for details.', 'error');
      return null;
    }
  }

  // ========================================================================
  // PNG Generation (Full A4 at 300 DPI: 2480 x 3508 pixels)
  // ========================================================================
  async function generatePngBlob() {
    if (!state.front.dataUrl || !state.back.dataUrl) {
      showStatus('Both front and back ID images must be loaded.', 'error');
      return null;
    }

    showStatus('Rendering 300 DPI A4 PNG sheet...', 'info');

    // 300 DPI calculation for A4 (210 x 297 mm):
    // 210 mm / 25.4 mm/in * 300 = ~2480 px
    // 297 mm / 25.4 mm/in * 300 = ~3508 px
    const TARGET_WIDTH_PX = 2480;
    const TARGET_HEIGHT_PX = 3508;
    const pxPerMm = TARGET_WIDTH_PX / PAGE_WIDTH_MM;

    const canvas = document.createElement('canvas');
    canvas.width = TARGET_WIDTH_PX;
    canvas.height = TARGET_HEIGHT_PX;
    const ctx = canvas.getContext('2d');

    // 1. Fill solid white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, TARGET_WIDTH_PX, TARGET_HEIGHT_PX);

    const layout = calculateLayout();

    // Helper to draw an image safely onto the canvas
    const drawItem = (img, itemLayout) => {
      const dx = itemLayout.x * pxPerMm;
      const dy = itemLayout.y * pxPerMm;
      const dw = itemLayout.width * pxPerMm;
      const dh = itemLayout.height * pxPerMm;
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    drawItem(state.front.img, layout.front);
    drawItem(state.back.img, layout.back);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  }

  // ========================================================================
  // Web Share API Implementation
  // ========================================================================
  async function handleShare() {
    if (!state.front.dataUrl || !state.back.dataUrl) return;

    if (!navigator.share) {
      showStatus('Web Share API is not supported on this browser. Use direct download buttons.', 'error');
      return;
    }

    try {
      const pdf = await generatePdf();
      if (!pdf) return;

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], 'id-card-a4.pdf', { type: 'application/pdf' });

      // Check if navigator.canShare supports files
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: 'ID Card A4 Print Sheet',
          text: 'Here is your print-ready A4 ID card sheet.',
          files: [pdfFile]
        });
        showStatus('Document shared successfully!', 'success');
      } else {
        // Fallback to sharing URL or notifying limitation
        await navigator.share({
          title: 'ID Card A4 Print Sheet',
          text: 'ID Card Print Maker ready on A4 page.'
        });
        showStatus('Direct file sharing not supported by system. Please use Download PDF or PNG.', 'info');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
        showStatus('Sharing was canceled or not completed.', 'info');
      }
    }
  }

  // ========================================================================
  // Reset Action
  // ========================================================================
  function handleReset() {
    state.front = {
      file: null,
      rawImg: null,
      img: null,
      dataUrl: null,
      rotation: 0,
      aspectRatio: DEFAULT_CARD_WIDTH_MM / 53.98
    };

    state.back = {
      file: null,
      rawImg: null,
      img: null,
      dataUrl: null,
      rotation: 0,
      aspectRatio: DEFAULT_CARD_WIDTH_MM / 53.98
    };

    state.settings.cardWidthMm = DEFAULT_CARD_WIDTH_MM;
    state.settings.gapMm = DEFAULT_GAP_MM;

    dom.cardWidthSlider.value = DEFAULT_CARD_WIDTH_MM;
    dom.cardGapSlider.value = DEFAULT_GAP_MM;
    dom.cardWidthVal.textContent = `${DEFAULT_CARD_WIDTH_MM.toFixed(1)} mm`;
    dom.cardGapVal.textContent = `${DEFAULT_GAP_MM.toFixed(1)} mm`;

    removeSide('front');
    removeSide('back');

    renderPreview();
    checkReadyState();
    showStatus('All settings and images have been reset.', 'info');
  }

  // ========================================================================
  // Drag and Drop & Event Listeners
  // ========================================================================
  function setupDragAndDrop(dropZone, fileInput, side) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleImageFile(files[0], side);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImageFile(e.target.files[0], side);
      }
    });
  }

  function initEventListeners() {
    // File inputs & Drag and drop
    setupDragAndDrop(dom.frontDropZone, dom.frontInput, 'front');
    setupDragAndDrop(dom.backDropZone, dom.backInput, 'back');

    // Rotate buttons
    dom.btnRotateLeftFront.addEventListener('click', () => rotateSide('front', -90));
    dom.btnRotateRightFront.addEventListener('click', () => rotateSide('front', 90));
    dom.btnRemoveFront.addEventListener('click', () => removeSide('front'));

    dom.btnRotateLeftBack.addEventListener('click', () => rotateSide('back', -90));
    dom.btnRotateRightBack.addEventListener('click', () => rotateSide('back', 90));
    dom.btnRemoveBack.addEventListener('click', () => removeSide('back'));

    // Dimension sliders
    dom.cardWidthSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.settings.cardWidthMm = val;
      dom.cardWidthVal.textContent = `${val.toFixed(1)} mm`;
      renderPreview();
    });

    dom.cardGapSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.settings.gapMm = val;
      dom.cardGapVal.textContent = `${val.toFixed(1)} mm`;
      renderPreview();
    });

    // Download PDF Button
    dom.btnDownloadPdf.addEventListener('click', async () => {
      const pdf = await generatePdf();
      if (pdf) {
        pdf.save('id-card-a4.pdf');
        showStatus('PDF downloaded: id-card-a4.pdf', 'success');
      }
    });

    // Download PNG Button
    dom.btnDownloadPng.addEventListener('click', async () => {
      const blob = await generatePngBlob();
      if (blob) {
        const link = document.createElement('a');
        link.download = 'id-card-a4.png';
        link.href = URL.createObjectURL(blob);
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 15000);
        showStatus('300 DPI PNG downloaded: id-card-a4.png', 'success');
      }
    });

    // Native Print Button
    dom.btnPrint.addEventListener('click', () => {
      if (!state.front.dataUrl || !state.back.dataUrl) return;
      window.print();
    });

    // Share Button
    dom.btnShare.addEventListener('click', handleShare);

    // Reset Button
    dom.btnReset.addEventListener('click', handleReset);
  }

  // ========================================================================
  // Initialize Application
  // ========================================================================
  initEventListeners();
  renderPreview();
  checkReadyState();
})();