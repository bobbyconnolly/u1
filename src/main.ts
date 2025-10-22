import "./style.css";

class XYModelSimulation {
  // Canvas and rendering context
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Grid dimensions and cell sizing
  private gridSizeX = 0;
  private gridSizeY = 0;
  private cellWidth = 0;
  private cellHeight = 0;
  private arrowLength = 0;
  private targetCellSize = 20; // Ideal cell size in pixels

  // Simulation state
  // 'grid' holds the "true" target angles calculated by physics.
  private grid: number[][];
  // 'renderGrid' holds the angles currently drawn on screen.
  // We interpolate from 'renderGrid' to 'grid' for smooth animation.
  private renderGrid: number[][];

  // Physics update interpolation factor (how fast arrows snap to target)
  private physicsInterpolationFactor = 0.2;

  // Animation loop state
  private frameCount = 0;
  private isPaused = false;
  private lastFrameTime = 0;

  // Simulation parameters (controlled by UI)
  private simulationSpeed = 5;
  private temperature = 0;

  // User interaction state
  private isMouseDownOnCanvas = false;
  private mousePos = { x: 0, y: 0 };

  // Control panel dragging state
  private controlsPanel: HTMLElement;
  private isDraggingPanel = false;
  private dragOffset = { x: 0, y: 0 };

  // Info Modal state and elements
  private infoButton: HTMLElement;
  private infoModal: HTMLElement;
  private infoCloseButtonDesktop: HTMLElement;
  private infoCloseButtonMobile: HTMLElement;

  // Global rotation state
  private rotateButton: HTMLElement;
  private isGlobalRotationActive = false;
  private globalRotationSpeed = (Math.PI / 180) * 2; // 2 degrees per frame

  constructor(canvasId: string, controlsId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.controlsPanel = document.getElementById(controlsId)!;

    // Find all the UI elements we need to interact with
    this.infoButton = document.getElementById("info-button")!;
    this.infoModal = document.getElementById("info-modal")!;
    this.infoCloseButtonDesktop = document.getElementById(
      "info-close-button-desktop"
    )!;
    this.infoCloseButtonMobile = document.getElementById(
      "info-close-button-mobile"
    )!;
    this.rotateButton = document.getElementById("rotate-button")!;

    this.grid = [];
    this.renderGrid = [];

    this.setupCanvas();
    this.loadPanelPosition();
    this.setupEventListeners();

    this.lastFrameTime = performance.now();
    this.animate(); // Start the main animation loop
  }

  /**
   * Sets up the canvas size and recalculates grid dimensions.
   * This is called on init and on window resize.
   */
  private setupCanvas(): void {
    const container = document.getElementById("simulation-container");
    if (!container) {
      console.error(
        "CRITICAL ERROR: Could not find element with ID 'simulation-container'. Aborting setup."
      );
      return;
    }

    // Fit canvas to the container
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;

    // Calculate grid sizing
    const minDimension = Math.min(this.canvas.width, this.canvas.height);
    const numCells = Math.max(1, Math.floor(minDimension / this.targetCellSize));
    const actualCellSize = minDimension / numCells;

    this.cellWidth = actualCellSize;
    this.cellHeight = actualCellSize;

    this.gridSizeX = Math.floor(this.canvas.width / this.cellWidth);
    this.gridSizeY = Math.floor(this.canvas.height / this.cellHeight);

    this.arrowLength = this.cellWidth * 0.45;

    this.initializeGrid();
  }

  /**
   * Resets and initializes the simulation grid with random angles.
   */
  public initializeGrid(): void {
    this.grid = [];
    this.renderGrid = [];
    for (let x = 0; x < this.gridSizeX; x++) {
      this.grid[x] = [];
      this.renderGrid[x] = [];
      for (let y = 0; y < this.gridSizeY; y++) {
        const randomAngle = Math.random() * 2 * Math.PI;
        this.grid[x][y] = randomAngle;
        this.renderGrid[x][y] = randomAngle;
      }
    }
  }

  /**
   * Loads the saved control panel position from localStorage on desktop.
   */
  private loadPanelPosition(): void {
    if (window.innerWidth > 600) {
      const savedX = localStorage.getItem("panelX");
      const savedY = localStorage.getItem("panelY");
      if (savedX && savedY) {
        this.controlsPanel.style.left = `${savedX}px`;
        this.controlsPanel.style.top = `${savedY}px`;
      }
    }
  }

