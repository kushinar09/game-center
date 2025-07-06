// Import the io function from socket.io-client
const io = window.io

class CaroGame {
  constructor() {
    this.socket = null
    this.cellSize = 25 // Default cell size
    this.gameState = {
      board: Array.from({ length: 20 }, () => Array(20).fill("")),
      currentPlayer: null,
      playerNumber: null,
      gameStatus: "disconnected",
      message: "",
      winner: null,
      isMyTurn: false,
      rematchRequests: {
        count: 0,
        requester: null,
        hasRequested: false,
      },
    }
    this.init()
  }

  init() {
    this.connectToGame()
    this.setupEventListeners()
    this.calculateResponsiveSize()
    this.renderBoard()
  }

  // Calculate responsive cell size based on container
  calculateResponsiveSize() {
    const calculateSize = () => {
      const boardContainer = document.querySelector('#game-board')
      if (boardContainer) {
        const containerWidth = boardContainer.clientWidth - 48 // Account for padding
        const containerHeight = window.innerHeight * 0.7 // Use 70% of viewport height
        // Calculate maximum cell size that fits both width and height
        const maxCellWidth = Math.floor((containerWidth - 19 * 2) / 20) // 19 gaps of 2px
        const maxCellHeight = Math.floor((containerHeight - 19 * 2) / 20)
        const newCellSize = Math.min(maxCellWidth, maxCellHeight, 32) // Max 32px
        this.cellSize = Math.max(newCellSize, 18) // Min 18px (increased from 16px)
        
        // Update board grid styling
        const boardGrid = document.querySelector('#board-grid')
        // if (boardGrid) {
        //   boardGrid.style.gridTemplateColumns = `repeat(20, ${this.cellSize}px)`
        // }
      }
    }
    calculateSize()
    window.addEventListener('resize', calculateSize)
  }

  connectToGame() {
    const BACKEND_URL = window.location.origin + "/caro"
    this.socket = io(BACKEND_URL)

    // Socket event listeners (keep existing socket code)
    this.socket.on("joined", (data) => {
      this.updateGameState({
        playerNumber: data.player,
        gameStatus: data.player === 1 ? "waiting" : "playing",
        message: `You are Player ${data.player}${data.player === 1 ? ". Waiting for opponent..." : ". Game ready!"}`,
      })
      this.updatePlayerStatus()
    })

    this.socket.on("full", (message) => {
      this.updateGameState({
        gameStatus: "disconnected",
        message: message,
      })
      this.socket.disconnect()
      this.updateUI()
    })

    this.socket.on("waiting", (message) => {
      this.updateGameState({
        gameStatus: "waiting",
        playerNumber: 1,
        message: message,
      })
      this.updatePlayerStatus()
    })

    this.socket.on("start", (data) => {
      this.updateGameState({
        gameStatus: "playing",
        board: data.board,
        currentPlayer: data.turn,
        isMyTurn: this.gameState.playerNumber === data.turn,
        message: data.message,
        winner: null,
        rematchRequests: {
          count: 0,
          requester: null,
          hasRequested: false,
        },
      })
      this.renderBoard()
      this.updatePlayerStatus()
      this.updateGameControls()
    })

    this.socket.on("update", (data) => {
      this.updateGameState({
        board: data.board,
      })
      this.renderBoard()
    })

    this.socket.on("turn", (playerTurn) => {
      console.log(playerTurn, this.gameState.playerNumber === playerTurn)
      this.updateGameState({
        currentPlayer: playerTurn,
        isMyTurn: this.gameState.playerNumber === playerTurn,
        message: `Player ${playerTurn}'s turn`,
      })
      this.renderBoard()
      this.updatePlayerStatus()
      this.updateGameControls()
    })

    this.socket.on("end", (message) => {
      const winner = message.includes("X") ? "X" : "O"
      this.updateGameState({
        gameStatus: "ended",
        winner: winner,
        message: message,
        isMyTurn: false,
      })
      this.updatePlayerStatus()
      this.updateGameControls()
    })

    this.socket.on("reset", (data) => {
      this.updateGameState({
        board: data.board,
        gameStatus: "waiting",
        currentPlayer: null,
        winner: null,
        isMyTurn: false,
        message: "Game reset. Waiting for players...",
      })
      this.renderBoard()
      this.updatePlayerStatus()
      this.updateGameControls()
    })

    this.socket.on("not-your-turn", (message) => {
      this.updateGameState({ message: message })
      this.updateGameControls()
    })

    this.socket.on("invalid", (message) => {
      this.updateGameState({ message: message })
      this.updateGameControls()
    })

    this.socket.on("rematch-status", (data) => {
      this.updateGameState({
        rematchRequests: {
          count: data.count,
          requester: data.requester,
          hasRequested: this.gameState.rematchRequests.hasRequested || data.requester === this.socket.id,
        },
      })
      this.updateGameControls()
      this.updatePlayerStatus()
    })

    this.socket.on("disconnect", () => {
      this.updateGameState({
        gameStatus: "disconnected",
        message: "Disconnected from server",
      })
      this.updateUI()
    })
  }

