// script.js (Guardado Automático Fiable - Sin Botón Force Save)
import { GDB } from "https://cdn.jsdelivr.net/npm/genosdb/+esm";

document.addEventListener('DOMContentLoaded', function () {
  // console.log("DOM Content Loaded. Initializing script (Reliable Auto Save)...");

  const pixelCanvas = document.getElementById('pixelCanvas');
  const colorPicker = document.getElementById('colorPicker');
  const clearBtn = document.getElementById('clearBtn');
  const saveLocalBtn = document.getElementById('saveLocalBtn');
  const usernameInput = document.getElementById('username');
  const onlineUsersSpan = document.getElementById('onlineUsers');

  // ELIMINADO: const cloudSaveBtn = document.createElement('button');
  // ELIMINADO: y su lógica de añadido al DOM

  const CANVAS_DB_NAME = 'pixelArtRoom_AutoSave_Reliable_v1'; 
  const PIXEL_STATE_NODE_ID = 'CANVAS_PIXEL_STATE_AUTOSAVE_R_V1';       

  const CANVAS_SIZE = 32;
  if (pixelCanvas) pixelCanvas.style.setProperty('--canvas-size', CANVAS_SIZE);
  
  let currentColor = colorPicker ? colorPicker.value : '#000000';
  let isDrawing = false;
  let username = `User-${Math.floor(Math.random() * 1000)}`;
  if (usernameInput) usernameInput.value = username;

  let livePixelData = new Map(); 

  // === GDB Setup ===
  let db;
  try {
    db = new GDB(CANVAS_DB_NAME);
    // console.log("GDB instance created:", CANVAS_DB_NAME);
  } catch (e) {
    console.error("Failed to create GDB instance:", e); return; 
  }
  
  const [sendPaintAction, onPaintAction] = db.room.makeAction('paintPx', true); 
  const [sendClearAction, onClearAction] = db.room.makeAction('clearPx', true);

  if (db.room) {
    db.room.onPeerJoin(peerId => updateOnlineUsers());
    db.room.onPeerLeave(peerId => updateOnlineUsers());
  }

  function updateOnlineUsers() { 
    if (!db.room || !onlineUsersSpan) return;
    const count = db.room.getPeers().length + 1;
    onlineUsersSpan.textContent = `Online: ${count}`;
  }

  function initCanvasStructure() { 
    if (!pixelCanvas) return;
    pixelCanvas.innerHTML = '';
    for (let i = 0; i < CANVAS_SIZE * CANVAS_SIZE; i++) {
      const p=document.createElement('div'); p.classList.add('pixel'); p.dataset.index=i; p.style.backgroundColor='#ffffff'; pixelCanvas.appendChild(p);
    }
    // console.log("Canvas structure initialized.");
  }
  
  // === Event Listeners ===
  if (colorPicker) colorPicker.addEventListener('change', e => { currentColor = e.target.value; });
  if (usernameInput) usernameInput.addEventListener('change', e => { username = e.target.value.trim() || `User-${Math.floor(Math.random() * 1000)}`; usernameInput.value = username; });
  if (saveLocalBtn) saveLocalBtn.addEventListener('click', saveCanvasAsPNG);
  
  // ELIMINADO: Event listener para cloudSaveBtn

  if (pixelCanvas) {
    pixelCanvas.addEventListener('mousedown', e => {
      if (e.target.classList.contains('pixel') && e.buttons === 1) {
        isDrawing = true;
        handlePixelInteraction(e.target);
      }
    });
    pixelCanvas.addEventListener('mouseover', e => {
      if (isDrawing && e.target.classList.contains('pixel') && e.buttons === 1) {
        handlePixelInteraction(e.target);
      }
    });
    pixelCanvas.addEventListener('mouseleave', () => { 
      if (isDrawing) { 
        isDrawing = false; 
        persistCanvasState(); // Llamada directa, el parámetro 'true' ya no es necesario si solo hay una forma de llamar
      }
    });
  }
  document.addEventListener('mouseup', (e) => { 
    if (isDrawing) { 
      isDrawing = false; 
      persistCanvasState(); // Llamada directa
    }
  });

  if (clearBtn) {
      clearBtn.addEventListener('click', () => {
          performClearAction();
      });
  }

  // === Lógica de Pintura e Interacción ===
  function handlePixelInteraction(pixelElement) {
    const index = parseInt(pixelElement.dataset.index);
    const newColor = currentColor;

    renderPixelOnCanvas(index, newColor, username);
    livePixelData.set(index, { color: newColor, username: username });
    sendPaintAction({ index, color: newColor, username: username });
  }

  function renderPixelOnCanvas(index, color, user) { /* ... sin cambios ... */ 
    if (!pixelCanvas) return;
    const pixelElement = pixelCanvas.querySelector(`.pixel[data-index="${index}"]`);
    if (pixelElement) {
      pixelElement.style.backgroundColor = color;
      pixelElement.title = user ? `Painted by ${user}` : '';
    }
  }

  // === Lógica de Limpieza ===
  function performClearAction() { /* ... sin cambios, persistCanvasState() se llamará ... */
    if (pixelCanvas) {
        pixelCanvas.querySelectorAll('.pixel').forEach(p => {
            renderPixelOnCanvas(parseInt(p.dataset.index), '#ffffff', '');
        });
    }
    livePixelData.clear(); 
    sendClearAction({ clearedBy: username });
    persistCanvasState(); // Guardar el estado limpio
  }

  // === Persistencia del Estado del Lienzo ===
  async function persistCanvasState() { // Ya no necesita el parámetro 'forceImmediateOrIsStopEvent'
    // console.log("Persisting canvas state (auto on stop draw/clear)...");
    
    const pixelsToSave = Array.from(livePixelData.entries()).map(([index, data]) => ({
        index: index,
        color: data.color,
        username: data.username
    }));

    // console.log(`Data to be saved (pixelsToSave, ${pixelsToSave.length} items)`);

    const dataToPut = { 
      timestamp: Date.now(),
      savedBy: username,
      pixelDataArray: pixelsToSave 
    };

    try {
      // console.log(`Attempting to db.put with ID: ${PIXEL_STATE_NODE_ID}`);
      await db.put(dataToPut, PIXEL_STATE_NODE_ID); 
      // console.log(`Canvas state (${pixelsToSave.length} pixels) PUT successful to DB node: ${PIXEL_STATE_NODE_ID}`);
    } catch (error) {
      console.error('Error persisting canvas state to DB:', error); 
    }
  }

  async function loadInitialCanvasState() { /* ... sin cambios (la versión con {result} desestructurado) ... */ 
    if (!pixelCanvas) return;
    // console.log(`Loading initial canvas state from DB node: ${PIXEL_STATE_NODE_ID}...`);
    try {
      const { result } = await db.get(PIXEL_STATE_NODE_ID); 
      // console.log("Value of 'result' from db.get():", JSON.stringify(result));

      if (result && result.value && result.value.pixelDataArray) { 
        const savedState = result.value; 
        // console.log(`Found saved state. By: ${savedState.savedBy}, At: ${new Date(savedState.timestamp).toLocaleString()}`);
        livePixelData.clear(); 
        const loadedPixelArray = savedState.pixelDataArray;
        // console.log(`loadedPixelArray from DB (type: ${typeof loadedPixelArray}, length: ${loadedPixelArray ? loadedPixelArray.length : 'N/A'})`);
        if (Array.isArray(loadedPixelArray)) {
            pixelCanvas.querySelectorAll('.pixel').forEach(p => renderPixelOnCanvas(parseInt(p.dataset.index), '#ffffff', ''));
            loadedPixelArray.forEach(pixelObject => {
                if (typeof pixelObject.index === 'number' && typeof pixelObject.color === 'string' && typeof pixelObject.username === 'string') {
                    livePixelData.set(pixelObject.index, { color: pixelObject.color, username: pixelObject.username }); 
                    renderPixelOnCanvas(pixelObject.index, pixelObject.color, pixelObject.username); 
                }
            });
            // console.log(`Loaded ${livePixelData.size} pixels from DB state and rendered.`);
        }
      } else {
        // console.log("No saved canvas state found in DB. Canvas starts blank.");
        if (result === null) { 
            // console.log("Confirmed: 'result' from db.get() is null, node not found with ID:", PIXEL_STATE_NODE_ID); 
        }
        livePixelData.clear(); 
      }
    } catch (error) {
      console.error("Error during loadInitialCanvasState:", error);
      livePixelData.clear();
    }
  }

  // === Manejadores de Acciones en Tiempo Real ===
  onPaintAction(({ index, color, username: remoteUser }) => { /* ... sin cambios ... */
    renderPixelOnCanvas(index, color, remoteUser);
    livePixelData.set(index, { color: color, username: remoteUser });
  });

  onClearAction(({ clearedBy }) => { /* ... sin cambios ... */
    // console.log(`onClearAction received from ${clearedBy}. Clearing local UI and data.`);
    if (pixelCanvas) {
        pixelCanvas.querySelectorAll('.pixel').forEach(p => {
            renderPixelOnCanvas(parseInt(p.dataset.index), '#ffffff', '');
        });
    }
    livePixelData.clear(); 
  });
  
  function saveCanvasAsPNG() { /* ... sin cambios ... */ 
    if (!pixelCanvas) return;
    const tempCanvas=document.createElement('canvas');const ctx=tempCanvas.getContext('2d');
    const SCALE=10;tempCanvas.width=CANVAS_SIZE*SCALE;tempCanvas.height=CANVAS_SIZE*SCALE;
    pixelCanvas.querySelectorAll('.pixel').forEach((n,i)=>{
        const x=(i%CANVAS_SIZE)*SCALE;const y=Math.floor(i/CANVAS_SIZE)*SCALE;
        ctx.fillStyle=n.style.backgroundColor||'#ffffff';ctx.fillRect(x,y,SCALE,SCALE);
    });
    const link=document.createElement('a');link.download='pixel-art.png';link.href=tempCanvas.toDataURL();link.click();
  }

  // === Start Application ===
  async function startApp() { /* ... sin cambios ... */ 
    // console.log("startApp called.");
    if (typeof GDB === 'undefined') { console.error("GDB not loaded!"); return; }
    
    initCanvasStructure();    
    updateOnlineUsers();      
    await loadInitialCanvasState(); 
    // console.log(`Pixel app (Reliable AutoSave - ${CANVAS_DB_NAME}) started.`);
  }

  // Modificado para no requerir cloudSaveBtn
  if (pixelCanvas && colorPicker && clearBtn && saveLocalBtn && usernameInput && onlineUsersSpan) {
    startApp().catch(err => console.error("Error during startApp:", err));
  } else {
    console.error("Essential UI elements missing. App cannot start.");
  }
});
// console.log("Script execution finished (Reliable AutoSave).");