import './style.css'

class XYModelSimulation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  private gridSize = 30;
  private cellSize = 0;
  private arrowLength = 0;

  // grid = the target physical state
  // renderGrid = the smoothly animated visual state
  private grid: number[][];
  private renderGrid: number[][];

  // FIX: Damping factor for the physics calculation to prevent oscillations
  private physicsInterpolationFactor = 0.2; // How much to move towards the target each physics step
  
  // Controls how fast arrows visually turn to their target angle
  private renderInterpolationFactor = 0.1;

  private frameCount = 0;
  private simulationSpeed = 5;

  private isMouseDownOnCanvas = false;
  private mousePos = { x: 0, y: 0 };

  private controlsPanel: HTMLElement;
  private isDraggingPanel = false;
  private dragOffset = { x: 0, y: 0 };

  constructor(canvasId: string, controlsId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.controlsPanel = document.getElementById(controlsId)!;
    
    this.grid = [];
    this.renderGrid = [];
    
    this.setupCanvas();
    this.initializeGrid();
    this.loadPanelPosition();
    this.setupEventListeners();
    
    this.animate();
  }
  
  private setupCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.cellSize = Math.min(this.canvas.width, this.canvas.height) / this.gridSize;
    this.arrowLength = this.cellSize * 0.45;
  }
  
  public initializeGrid(): void {
    for (let x = 0; x < this.gridSize; x++) {
      this.grid[x] = [];
      this.renderGrid[x] = [];
      for (let y = 0; y < this.gridSize; y++) {
        const randomAngle = Math.random() * 2 * Math.PI;
        this.grid[x][y] = randomAngle;
        this.renderGrid[x][y] = randomAngle;
      }
    }
  }
  
  private loadPanelPosition(): void {
    const savedX = localStorage.getItem('panelX');
    const savedY = localStorage.getItem('panelY');
    if (savedX && savedY) {
      this.controlsPanel.style.left = `${savedX}px`;
      this.controlsPanel.style.top = `${savedY}px`;
    }
  }
  
  private setupEventListeners(): void {
    const resetButton = document.getElementById('reset-button')!;
    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;

    resetButton.addEventListener('mousedown', (e) => e.stopPropagation());
    speedSlider.addEventListener('mousedown', (e) => e.stopPropagation());

    resetButton.addEventListener('click', () => this.initializeGrid());
    speedSlider.addEventListener('input', (e) => {
      this.simulationSpeed = parseInt((e.target as HTMLInputElement).value);
    });

    window.addEventListener('resize', () => this.setupCanvas());
    
    this.canvas.addEventListener('mousedown', (e) => {
      this.isMouseDownOnCanvas = true;
      this.mousePos = { x: e.clientX, y: e.clientY };
    });
    
    this.controlsPanel.addEventListener('mousedown', (e) => {
      this.isDraggingPanel = true;
      this.dragOffset.x = e.clientX - this.controlsPanel.offsetLeft;
      this.dragOffset.y = e.clientY - this.controlsPanel.offsetTop;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDownOnCanvas = false;
      if (this.isDraggingPanel) {
        this.isDraggingPanel = false;
        localStorage.setItem('panelX', this.controlsPanel.style.left.replace('px', ''));
        localStorage.setItem('panelY', this.controlsPanel.style.top.replace('px', ''));
      }
    });
    
    window.addEventListener('mousemove', (e) => {
      if (this.isMouseDownOnCanvas) {
        this.mousePos = { x: e.clientX, y: e.clientY };
      }
      if (this.isDraggingPanel) {
        const newX = e.clientX - this.dragOffset.x;
        const newY = e.clientY - this.dragOffset.y;
        this.controlsPanel.style.left = `${newX}px`;
        this.controlsPanel.style.top = `${newY}px`;
      }
    });
  }

  private updatePhysics(): void {
    // We use a temporary grid for the "before" state
    const currentGridState = this.grid.map(row => [...row]);

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {

        if (this.isMouseDownOnCanvas) {
          const canvasCenterX = (x + 0.5) * this.cellSize;
          const canvasCenterY = (y + 0.5) * this.cellSize;
          const dist = Math.hypot(this.mousePos.x - canvasCenterX, this.mousePos.y - canvasCenterY);
          
          if (dist < this.cellSize * 1.5) {
            this.grid[x][y] = Math.atan2(
              this.mousePos.y - canvasCenterY, 
              this.mousePos.x - canvasCenterX
            );
            continue;
          }
        }
        
        // Read from the temporary "before" state
        const neighbors = [
          currentGridState[(x - 1 + this.gridSize) % this.gridSize][y],
          currentGridState[(x + 1) % this.gridSize][y],
          currentGridState[x][(y - 1 + this.gridSize) % this.gridSize],
          currentGridState[x][(y + 1) % this.gridSize]
        ];
        
        let avgX = 0;
        let avgY = 0;
        for (const angle of neighbors) {
          avgX += Math.cos(angle);
          avgY += Math.sin(angle);
        }
        
        const targetAngle = Math.atan2(avgY, avgX);
        const currentAngle = currentGridState[x][y];

        // FIX: Instead of snapping to the target, smoothly interpolate the physical state
        const currentVecX = Math.cos(currentAngle);
        const currentVecY = Math.sin(currentAngle);
        const targetVecX = Math.cos(targetAngle);
        const targetVecY = Math.sin(targetAngle);

        const newVecX = currentVecX * (1 - this.physicsInterpolationFactor) + targetVecX * this.physicsInterpolationFactor;
        const newVecY = currentVecY * (1 - this.physicsInterpolationFactor) + targetVecY * this.physicsInterpolationFactor;
        
        // Write the new, smoother state directly to the main grid
        this.grid[x][y] = Math.atan2(newVecY, newVecX);
      }
    }
  }
  
  private draw(): void {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 1.5;

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const targetAngle = this.grid[x][y];
        const currentAngle = this.renderGrid[x][y];

        const currentVecX = Math.cos(currentAngle);
        const currentVecY = Math.sin(currentAngle);
        const targetVecX = Math.cos(targetAngle);
        const targetVecY = Math.sin(targetAngle);

        const newVecX = currentVecX * (1 - this.renderInterpolationFactor) + targetVecX * this.renderInterpolationFactor;
        const newVecY = currentVecY * (1 - this.renderInterpolationFactor) + targetVecY * this.renderInterpolationFactor;
        
        const renderAngle = Math.atan2(newVecY, newVecX);
        this.renderGrid[x][y] = renderAngle;
        
        const startX = (x + 0.5) * this.cellSize;
        const startY = (y + 0.5) * this.cellSize;
        this.drawArrow(startX, startY, renderAngle);
      }
    }
  }

  private drawArrow(x: number, y: number, angle: number): void {
    const endX = x + Math.cos(angle) * this.arrowLength;
    const endY = y + Math.sin(angle) * this.arrowLength;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(endX, endY);
    
    const headLength = this.arrowLength * 0.3;
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    
    this.ctx.stroke();
  }

  private animate(): void {
    this.frameCount++;
    
    if (this.frameCount % (11 - this.simulationSpeed) === 0) {
      this.updatePhysics();
    }
    
    this.draw();
    
    requestAnimationFrame(() => this.animate());
  }
}

new XYModelSimulation('simulation-canvas', 'controls');