  setupEventListeners() {
    // Rematch button
    document.getElementById("rematch-btn").addEventListener("click", () => {
      this.handleRematch()
    })
  }

  updateGameState(updates) {
    this.gameState = { ...this.gameState, ...updates }
  }

  renderBoard() {
    const boardGrid = document.querySelector("#board-grid")
    if (!boardGrid) return

    // Clear existing board
    boardGrid.innerHTML = ""

    // Set grid template columns for responsive sizing
    // boardGrid.style.gridTemplateColumns = `repeat(20, ${this.cellSize}px)`
    // boardGrid.style.gap = "2px"

    this.gameState.board.forEach((row, x) => {
      row.forEach((cell, y) => {
        const button = document.createElement("button")
        
        // Apply responsive sizing and styling
        button.className = `game-cell ${this.getCellStyle(cell)} ${
          this.isCellDisabled() ? "cursor-default" : "cursor-pointer hover:border-amber-300"
        }`
        
        // Set dynamic size and font size
        button.style.width = `${this.cellSize}px`
        button.style.height = `${this.cellSize}px`
        button.style.fontSize = `${Math.max(this.cellSize * 0.7, 14)}px` // Increased font size ratio
        button.style.fontWeight = "bold"
        button.style.display = "flex"
        button.style.alignItems = "center"
        button.style.justifyContent = "center"
        button.style.lineHeight = "1"
        button.style.userSelect = "none"
        button.style.border = "2px solid"
        button.style.borderRadius = "4px"
        button.style.transition = "all 0.2s ease"
        
        // Set cell content with better visibility
        if (cell) {
          button.textContent = cell
          button.classList.add("placed")
          // Ensure text is always visible
          button.style.color = cell === "X" ? "#1d4ed8" : "#dc2626" // Blue for X, Red for O
          button.style.textShadow = "0 0 1px rgba(0,0,0,0.3)"
        } else {
          button.textContent = ""
        }

        button.addEventListener("click", () => this.handleCellClick(x, y))
        boardGrid.appendChild(button)
      })
    })
  }

  getCellStyle(cell) {
    if (cell === "X") {
      return "bg-blue-100 text-blue-700 border-blue-300 shadow-sm"
    }
    if (cell === "O") {
      return "bg-red-100 text-red-700 border-red-300 shadow-sm"
    }
    return "bg-white hover:bg-amber-50 transition-colors border-amber-200"
  }

  isCellDisabled() {
    return this.gameState.gameStatus !== "playing" || !this.gameState.isMyTurn
  }

  handleCellClick(x, y) {
    if (this.socket && this.gameState.gameStatus === "playing" && this.gameState.isMyTurn) {
      this.socket.emit("move", { x, y })
    }
  }

  handleRematch() {
    if (this.socket && this.gameState.gameStatus === "ended") {
      this.socket.emit("rematch")
      this.updateGameState({
        rematchRequests: {
          ...this.gameState.rematchRequests,
          hasRequested: true,
        },
      })
      this.updateGameControls()
    }
  }

  getPlayerSymbol(playerNumber) {
    return playerNumber === 1 ? "X" : "O"
  }

