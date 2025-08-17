// script.js (Guardado Automático Fiable - Sin Botón Force Save)
// import { gdb } from "https://cdn.jsdelivr.net/npm/genosdb@latest/dist/index.min.js";
import { gdb } from '../../gdb/dist/index.js'

document.addEventListener('DOMContentLoaded', () => {
  // Reliable Auto Save Pixel Painting App
  const pixelCanvas = document.getElementById('pixelCanvas');
  const colorPicker = document.getElementById('colorPicker');
  const clearBtn = document.getElementById('clearBtn');
  const saveLocalBtn = document.getElementById('saveLocalBtn');
  const usernameInput = document.getElementById('username');
  const onlineUsersSpan = document.getElementById('onlineUsers');

  const CANVAS_DB_NAME = 'pixelArtRoom_AutoSave_Reliable_v1';
  const PIXEL_STATE_NODE_ID = 'CANVAS_PIXEL_STATE_AUTOSAVE_R_V1';
  const CANVAS_SIZE = 32;
  if (pixelCanvas) pixelCanvas.style.setProperty('--canvas-size', CANVAS_SIZE);

  let currentColor = colorPicker ? colorPicker.value : '#000000';
  let isDrawing = false;
  let username = `User-${Math.floor(Math.random() * 1000)}`;
  if (usernameInput) usernameInput.value = username;
  let livePixelData = new Map();

  // Main async initialization
  (async () => {
    let db;
    try {
      db = await gdb(CANVAS_DB_NAME);
    } catch (e) {
      console.error("Failed to create gdb instance:", e); return;
    }

  // Data channels for paint and clear actions
  const paintChannel = db.room.channel('paint');
  const clearChannel = db.room.channel('clear');

    if (db.room) {
      db.room.on('peer:join', () => updateOnlineUsers());
      db.room.on('peer:leave', () => updateOnlineUsers());
    }

    const updateOnlineUsers = () => {
      if (!db.room || !onlineUsersSpan) return;
      const count = db.room.getPeers().length + 1;
      onlineUsersSpan.textContent = `Online: ${count}`;
    };

    const initCanvasStructure = () => {
      if (!pixelCanvas) return;
      pixelCanvas.innerHTML = '';
      for (let i = 0; i < CANVAS_SIZE * CANVAS_SIZE; i++) {
        const p = document.createElement('div');
        p.classList.add('pixel');
        p.dataset.index = i;
        p.style.backgroundColor = '#ffffff';
        pixelCanvas.appendChild(p);
      }
    };

    // Event Listeners
    const saveCanvasAsPNG = () => {
      if (!pixelCanvas) return;
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      const SCALE = 10;
      tempCanvas.width = CANVAS_SIZE * SCALE;
      tempCanvas.height = CANVAS_SIZE * SCALE;
      pixelCanvas.querySelectorAll('.pixel').forEach((n, i) => {
        const x = (i % CANVAS_SIZE) * SCALE;
        const y = Math.floor(i / CANVAS_SIZE) * SCALE;
        ctx.fillStyle = n.style.backgroundColor || '#ffffff';
        ctx.fillRect(x, y, SCALE, SCALE);
      });
      const link = document.createElement('a');
      link.download = 'pixel-art.png';
      link.href = tempCanvas.toDataURL();
      link.click();
    };
    if (colorPicker) colorPicker.addEventListener('change', e => { currentColor = e.target.value; });
    if (usernameInput) usernameInput.addEventListener('change', e => { username = e.target.value.trim() || `User-${Math.floor(Math.random() * 1000)}`; usernameInput.value = username; });
    if (saveLocalBtn) saveLocalBtn.addEventListener('click', saveCanvasAsPNG);

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
          persistCanvasState();
        }
      });
    }
    document.addEventListener('mouseup', () => {
      if (isDrawing) {
        isDrawing = false;
        persistCanvasState();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        performClearAction();
      });
    }

    // Painting and interaction logic
    const handlePixelInteraction = (pixelElement) => {
      const index = parseInt(pixelElement.dataset.index);
      const newColor = currentColor;
      renderPixelOnCanvas(index, newColor, username);
      livePixelData.set(index, { color: newColor, username: username });
      // Send paint action to peers
      paintChannel.send({ index, color: newColor, username });
    };

    const renderPixelOnCanvas = (index, color, user) => {
      if (!pixelCanvas) return;
      const pixelElement = pixelCanvas.querySelector(`.pixel[data-index="${index}"]`);
      if (pixelElement) {
        pixelElement.style.backgroundColor = color;
        pixelElement.title = user ? `Painted by ${user}` : '';
      }
    };

    // Clear logic
    const performClearAction = () => {
      if (pixelCanvas) {
        pixelCanvas.querySelectorAll('.pixel').forEach(p => {
          renderPixelOnCanvas(parseInt(p.dataset.index), '#ffffff', '');
        });
      }
      livePixelData.clear();
      // Send clear action to peers
      clearChannel.send({ clearedBy: username });
      persistCanvasState();
    };

    // Canvas state persistence
    const persistCanvasState = async () => {
      const pixelsToSave = Array.from(livePixelData.entries()).map(([index, data]) => ({
        index: index,
        color: data.color,
        username: data.username
      }));
      const dataToPut = {
        timestamp: Date.now(),
        savedBy: username,
        pixelDataArray: pixelsToSave
      };
      try {
        await db.put(dataToPut, PIXEL_STATE_NODE_ID);
      } catch (error) {
        console.error('Error persisting canvas state to DB:', error);
      }
    };

    const loadInitialCanvasState = async () => {
      if (!pixelCanvas) return;
      try {
        const { result } = await db.get(PIXEL_STATE_NODE_ID);
        if (result && result.value && result.value.pixelDataArray) {
          const savedState = result.value;
          livePixelData.clear();
          const loadedPixelArray = savedState.pixelDataArray;
          if (Array.isArray(loadedPixelArray)) {
            pixelCanvas.querySelectorAll('.pixel').forEach(p => renderPixelOnCanvas(parseInt(p.dataset.index), '#ffffff', ''));
            loadedPixelArray.forEach(pixelObject => {
              if (typeof pixelObject.index === 'number' && typeof pixelObject.color === 'string' && typeof pixelObject.username === 'string') {
                livePixelData.set(pixelObject.index, { color: pixelObject.color, username: pixelObject.username });
                renderPixelOnCanvas(pixelObject.index, pixelObject.color, pixelObject.username);
              }
            });
          }
        } else {
          livePixelData.clear();
        }
      } catch (error) {
        console.error("Error during loadInitialCanvasState:", error);
        livePixelData.clear();
      }
    };

    // Real-time data channel handlers
    paintChannel.on('message', (data, fromPeerId) => {
      renderPixelOnCanvas(data.index, data.color, data.username);
      livePixelData.set(data.index, { color: data.color, username: data.username });
    });

    clearChannel.on('message', (data, fromPeerId) => {
      if (pixelCanvas) {
        pixelCanvas.querySelectorAll('.pixel').forEach(p => {
          renderPixelOnCanvas(parseInt(p.dataset.index), '#ffffff', '');
        });
      }
      livePixelData.clear();
    });

  // ...existing code...

    // Start application
    const startApp = async () => {
      initCanvasStructure();
      updateOnlineUsers();
      await loadInitialCanvasState();
    };

    if (pixelCanvas && colorPicker && clearBtn && saveLocalBtn && usernameInput && onlineUsersSpan) {
      startApp().catch(err => console.error("Error during startApp:", err));
    } else {
      console.error("Essential UI elements missing. App cannot start.");
    }
  })();
});
// console.log("Script execution finished (Reliable AutoSave).");