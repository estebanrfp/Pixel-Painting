// script.js (Versión simplificada: Original + Nuevo Layout, SIN persistencia Base64)
import { GraphDB } from "https://cdn.jsdelivr.net/npm/gdb-p2p/+esm";

document.addEventListener('DOMContentLoaded', function () {
  // Selectores adaptados al nuevo HTML si es necesario
  const pixelCanvas = document.getElementById('pixelCanvas');
  const colorPicker = document.getElementById('colorPicker');
  const clearBtn = document.getElementById('clearBtn');
  const saveLocalBtn = document.getElementById('saveLocalBtn'); // ID del botón de guardado local
  const usernameInput = document.getElementById('username');
  const onlineUsersSpan = document.getElementById('onlineUsers');

  const CANVAS_SIZE = 32;
  // Para el CSS Grid, si el canvas necesita saber su tamaño dinámicamente:
  if (pixelCanvas) {
      pixelCanvas.style.setProperty('--canvas-size', CANVAS_SIZE);
  }

  let currentColor = colorPicker.value;
  let isDrawing = false;
  let username = `User-${Math.floor(Math.random() * 1000)}`;
  if (usernameInput) usernameInput.value = username;


  // === GraphDB Setup (Como en tu original) ===
  const db = new GraphDB('pixelArtRoom_SimpleLayout'); // Un nombre de DB diferente para evitar conflictos
  const [sendPaint, onPaint] = db.room.makeAction('paintPixel', true); // 'true' para acción persistente por si acaso
  const [sendClear, onClear] = db.room.makeAction('clearCanvas', true);

  if (db.room) {
    db.room.onPeerJoin(peerId => {
        console.log('Peer joined:', peerId);
        updateOnlineUsers();
    });
    db.room.onPeerLeave(peerId => {
        console.log('Peer left:', peerId);
        updateOnlineUsers();
    });
  }


  function updateOnlineUsers () {
    if (!db.room || !onlineUsersSpan) return;
    const count = db.room.getPeers().length + 1; // +1 para contarse a sí mismo
    onlineUsersSpan.textContent = `Online: ${count}`;
  }

  // === Canvas Initialization (Como en tu original) ===
  function initCanvas () {
    if (!pixelCanvas) {
        console.error("pixelCanvas element not found!");
        return;
    }
    pixelCanvas.innerHTML = ''; // Limpia el canvas
    for (let i = 0; i < CANVAS_SIZE * CANVAS_SIZE; i++) {
      const pixel = document.createElement('div');
      pixel.classList.add('pixel');
      pixel.dataset.index = i;
      pixel.style.backgroundColor = '#ffffff'; // Color inicial blanco
      pixelCanvas.appendChild(pixel);
    }
    console.log("Canvas initialized with grid.");
  }

  // === Event Listeners (Adaptados del original) ===
  if (colorPicker) {
    colorPicker.addEventListener('change', e => {
        currentColor = e.target.value;
    });
  }

  if (pixelCanvas) {
    pixelCanvas.addEventListener('mousedown', e => {
        if (e.target.classList.contains('pixel') && e.buttons === 1) { // Solo click izquierdo
        isDrawing = true;
        paintPixelOnElement(e.target); // Llama a la función que pinta y envía
        }
    });

    pixelCanvas.addEventListener('mouseover', e => {
        if (isDrawing && e.target.classList.contains('pixel') && e.buttons === 1) {
        paintPixelOnElement(e.target);
        }
    });
    // Añadido por si el mouse sale del canvas mientras se dibuja
    pixelCanvas.addEventListener('mouseleave', () => {
        if (isDrawing) {
            isDrawing = false; 
            // Aquí no hay guardado en DB en esta versión simplificada
        }
    });
  }
  

  document.addEventListener('mouseup', () => {
    if (isDrawing) {
      isDrawing = false;
      // Aquí no hay guardado en DB en esta versión simplificada
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        clearLocalCanvas(); // Limpia localmente
        sendClear({ clearedBy: username }); // Notifica a otros
    });
  }

  if (saveLocalBtn) {
    saveLocalBtn.addEventListener('click', saveCanvasAsPNG); // Función de guardado local
  }

  if (usernameInput) {
    usernameInput.addEventListener('change', e => {
        username = e.target.value.trim() || `User-${Math.floor(Math.random() * 1000)}`;
        usernameInput.value = username; // Actualiza el input por si se cambió a anónimo
    });
  }
  

  // === Paint Pixel (Lógica original de pintura y envío) ===
  function paintPixelOnElement (pixelElement) {
    const index = parseInt(pixelElement.dataset.index);
    
    // Opcional: No repintar si el color no ha cambiado
    // if (pixelElement.style.backgroundColor === currentColor) return;

    pixelElement.style.backgroundColor = currentColor;
    pixelElement.title = `Painted by ${username}`;
    sendPaint({ index, color: currentColor, username }); // Envía el evento
  }

  // === Remote Event Handlers (Lógica original) ===
  onPaint(({ index, color, username: remoteUser }) => {
    if (!pixelCanvas) return;
    const pixels = pixelCanvas.querySelectorAll('.pixel');
    if (pixels[index]) {
        pixels[index].style.backgroundColor = color;
        pixels[index].title = `Painted by ${remoteUser}`;
    }
  });

  onClear((data) => { // data podría contener {clearedBy: someUser}
    console.log("Clear event received", data);
    clearLocalCanvas();
  });

  function clearLocalCanvas() {
    if (!pixelCanvas) return;
    const pixels = pixelCanvas.querySelectorAll('.pixel');
    pixels.forEach(pixel => {
      pixel.style.backgroundColor = '#ffffff';
      pixel.title = '';
    });
    console.log("Local canvas cleared.");
  }

  // === Save Canvas Locally as PNG (Función original) ===
  function saveCanvasAsPNG () {
    if (!pixelCanvas) return;
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    // Para mejor calidad de imagen guardada, puedes escalar el tamaño del canvas temporal
    const EXPORT_SCALE = 10; 
    tempCanvas.width = CANVAS_SIZE * EXPORT_SCALE; 
    tempCanvas.height = CANVAS_SIZE * EXPORT_SCALE;

    const pixelElements = pixelCanvas.querySelectorAll('.pixel');
    if (pixelElements.length !== CANVAS_SIZE * CANVAS_SIZE) {
        console.warn("Pixel count mismatch during PNG export.");
        return;
    }

    pixelElements.forEach((pixelNode, index) => {
      const x = (index % CANVAS_SIZE) * EXPORT_SCALE;
      const y = Math.floor(index / CANVAS_SIZE) * EXPORT_SCALE;
      ctx.fillStyle = pixelNode.style.backgroundColor || '#ffffff'; // Asegura un color
      ctx.fillRect(x, y, EXPORT_SCALE, EXPORT_SCALE);
    });

    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  // === Start Application ===
  function startApp() {
    if (typeof GraphDB === 'undefined') {
        console.error("GraphDB is not loaded!");
        alert("Error: GraphDB library not found. App cannot start.");
        return;
    }
    initCanvas();       // Crea la cuadrícula de píxeles
    updateOnlineUsers(); // Actualiza el contador de usuarios
    console.log("Pixel app (simple layout version) started.");
  }

  // Verificar que los elementos esenciales del DOM existen antes de iniciar
  if (pixelCanvas && colorPicker && clearBtn && saveLocalBtn && usernameInput && onlineUsersSpan) {
    startApp();
  } else {
    console.error("One or more essential UI elements are missing from the HTML. App cannot start.");
    // Aquí podrías mostrar un mensaje al usuario en el propio HTML
    const body = document.querySelector('body');
    if (body) {
        const errorMsg = document.createElement('p');
        errorMsg.textContent = "Error: Missing UI elements. The application cannot start. Please check the HTML structure.";
        errorMsg.style.color = "red";
        errorMsg.style.textAlign = "center";
        errorMsg.style.padding = "20px";
        body.prepend(errorMsg);
    }
  }

}); // End DOMContentLoaded