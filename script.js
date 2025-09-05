  
    // Elements
    const dataInput = document.getElementById('dataInput');
    const sizeInput = document.getElementById('sizeInput');
    const fgColor = document.getElementById('fgColor');
    const bgColor = document.getElementById('bgColor');
    const ecLevel = document.getElementById('ecLevel');
    const marginInput = document.getElementById('margin');
    const logoInput = document.getElementById('logoInput');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const qrcodeHolder = document.getElementById('qrcodeHolder');
    const hiddenCanvas = document.getElementById('hiddenCanvas');
    const historyList = document.getElementById('historyList');

    let currentLogo = null; // Image object for logo
    let lastGenerated = null; // store last generated data

    


    // Load logo preview when user picks file
    logoInput.addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if(!file) return currentLogo = null;
      const img = new Image();
      img.onload = ()=>{ currentLogo = img; }
      img.onerror = ()=>{ alert('Could not load logo image.'); currentLogo = null }
      img.src = URL.createObjectURL(file);
    });

    function clearHolder(){ qrcodeHolder.innerHTML = ''; }

    function drawQRCodeToCanvas(text, size, fg, bg, ec, margin, logo){
      // Create temporary QR on an offscreen div using QRCode.js
      const tempDiv = document.createElement('div');
      new QRCode(tempDiv, {text: text, width: size, height: size, colorDark: fg, colorLight: bg, correctLevel: QRCode.CorrectLevel[ec]});

      // QRCode.js renders a table for HTML fallback and a canvas for some builds — we will render into a canvas ourselves
      // We'll draw pixels based on the table cells (if table exists) or try to use the generated canvas
      const table = tempDiv.querySelector('table');
      const generatedCanvas = tempDiv.querySelector('canvas');

      const canvas = hiddenCanvas;
      const ctx = canvas.getContext('2d');
      canvas.width = size;
      canvas.height = size;

      // Fill background
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,size,size);

      if(generatedCanvas){
        // If library created a canvas we can simply draw it scaled
        ctx.drawImage(generatedCanvas, 0,0,size,size);
      } else if(table){
        // Draw pixel-by-pixel from table cells
        const cells = table.querySelectorAll('td');
        const tableSize = Math.sqrt(cells.length);
        const block = size / tableSize;
        for(let i=0;i<cells.length;i++){
          const r = Math.floor(i / tableSize);
          const c = i % tableSize;
          const cell = cells[i];
          const isDark = window.getComputedStyle(cell).backgroundColor !== 'rgba(0, 0, 0, 0)' && window.getComputedStyle(cell).backgroundColor !== 'transparent';
          ctx.fillStyle = isDark ? fg : bg;
          if(isDark) ctx.fillRect(c*block, r*block, Math.ceil(block), Math.ceil(block));
        }
      }

      // Composite logo in center if exists
      if(logo){
        const logoSize = size * 0.18; // logo takes 18% of QR width
        const x = (size - logoSize)/2;
        const y = (size - logoSize)/2;
        // draw white rounded rect behind logo for contrast (only if bg is light)
        ctx.fillStyle = '#ffffff';
        const padding = Math.max(6, logoSize*0.08);
        roundRect(ctx, x - padding/2, y - padding/2, logoSize + padding, logoSize + padding, 6);
        ctx.fillStyle = '#000000';
        ctx.drawImage(logo, x, y, logoSize, logoSize);
      }

      // return dataURL
      return canvas.toDataURL('image/png');
    }

    function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill();}

    function renderPreview(dataURL){
      clearHolder();
      const img = document.createElement('img');
      img.src = dataURL;
      img.alt = 'QR Preview';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      qrcodeHolder.appendChild(img);
    }

    function saveToHistory(payload){
      const history = JSON.parse(localStorage.getItem('qr_history_v1')||'[]');
      history.unshift(payload);
      if(history.length>12) history.pop();
      localStorage.setItem('qr_history_v1', JSON.stringify(history));
      renderHistory();
    }

    function renderHistory(){
      const history = JSON.parse(localStorage.getItem('qr_history_v1')||'[]');
      historyList.innerHTML = '';
      if(history.length===0){historyList.innerHTML='<div class="small">No history yet — generate a QR to save it here.</div>';return}
      history.forEach((h, idx)=>{
        const item = document.createElement('div'); item.className='item';
        const img = document.createElement('img'); img.src=h.dataURL; img.style.width='48px'; img.style.height='48px'; img.style.objectFit='cover'; img.style.borderRadius='6px';
        const meta = document.createElement('div'); meta.style.flex='1'; meta.innerHTML=`<div style="font-weight:600">${h.text}</div><div class="small">${new Date(h.t).toLocaleString()}</div>`;
        const actions = document.createElement('div'); actions.style.display='flex'; actions.style.gap='8px';
        const dl = document.createElement('button'); dl.className='btn ghost'; dl.textContent='Download'; dl.onclick=()=>downloadDataURL(h.dataURL, `qr-${idx+1}.png`);
        const use = document.createElement('button'); use.className='btn ghost'; use.textContent='Use'; use.onclick=()=>{ dataInput.value=h.text; renderPreview(h.dataURL); lastGenerated=h; downloadBtn.style.display='inline-block'; copyLinkBtn.style.display='inline-block'; shareBtn.style.display='inline-block'; }
        actions.appendChild(dl); actions.appendChild(use);
        item.appendChild(img); item.appendChild(meta); item.appendChild(actions);
        historyList.appendChild(item);
      });
    }

    function downloadDataURL(dataURL, filename){
      const a = document.createElement('a'); a.href=dataURL; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    }

    generateBtn.addEventListener('click', ()=>{
      const text = dataInput.value.trim();
      if(!text){alert('Please enter text or URL');return}
      const size = parseInt(sizeInput.value,10)||300;
      const fg = fgColor.value;
      const bg = bgColor.value;
      const ec = ecLevel.value;
      const margin = parseInt(marginInput.value,10)||2;

      // Use drawing helper
      const dataURL = drawQRCodeToCanvas(text, size, fg, bg, ec, margin, currentLogo);
      renderPreview(dataURL);
      downloadBtn.style.display='inline-block';
      copyLinkBtn.style.display='inline-block';
      shareBtn.style.display=(navigator.share? 'inline-block':'none');

      // save
      const payload = {text, dataURL, size, t: Date.now()};
      saveToHistory(payload);
      lastGenerated = payload;
    });

    downloadBtn.addEventListener('click', ()=>{
      if(!lastGenerated){ alert('Generate a QR first.'); return }
      downloadDataURL(lastGenerated.dataURL, 'qr-code.png');
    });

    copyLinkBtn.addEventListener('click', async ()=>{
      if(!lastGenerated){ alert('Generate first.'); return }
      await navigator.clipboard.writeText(lastGenerated.text);
      alert('Text copied to clipboard');
    });

    shareBtn.addEventListener('click', async ()=>{
      if(!lastGenerated) return;
      if(navigator.share){
        try{ await navigator.share({title:'QR Code', text: lastGenerated.text}) }catch(e){}
      }
    });

    document.getElementById('example1').addEventListener('click', ()=>{ dataInput.value='https://kashaf31.github.io'; });
    document.getElementById('example2').addEventListener('click', ()=>{ dataInput.value='WIFI:T:WPA;S:MyNetwork;P:password;;'; });

    document.getElementById('downloadSVG').addEventListener('click', ()=>{
      const text = dataInput.value.trim(); if(!text){alert('Enter text first');return}
      // Use qrserver API for quick SVG download
      const size = sizeInput.value||300;
      const svgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=svg`;
      window.open(svgUrl, '_blank');
    });

    document.getElementById('clearHistory').addEventListener('click', ()=>{ if(confirm('Clear history?')){ localStorage.removeItem('qr_history_v1'); renderHistory(); }});

    // helper to init
    (function init(){ renderHistory(); })();