  /**
   * Attaches all necessary event listeners for UI controls and user interaction.
   */
  private setupEventListeners(): void {
    const resetButton = document.getElementById("reset-button")!;
    const speedSlider = document.getElementById(
      "speed-slider"
    ) as HTMLInputElement;
    const tempSlider = document.getElementById(
      "temp-slider"
    ) as HTMLInputElement;

    // Prevent panel drag when clicking on buttons/sliders
    resetButton.addEventListener("mousedown", (e) => e.stopPropagation());
    speedSlider.addEventListener("mousedown", (e) => e.stopPropagation());
    tempSlider.addEventListener("mousedown", (e) => e.stopPropagation());
    this.infoButton.addEventListener("mousedown", (e) => e.stopPropagation());
    this.rotateButton.addEventListener("mousedown", (e) => e.stopPropagation());

    // UI Control listeners
    resetButton.addEventListener("click", () => this.initializeGrid());
    speedSlider.addEventListener("input", (e) => {
      this.simulationSpeed = parseInt((e.target as HTMLInputElement).value);
    });
    tempSlider.addEventListener("input", (e) => {
      this.temperature = parseInt((e.target as HTMLInputElement).value) / 100;
    });

    // Resize listener
    window.addEventListener("resize", () => this.setupCanvas());

    // Canvas Mouse interaction
    this.canvas.addEventListener("mousedown", (e) => {
      if (!this.isDraggingPanel) {
        this.isMouseDownOnCanvas = true;
        this.mousePos = this.getCanvasCoordinates(e) ?? { x: 0, y: 0 };
      }
    });

    // Canvas Touch interaction
    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        const coords = this.getCanvasCoordinates(e);
        if (coords) {
          this.isMouseDownOnCanvas = true;
          this.mousePos = coords;
        }
      },
      { passive: false }
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (this.isMouseDownOnCanvas) {
          const coords = this.getCanvasCoordinates(e);
          if (coords) {
            this.mousePos = coords;
          } else {
            this.isMouseDownOnCanvas = false;
          }
        }
      },
      { passive: false }
    );

    // Control Panel Drag (desktop only)
    this.controlsPanel.addEventListener("mousedown", (e) => {
      if (
        window.innerWidth > 600 &&
        !(e.target as HTMLElement).closest("button, input")
      ) {
        this.isDraggingPanel = true;
        this.dragOffset.x = e.clientX - this.controlsPanel.offsetLeft;
        this.dragOffset.y = e.clientY - this.controlsPanel.offsetTop;
      }
    });

    // Global 'end' listeners for mouse and touch
    const endInteraction = () => {
      this.isMouseDownOnCanvas = false;

      // If dragging panel, save its new position
      if (this.isDraggingPanel) {
        this.isDraggingPanel = false;
        localStorage.setItem(
          "panelX",
          this.controlsPanel.style.left.replace("px", "")
        );
        localStorage.setItem(
          "panelY",
          this.controlsPanel.style.top.replace("px", "")
        );
      }

      if (this.isGlobalRotationActive) {
        this.stopGlobalRotation();
      }
    };
    window.addEventListener("mouseup", endInteraction);
    window.addEventListener("touchend", endInteraction);

    // Stop rotation if mouse leaves button or window loses focus
    this.rotateButton.addEventListener("mouseleave", () => {
      if (this.isGlobalRotationActive) this.stopGlobalRotation();
    });
    window.addEventListener("blur", () => {
      if (this.isGlobalRotationActive) this.stopGlobalRotation();
    });

    // Mouse Move listener (for canvas interaction and panel dragging)
    window.addEventListener("mousemove", (e) => {
      if (this.isMouseDownOnCanvas && !this.isDraggingPanel) {
        const coords = this.getCanvasCoordinates(e);
        if (coords) {
          this.mousePos = coords;
        } else {
          this.isMouseDownOnCanvas = false;
        }
      }
      if (this.isDraggingPanel) {
        const newX = e.clientX - this.dragOffset.x;
        const newY = e.clientY - this.dragOffset.y;
        this.controlsPanel.style.left = `${newX}px`;
        this.controlsPanel.style.top = `${newY}px`;
      }
    });

    // Info Modal listeners
    this.infoButton.addEventListener("click", () => {
      this.infoModal.classList.remove("hidden");
      this.pause();
    });

    const closeModal = () => {
      this.infoModal.classList.add("hidden");
      this.resume();
    };
    this.infoCloseButtonDesktop.addEventListener("click", closeModal);
    this.infoCloseButtonMobile.addEventListener("click", closeModal);
    this.infoModal.addEventListener("click", (e) => {
      // Close if clicking on the background overlay
      if (e.target === this.infoModal) {
        closeModal();
      }
    });

    // Rotate Button listeners
    const startRotation = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.isGlobalRotationActive = true;
      this.rotateButton.classList.add("is-rotating");
      this.lastFrameTime = performance.now();
    };
    this.rotateButton.addEventListener("mousedown", startRotation);
    this.rotateButton.addEventListener("touchstart", startRotation, {
      passive: false,
    });
  }

  private stopGlobalRotation(): void {
    this.isGlobalRotationActive = false;
    this.rotateButton.classList.remove("is-rotating");
  }

  /**
   * Helper function to get accurate mouse/touch coordinates
   * relative to the canvas.
   */
  private getCanvasCoordinates(
    event: MouseEvent | TouchEvent
  ): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event instanceof TouchEvent && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      return null;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Check if coordinates are within the canvas bounds
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      return { x, y };
    }
    return null;
  }

  /**
   * Applies a global rotation to all arrows in the grid.
   * DeltaTime is used to ensure consistent speed regardless of frame rate.
   */
  private applyGlobalRotation(deltaTime: number): void {
    // Normalize rotation speed based on a 60fps target
    const rotationAmount = this.globalRotationSpeed * (deltaTime / (1000 / 60));

    for (let x = 0; x < this.gridSizeX; x++) {
      for (let y = 0; y < this.gridSizeY; y++) {
        // Apply to both physics and render grid for immediate visual feedback
        this.grid[x][y] += rotationAmount;
        this.renderGrid[x][y] += rotationAmount;
      }
    }
  }

  /**
   * This is the core physics update logic.
   * It runs at a speed determined by 'simulationSpeed'.
   */
  private updatePhysics(): void {
    // Create a snapshot of the current grid state to calculate the next state.
    // This prevents changes from one cell from immediately affecting its neighbor
    // in the same update step.
    const currentGridState = this.grid.map((row) => [...row]);

    for (let x = 0; x < this.gridSizeX; x++) {
      for (let y = 0; y < this.gridSizeY; y++) {
        // Check for mouse/touch interaction
        if (this.isMouseDownOnCanvas) {
          const canvasCenterX = (x + 0.5) * this.cellWidth;
          const canvasCenterY = (y + 0.5) * this.cellHeight;
          const dist = Math.hypot(
            this.mousePos.x - canvasCenterX,
            this.mousePos.y - canvasCenterY
          );

          // If mouse is close, force arrow to point at mouse
          if (dist < Math.min(this.cellWidth, this.cellHeight) * 1.5) {
            this.grid[x][y] = Math.atan2(
              this.mousePos.y - canvasCenterY,
              this.mousePos.x - canvasCenterX
            );
            continue; // Skip physics for this cell
          }
        }

        // Get the angles of the four neighbors (with wrapping boundaries)
        const neighbors = [
          currentGridState[(x - 1 + this.gridSizeX) % this.gridSizeX][y],
          currentGridState[(x + 1) % this.gridSizeX][y],
          currentGridState[x][(y - 1 + this.gridSizeY) % this.gridSizeY],
          currentGridState[x][(y + 1) % this.gridSizeY],
        ];

        // --- Core U(1) Logic: Vector Averaging ---
        // To correctly average angles (e.g., avg of 350° and 10° is 0°),
        // we convert each angle to a 2D vector, sum the vectors,
        // and find the angle of the resulting vector.
        let avgX = 0,
          avgY = 0;
        neighbors.forEach((angle) => {
          avgX += Math.cos(angle);
          avgY += Math.sin(angle);
        });
        const targetAngle = Math.atan2(avgY, avgX);
        // --- End of Core Logic ---

        // Interpolate smoothly from current angle to target angle
        const currentAngle = currentGridState[x][y];
        const currentVecX = Math.cos(currentAngle),
          currentVecY = Math.sin(currentAngle);
        const targetVecX = Math.cos(targetAngle),
          targetVecY = Math.sin(targetAngle);

        const newVecX =
          currentVecX * (1 - this.physicsInterpolationFactor) +
          targetVecX * this.physicsInterpolationFactor;
        const newVecY =
          currentVecY * (1 - this.physicsInterpolationFactor) +
          targetVecY * this.physicsInterpolationFactor;

        // Add random "temperature" kick
        let newAngle =
          Math.atan2(newVecY, newVecX) +
          (Math.random() - 0.5) * this.temperature * 2 * Math.PI;

        this.grid[x][y] = newAngle;
      }
    }
  }

  /**
   * This is the main drawing function.
   * It runs on every frame (via requestAnimationFrame).
   */
  private draw(): void {
    // Clear the canvas
    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.lineWidth = 1.5;

    // The render interpolation factor controls how "smoothly" the arrows
    // follow the physics grid. Higher temp = faster, jitterier response.
    const renderInterpolationFactor = 0.1 + this.temperature * 0.9;

    for (let x = 0; x < this.gridSizeX; x++) {
      for (let y = 0; y < this.gridSizeY; y++) {
        // 'targetAngle' is the "true" angle from the physics simulation
        const targetAngle = this.grid[x][y];

        // Ensure renderGrid is initialized
        if (!this.renderGrid[x] || this.renderGrid[x][y] === undefined) {
          if (!this.renderGrid[x]) this.renderGrid[x] = [];
          this.renderGrid[x][y] = targetAngle;
        }

        // 'currentAngle' is what's currently on screen
        const currentAngle = this.renderGrid[x][y];

        // Interpolate the render-angle towards the target-angle
        // This creates the smooth, flowing animation.
        const currentVecX = Math.cos(currentAngle),
          currentVecY = Math.sin(currentAngle);
        const targetVecX = Math.cos(targetAngle),
          targetVecY = Math.sin(targetAngle);

        const newVecX =
          currentVecX * (1 - renderInterpolationFactor) +
          targetVecX * renderInterpolationFactor;
        const newVecY =
          currentVecY * (1 - renderInterpolationFactor) +
          targetVecY * renderInterpolationFactor;
        const renderAngle = Math.atan2(newVecY, newVecX);

        // Store the new render-angle for the next frame
        this.renderGrid[x][y] = renderAngle;

        // Calculate pixel-perfect center for the arrow
        const startX = Math.round((x + 0.5) * this.cellWidth);
        const startY = Math.round((y + 0.5) * this.cellHeight);
        this.drawArrow(startX, startY, renderAngle);
      }
    }
  }

  /**
   * Helper function to draw a single arrow on the canvas.
   * @param x Center x-coordinate
   * @param y Center y-coordinate
   * @param angle Angle in radians
   */
  private drawArrow(x: number, y: number, angle: number): void {
    // Map angle to a hue value (0-360) for coloring
    const hue = (angle * 180 / Math.PI + 360) % 360;
    this.ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;

    // Rounding coordinates to integers can improve performance
    // and prevent sub-pixel anti-aliasing issues.
    const endX = Math.round(x + Math.cos(angle) * this.arrowLength);
    const endY = Math.round(y + Math.sin(angle) * this.arrowLength);

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(endX, endY);

    // Draw the arrowhead
    const headLength = this.arrowLength * 0.3;
    const arrowPoint1X = Math.round(
      endX - headLength * Math.cos(angle - Math.PI / 6)
    );
    const arrowPoint1Y = Math.round(
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    const arrowPoint2X = Math.round(
      endX - headLength * Math.cos(angle + Math.PI / 6)
    );
    const arrowPoint2Y = Math.round(
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );

    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(arrowPoint1X, arrowPoint1Y);
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(arrowPoint2X, arrowPoint2Y);
    this.ctx.stroke();
  }

  /**
   * The main animation loop, powered by requestAnimationFrame.
   * This function calls itself to run on every browser frame.
   */
  private animate(currentTime: number = 0): void {
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    if (this.isGlobalRotationActive) {
      // If rotating, only apply rotation and draw.
      // We pass deltaTime for frame-rate-independent rotation speed.
      this.applyGlobalRotation(deltaTime);
      this.draw();
    } else if (!this.isPaused) {
      // If not paused, update physics based on simulationSpeed
      this.frameCount++;
      if (this.frameCount % (11 - this.simulationSpeed) === 0) {
        this.updatePhysics();
      }
      // Draw the result
      this.draw();
    }

    // Request the next frame
    requestAnimationFrame((time) => this.animate(time));
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
    // Reset lastFrameTime to prevent a large deltaTime jump after unpausing
    this.lastFrameTime = performance.now();
  }
}

// Entry point: Once the DOM is loaded, create the simulation instance.
document.addEventListener("DOMContentLoaded", () => {
  new XYModelSimulation("simulation-canvas", "controls");
});