import { GraphDB } from "https://cdn.jsdelivr.net/npm/gdb-p2p@0/+esm";

document.addEventListener('DOMContentLoaded', function () {
  const pixelCanvas = document.getElementById('pixelCanvas')
  const colorPicker = document.getElementById('colorPicker')
  const clearBtn = document.getElementById('clearBtn')
  const saveBtn = document.getElementById('saveBtn')
  const usernameInput = document.getElementById('username')
  const onlineUsersSpan = document.getElementById('onlineUsers')

  const CANVAS_SIZE = 32
  let currentColor = colorPicker.value
  let isDrawing = false
  let username = `Anonymous-${Math.floor(Math.random() * 1000)}`
  usernameInput.value = username

  // === GraphDB Setup ===
  const db = new GraphDB('pixelroom')
  const [sendPaint, onPaint] = db.room.makeAction('paintPixel')
  const [sendClear, onClear] = db.room.makeAction('clearCanvas')

  db.room.onPeerJoin(updateOnlineUsers)
  db.room.onPeerLeave(updateOnlineUsers)

  function updateOnlineUsers () {
    const count = db.room.getPeers().length
    onlineUsersSpan.textContent = `Online: ${count}`
  }

  // === Canvas Initialization ===
  function initCanvas () {
    pixelCanvas.innerHTML = ''
    for (let i = 0; i < CANVAS_SIZE * CANVAS_SIZE; i++) {
      const pixel = document.createElement('div')
      pixel.classList.add('pixel')
      pixel.dataset.index = i
      pixel.style.backgroundColor = '#ffffff'
      pixelCanvas.appendChild(pixel)
    }
  }

  // === Events ===
  colorPicker.addEventListener('change', e => {
    currentColor = e.target.value
  })

  pixelCanvas.addEventListener('mousedown', e => {
    if (e.target.classList.contains('pixel')) {
      isDrawing = true
      paintPixel(e.target)
    }
  })

  pixelCanvas.addEventListener('mouseover', e => {
    if (isDrawing && e.target.classList.contains('pixel')) {
      paintPixel(e.target)
    }
  })

  document.addEventListener('mouseup', () => {
    isDrawing = false
  })

  clearBtn.addEventListener('click', () => {
    clearCanvas()
    sendClear(null)
  })

  saveBtn.addEventListener('click', saveCanvas)

  usernameInput.addEventListener('change', e => {
    username = e.target.value || 'Anonymous'
  })

  // === Paint Pixel ===
  function paintPixel (pixel) {
    const index = pixel.dataset.index
    pixel.style.backgroundColor = currentColor
    pixel.title = `Painted by ${username}`
    sendPaint({ index, color: currentColor, username })
  }

  function updatePixel (index, color, user) {
    const pixels = pixelCanvas.querySelectorAll('.pixel')
    pixels[index].style.backgroundColor = color
    pixels[index].title = `Painted by ${user}`
  }

  function clearCanvas () {
    const pixels = pixelCanvas.querySelectorAll('.pixel')
    pixels.forEach(pixel => {
      pixel.style.backgroundColor = '#ffffff'
      pixel.title = ''
    })
  }

  function saveCanvas () {
    const tempCanvas = document.createElement('canvas')
    const ctx = tempCanvas.getContext('2d')
    tempCanvas.width = CANVAS_SIZE
    tempCanvas.height = CANVAS_SIZE

    const pixels = pixelCanvas.querySelectorAll('.pixel')
    pixels.forEach((pixel, index) => {
      const x = index % CANVAS_SIZE
      const y = Math.floor(index / CANVAS_SIZE)
      ctx.fillStyle = pixel.style.backgroundColor || '#ffffff'
      ctx.fillRect(x, y, 1, 1)
    })

    const link = document.createElement('a')
    link.download = 'pixel-art.png'
    link.href = tempCanvas.toDataURL('image/png')
    link.click()
  }

  // === Remote Event Handlers ===
  onPaint(({ index, color, username }) => {
    updatePixel(index, color, username)
  })

  onClear((data) => clearCanvas())

  // === Start ===
  initCanvas()
  updateOnlineUsers()
})