  // Keep existing updatePlayerStatus and updateGameControls methods
  updatePlayerStatus() {
    const playerInfo = document.getElementById("player-info")
    const notConnected = document.getElementById("not-connected")
    const playerBadge = document.getElementById("player-badge")
    const currentTurn = document.getElementById("current-turn")
    const turnBadge = document.getElementById("turn-badge")
    const gameResult = document.getElementById("game-result")
    const resultBadge = document.getElementById("result-badge")
    const rematchStatus = document.getElementById("rematch-status")
    const rematchBadge = document.getElementById("rematch-badge")

    if (this.gameState.playerNumber) {
      playerInfo.classList.remove("hidden")
      notConnected.classList.add("hidden")

      const symbol = this.getPlayerSymbol(this.gameState.playerNumber)
      const colorClass =
        symbol === "X"
          ? "bg-blue-100 text-blue-700 border border-blue-300"
          : "bg-red-100 text-red-700 border border-red-300"

      playerBadge.textContent = `Player ${this.gameState.playerNumber} (${symbol})`
      playerBadge.className = `px-3 py-1 rounded-full text-sm font-semibold ${colorClass}`

      if (this.gameState.gameStatus === "playing") {
        currentTurn.classList.remove("hidden")
        const isMyTurn = this.gameState.isMyTurn
        turnBadge.textContent = isMyTurn ? "Your turn" : `Player ${this.gameState.currentPlayer}`
        turnBadge.className = `px-3 py-1 rounded-full text-sm font-semibold turn-indicator ${
          isMyTurn
            ? "bg-green-100 text-green-700 border border-green-300 active"
            : "bg-gray-100 text-gray-700 border border-gray-300"
        }`
      } else {
        currentTurn.classList.add("hidden")
      }

      if (this.gameState.gameStatus === "ended") {
        gameResult.classList.remove("hidden")
        const isWinner =
          this.gameState.winner && this.getPlayerSymbol(this.gameState.playerNumber) === this.gameState.winner

        if (isWinner) {
          resultBadge.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3l14 9-14 9V3z"></path>
            </svg>
            You Won!
          `
          resultBadge.className =
            "px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 bg-green-100 text-green-700 border border-green-300"
        } else {
          resultBadge.textContent = "You Lost"
          resultBadge.className =
            "px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 bg-red-100 text-red-700 border border-red-300"
        }
      } else {
        gameResult.classList.add("hidden")
      }

      if (this.gameState.gameStatus === "ended" && this.gameState.rematchRequests.count > 0) {
        rematchStatus.classList.remove("hidden")
        rematchBadge.textContent = `${this.gameState.rematchRequests.count}/2 ready`
      } else {
        rematchStatus.classList.add("hidden")
      }
    } else {
      playerInfo.classList.add("hidden")
      notConnected.classList.remove("hidden")
    }
  }

  updateGameControls() {
    const gameMessage = document.getElementById("game-message")
    const messageDesc = gameMessage.querySelector(".alert-description")
    const rematchSection = document.getElementById("rematch-section")
    const rematchBtn = document.getElementById("rematch-btn")
    const rematchBtnText = document.getElementById("rematch-btn-text")
    const rematchInfo = document.getElementById("rematch-info")
    const rematchCountBadge = document.getElementById("rematch-count-badge")
    const rematchMessage = document.getElementById("rematch-message")
    const connectionStatus = document.getElementById("connection-status")
    const connectionIndicator = document.getElementById("connection-indicator")

    if (this.gameState.message) {
      gameMessage.classList.remove("hidden")
      messageDesc.textContent = this.gameState.message
      gameMessage.className = "p-4 border rounded-lg hidden"

      if (this.gameState.message.includes("win") || this.gameState.message.includes("Won")) {
        gameMessage.classList.add("bg-green-50", "border-green-200")
        messageDesc.className = "alert-description text-green-800 font-medium"
      } else if (this.gameState.message.includes("turn")) {
        gameMessage.classList.add("bg-blue-50", "border-blue-200")
        messageDesc.className = "alert-description text-blue-800 font-medium"
      } else {
        gameMessage.classList.add("bg-yellow-50", "border-yellow-200")
        messageDesc.className = "alert-description text-yellow-800 font-medium"
      }
      gameMessage.classList.remove("hidden")
    } else {
      gameMessage.classList.add("hidden")
    }

    if (this.gameState.gameStatus === "ended") {
      rematchSection.classList.remove("hidden")

      if (this.gameState.rematchRequests.hasRequested) {
        rematchBtn.className =
          "btn w-full bg-gray-500 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold cursor-not-allowed"
        rematchBtn.disabled = true
        rematchBtnText.textContent = "Rematch Requested"
        rematchBtn.querySelector("svg").innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
      } else {
        rematchBtn.className =
          "btn w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold"
        rematchBtn.disabled = false
        rematchBtnText.textContent = "Request Rematch"
        rematchBtn.querySelector("svg").innerHTML =
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>'
      }

      if (this.gameState.rematchRequests.count > 0) {
        rematchInfo.classList.remove("hidden")
        rematchCountBadge.textContent = `${this.gameState.rematchRequests.count}/2 players ready`
        const statusMessage = this.getRematchStatusMessage()
        if (statusMessage) {
          rematchMessage.textContent = statusMessage
        }
      } else {
        rematchInfo.classList.add("hidden")
      }
    } else {
      rematchSection.classList.add("hidden")
    }

    connectionStatus.textContent = this.gameState.gameStatus
    connectionIndicator.className = `connection-indicator ${this.gameState.gameStatus}`

    if (this.gameState.gameStatus === "disconnected") {
      connectionIndicator.classList.add("disconnected")
    } else if (this.gameState.gameStatus === "waiting") {
      connectionIndicator.classList.add("waiting")
    } else {
      connectionIndicator.classList.add("connected")
    }
  }

  getRematchStatusMessage() {
    if (this.gameState.rematchRequests.count === 0) return null
    if (this.gameState.rematchRequests.count === 1) {
      return this.gameState.rematchRequests.hasRequested
        ? "Waiting for opponent to accept rematch..."
        : "Opponent wants a rematch!"
    }
    return "Starting new game..."
  }

  updateUI() {
    this.updatePlayerStatus()
    this.updateGameControls()
  }
}

// Initialize the game when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new CaroGame()
})