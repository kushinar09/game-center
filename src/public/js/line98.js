document.addEventListener("DOMContentLoaded", () => {
  let selectedCell = null
  const gameBoard = document.getElementById("game-board")
  const undoBtn = document.getElementById("undo")
  const redoBtn = document.getElementById("redo")

  let currentHintPath = null;
  let hintTimeout = null;

  if (!gameBoard) return

  gameBoard.addEventListener("click", (e) => {
    const cell = e.target.closest(".board-cell")
    if (!cell) return

    const x = Number.parseInt(cell.dataset.x)
    const y = Number.parseInt(cell.dataset.y)
    const hasBall = cell.querySelector(".ball")

    if (!selectedCell) {
      if (hasBall) selectCell(cell, x, y)
      return
    }

    if (selectedCell.x === x && selectedCell.y === y) {
      deselectCell()
      return
    }

    if (hasBall) {
      deselectCell()
      selectCell(cell, x, y)
      return
    }

    if (!hasBall && !cell.classList.contains("next-ball")) {
      moveBall(selectedCell.x, selectedCell.y, x, y)
    }
  })

  if (undoBtn) {
    undoBtn.addEventListener("click", async (e) => {
      e.preventDefault()
      if (undoBtn.disabled) return

      undoBtn.classList.add("btn-ghost") // Visual feedback
      setTimeout(() => undoBtn.classList.remove("btn-ghost"), 200)

      try {
        const res = await fetch("/line98/undo", {
          method: "POST",
          headers: { "Accept": "application/json" },
        })

        const data = await res.json()
        updateFromGameState(data.gameState)
      } catch (err) {
        console.error("Undo failed", err)
      }
    })
  }

  if (redoBtn) {
    redoBtn.addEventListener("click", async (e) => {
      e.preventDefault()
      if (redoBtn.disabled) return

      redoBtn.classList.add("btn-ghost")
      setTimeout(() => redoBtn.classList.remove("btn-ghost"), 200)

      try {
        const res = await fetch("/line98/redo", {
          method: "POST",
          headers: { "Accept": "application/json" },
        })

        const data = await res.json()
        updateFromGameState(data.gameState)
      } catch (err) {
        console.error("Redo failed", err)
      }
    })
  }

  document.getElementById("hint")?.addEventListener("click", async (e) => {
    e.preventDefault()
    getHint()
  })


  function updateFromGameState(gameState) {
    updateBoard(gameState.board)
    updateScore(gameState.score)
    updateButton(gameState.undo, gameState.redo, gameState.gameOver, gameState.score)
  }

  function selectCell(cell, x, y) {
    deselectCell()
    selectedCell = { x, y, element: cell }
    cell.classList.add("selected")
    const ball = cell.querySelector(".ball")
    if (ball) ball.classList.add("bouncing")
    addRippleEffect(cell)
  }

  function deselectCell() {
    if (selectedCell) {
      selectedCell.element.classList.remove("selected")
      const ball = selectedCell.element.querySelector(".ball")
      if (ball) ball.classList.remove("bouncing")
      selectedCell = null
    }
  }

  function addRippleEffect(element) {
    const ripple = document.createElement("div")
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: hsl(var(--primary) / 0.3);
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
      top: 50%;
      left: 50%;
      width: 20px;
      height: 20px;
      margin: -10px 0 0 -10px;
    `
    element.style.position = "relative"
    element.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
  }

  async function moveBall(fromX, fromY, toX, toY) {
    const gameBoard = document.getElementById("game-board")
    gameBoard.classList.add("loading")

    try {
      const response = await fetch("/line98/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromX, fromY, toX, toY }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.path && data.path.length > 1) {
        const from = data.path[0]
        const color = data.gameState.board[from.y][from.x]?.color

        animateMoveBall(data.path, color, () => {
          updateFromGameState(data.gameState)
          deselectCell()
          gameBoard.classList.remove("loading")
        })
      } else {
        updateFromGameState(data.gameState)
        deselectCell()
        gameBoard.classList.remove("loading")
      }

    } catch (err) {
      console.error("Move failed:", err)
      gameBoard.classList.remove("loading")
      // Optionally show user-friendly error message
      alert("Move failed. Please try again.")
    }
  }

  function animateMoveBall(path, color, onComplete) {
    if (!path || path.length < 2) return onComplete?.()

    const board = document.getElementById("game-board")
    const boardRect = board.getBoundingClientRect()

    // Get the starting cell and ball
    const from = path[0]
    const fromCell = getCell(from.x, from.y)
    const ballEl = fromCell.querySelector(".ball")
    if (!ballEl) return onComplete?.()

    // Get the actual position of the starting cell
    const fromCellRect = fromCell.getBoundingClientRect()

    // Create ghost ball
    const ghostBall = ballEl.cloneNode(true)
    ghostBall.style.position = "absolute"
    ghostBall.style.zIndex = "1000"
    ghostBall.style.transition = "top 0.05s ease-in-out, left 0.05s ease-in-out"
    ghostBall.style.pointerEvents = "none"

    // Position ghost ball at the starting position (relative to board)
    const startLeft = fromCellRect.left - boardRect.left + (fromCellRect.width - ballEl.offsetWidth) / 2
    const startTop = fromCellRect.top - boardRect.top + (fromCellRect.height - ballEl.offsetHeight) / 2

    ghostBall.style.left = `${startLeft}px`
    ghostBall.style.top = `${startTop}px`

    // Add ghost ball to board
    board.style.position = "relative" // Ensure board is positioned
    board.appendChild(ghostBall)

    // Hide original ball
    ballEl.style.visibility = "hidden"

    // Animate through each step
    let step = 1
    function moveStep() {
      if (step >= path.length) {
        ghostBall.remove()
        ballEl.style.visibility = "visible" // Restore original ball visibility
        return onComplete?.()
      }

      const { x, y } = path[step]
      const targetCell = getCell(x, y)
      const targetCellRect = targetCell.getBoundingClientRect()

      // Calculate target position relative to board
      const targetLeft = targetCellRect.left - boardRect.left + (targetCellRect.width - ballEl.offsetWidth) / 2
      const targetTop = targetCellRect.top - boardRect.top + (targetCellRect.height - ballEl.offsetHeight) / 2

      ghostBall.style.left = `${targetLeft}px`
      ghostBall.style.top = `${targetTop}px`

      step++
      setTimeout(moveStep, 20)
    }

    // Start animation after a small delay to ensure DOM is ready
    setTimeout(moveStep, 5)
  }

  function getCell(x, y) {
    return document.querySelector(`.board-cell[data-x="${x}"][data-y="${y}"]`)
  }

  function updateBoard(board) {
    const boardDiv = document.getElementById("game-board")
    boardDiv.innerHTML = ""

    board.forEach((row, y) => {
      row.forEach((cell, x) => {
        const cellDiv = document.createElement("div")
        cellDiv.className = "board-cell aspect-square flex items-center justify-center"
        cellDiv.dataset.x = x
        cellDiv.dataset.y = y

        if (cell) {
          const ballDiv = document.createElement("div")
          const color = cell.color
          if (cell.status === "cur") {
            ballDiv.className = "ball"
          } else if (cell.status === "next") {
            ballDiv.className = "small-ball"
          }
          ballDiv.dataset.color = color
          ballDiv.style.background = `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`

          const inner = document.createElement("div")
          inner.className = "ball-inner"
          ballDiv.appendChild(inner)
          cellDiv.appendChild(ballDiv)
        } else {
          const empty = document.createElement("div")
          empty.className = "empty-cell"
          cellDiv.appendChild(empty)
        }

        boardDiv.appendChild(cellDiv)
      })
    })
  }

  function updateScore(score) {
    document.querySelectorAll(".score-display").forEach(el => {
      el.textContent = score
    })
  }

  function updateButton(undo, redo, gameOver, score) {
    const undoButton = document.getElementById("undo")
    const redoButton = document.getElementById("redo")
    const hintButton = document.getElementById("hint")
    const gameOverField = document.getElementById("gameOver")

    if (undoButton) undoButton.disabled = !undo
    if (redoButton) redoButton.disabled = !redo
    if (hintButton) hintButton.disabled = gameOver
    if (gameOver) {
      gameOverField.classList.remove("hidden")
    } else if (!gameOverField.classList.contains("hidden")) {
      gameOverField.classList.add("hidden")
    }
  }

  async function getHint() {
    const hintButton = document.getElementById('hint');

    try {
      // Disable button and show loading state
      hintButton.disabled = true;
      hintButton.className = hintButton.className + ' opacity-50 cursor-not-allowed';
      hintButton.innerHTML = `
            <svg class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Getting Hint...
        `;

      // Clear any existing hint
      clearHint();

      const response = await fetch('/line98/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.path && data.path.length > 0) {
        // Store the hint path
        currentHintPath = data.path;

        // Highlight the path
        highlightHintPath(data.path);

        // Auto-clear hint after 5 seconds
        hintTimeout = setTimeout(() => {
          clearHint();
        }, 3000);
      }

    } catch (error) {
      console.error('Failed to get hint:', error);
    } finally {
      // Restore button state
      hintButton.disabled = false;
      hintButton.className = hintButton.className.replace(' opacity-50 cursor-not-allowed', '');
      hintButton.innerHTML = `
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
            Get Hint
        `;
    }
  }

  // Function to highlight hint path
  function highlightHintPath(path) {
    path.forEach((position, index) => {
      const cell = getCell(position.x, position.y);
      if (cell) {
        // Base classes for all hint cells
        cell.classList.add('relative', 'transform', 'transition-all', 'duration-300');

        if (index === 0) {
          // Start position - Green with glow
          cell.classList.add(
            'border-4', '!border-green-600', 'bg-green-100', 'scale-105'
          );
          cell.dataset.hintType = 'start';
        } else if (index === path.length - 1) {
          // End position - Red with glow
          cell.classList.add(
            'border-4', '!border-red-600', 'bg-red-100', 'scale-105'
          );
          cell.dataset.hintType = 'end';
        } else {
          // Path - Yellow with subtle glow
          cell.classList.add(
            'border-3', '!border-yellow-600', 'bg-yellow-50', 'scale-102'
          );
          cell.dataset.hintType = 'path';
        }

        setTimeout(() => {
          cell.classList.add('animate-pulse');
        }, index * 100);
      }
    });
  }

  // Function to clear hint highlighting
  function clearHint() {
    if (hintTimeout) {
      clearTimeout(hintTimeout);
      hintTimeout = null;
    }

    // Find all cells with hint data attributes
    const hintCells = document.querySelectorAll('[data-hint-type]');
    hintCells.forEach(cell => {
      // Remove Tailwind classes
      cell.classList.remove(
        'relative', 'animate-pulse',
        'border-4', 'border-3',
        '!border-green-600', '!border-red-600', '!border-yellow-600',
        'bg-green-100', 'bg-red-100', 'bg-yellow-100', 'bg-yellow-50',
        'scale-102', 'scale-105'
      );

      // Remove data attributes
      delete cell.dataset.hintType;

      // Remove step indicators
      const stepIndicators = cell.querySelectorAll('[data-hint-step]');
      stepIndicators.forEach(indicator => indicator.remove());
    });

    currentHintPath = null;
  }

  // Add ripple animation
  const style = document.createElement("style")
  style.textContent = `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `
  document.head.appendChild(style)

  const additionalCSS = `
.game-board {
    position: relative;
}

.game-board.loading {
    pointer-events: none;
    opacity: 0.7;
}

.ball {
    transition: none; /* Remove any existing transitions that might interfere */
}

/* Ensure smooth animation */
.ball-ghost {
    transition: top 0.15s ease-in-out, left 0.15s ease-in-out;
}
`;

  // Add the CSS if it doesn't exist
  if (!document.getElementById('animation-styles')) {
    const style = document.createElement('style')
    style.id = 'animation-styles'
    style.textContent = additionalCSS
    document.head.appendChild(style)
  }
})
