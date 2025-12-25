class TetriJenga {
    constructor() {
        console.log('Initializing Tetri-Jenga...');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x87CEEB);
        document.body.appendChild(this.renderer.domElement);

        this.tower = [];
        this.currentPiece = null;
        this.score = 0;
        this.gameOver = false;
        this.dropSpeed = 0.02;
        this.gridSize = 1;
        this.towerHeight = 0;
        this.isRotatingCamera = false;
        this.mouseDown = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.cameraRadius = 15;
        this.cameraAngle = 0;
        this.cameraHeight = 12;
        this.lastClickTime = 0;

        this.setupScene();
        this.setupControls();
        this.spawnPiece();
        this.animate();
        console.log('Game initialized successfully');
    }

    setupScene() {
        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Ground
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Camera position
        this.updateCameraPosition();
    }

    setupControls() {
        this.keys = {};
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                this.hardDrop();
            }
            if (e.code === 'KeyR' && this.gameOver) {
                this.restart();
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse controls
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            
            // Double click detection
            const currentTime = Date.now();
            if (currentTime - this.lastClickTime < 300) {
                this.hardDrop();
            }
            this.lastClickTime = currentTime;
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!this.mouseDown) return;
            
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            this.cameraAngle -= deltaX * 0.01;
            this.cameraHeight = Math.max(5, Math.min(20, this.cameraHeight + deltaY * 0.05));
            
            this.updateCameraPosition();
            this.isRotatingCamera = Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2;
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });
        
        window.addEventListener('mouseup', () => {
            this.mouseDown = false;
            setTimeout(() => { this.isRotatingCamera = false; }, 100);
        });
    }

    createPieceGeometry(type) {
        const shapes = {
            I: [[0,0,0], [1,0,0], [2,0,0], [3,0,0]],
            O: [[0,0,0], [1,0,0], [0,0,1], [1,0,1]],
            T: [[1,0,0], [0,0,0], [2,0,0], [1,0,1]],
            L: [[0,0,0], [1,0,0], [2,0,0], [2,0,1]],
            J: [[0,0,0], [1,0,0], [2,0,0], [0,0,1]],
            S: [[1,0,0], [2,0,0], [0,0,1], [1,0,1]],
            Z: [[0,0,0], [1,0,0], [1,0,1], [2,0,1]]
        };
        
        const group = new THREE.Group();
        const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500];
        const material = new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
        
        shapes[type].forEach(([x, y, z]) => {
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(x, y, z);
            cube.castShadow = true;
            cube.receiveShadow = true;
            group.add(cube);
        });
        
        return group;
    }

    spawnPiece() {
        if (this.gameOver) return;
        
        const types = ['I', 'O', 'T', 'L', 'J', 'S', 'Z'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.currentPiece = {
            mesh: this.createPieceGeometry(type),
            position: { x: 0, y: this.towerHeight + 15, z: 0 },
            velocity: { x: 0, y: -this.dropSpeed, z: 0 },
            landed: false
        };
        
        this.currentPiece.mesh.position.set(
            this.currentPiece.position.x,
            this.currentPiece.position.y,
            this.currentPiece.position.z
        );
        
        this.scene.add(this.currentPiece.mesh);
    }

    updateCurrentPiece() {
        if (!this.currentPiece || this.currentPiece.landed) return;

        // Handle input
        if (this.keys['KeyA']) this.currentPiece.position.x -= 0.1;
        if (this.keys['KeyD']) this.currentPiece.position.x += 0.1;
        if (this.keys['KeyW']) this.currentPiece.position.z -= 0.1;
        if (this.keys['KeyS']) this.currentPiece.position.z += 0.1;
        if (this.keys['KeyQ']) this.currentPiece.mesh.rotation.y += 0.05;
        if (this.keys['KeyE']) this.currentPiece.mesh.rotation.y -= 0.05;

        // Apply gravity (slow motion during camera rotation)
        const speed = this.isRotatingCamera ? this.currentPiece.velocity.y * 0.3 : this.currentPiece.velocity.y;
        this.currentPiece.position.y += speed;

        // Check collision with ground or tower
        if (this.currentPiece.position.y <= this.towerHeight + 1 || this.checkCollision()) {
            this.landPiece();
        }

        // Update mesh position
        this.currentPiece.mesh.position.set(
            this.currentPiece.position.x,
            this.currentPiece.position.y,
            this.currentPiece.position.z
        );
    }

    checkCollision() {
        // Simplified collision detection
        return this.currentPiece.position.y <= this.towerHeight + 1;
    }

    landPiece() {
        if (!this.currentPiece) return;
        
        this.currentPiece.landed = true;
        this.tower.push(this.currentPiece.mesh);
        this.towerHeight = Math.max(this.towerHeight, this.currentPiece.position.y + 1);
        
        // Check for complete layers
        this.checkLineClear();
        
        // Check stability
        if (!this.checkStability()) {
            this.triggerCollapse();
            return;
        }
        
        // Check game over
        if (this.towerHeight > 20) {
            this.endGame();
            return;
        }
        
        this.currentPiece = null;
        setTimeout(() => this.spawnPiece(), 500);
    }

    checkLineClear() {
        const layerY = Math.floor(this.currentPiece.position.y);
        const piecesAtLayer = this.tower.filter(piece => 
            Math.abs(piece.position.y - layerY) < 0.5
        );
        
        // If layer is densely packed, clear it
        if (piecesAtLayer.length >= 8) {
            piecesAtLayer.forEach(piece => {
                this.scene.remove(piece);
                this.tower = this.tower.filter(p => p !== piece);
            });
            
            // Move pieces above down
            this.tower.forEach(piece => {
                if (piece.position.y > layerY) {
                    piece.position.y -= 1;
                }
            });
            
            this.towerHeight -= 1;
            this.score += 100;
            this.updateScore();
        }
    }

    checkStability() {
        // Simplified stability check - random chance based on tower height
        const instabilityChance = Math.min(this.towerHeight * 0.02, 0.3);
        return Math.random() > instabilityChance;
    }

    triggerCollapse() {
        // Simple collapse animation
        this.tower.forEach((piece, index) => {
            setTimeout(() => {
                piece.position.x += (Math.random() - 0.5) * 2;
                piece.position.z += (Math.random() - 0.5) * 2;
                piece.rotation.x += Math.random() * 0.5;
                piece.rotation.z += Math.random() * 0.5;
            }, index * 50);
        });
        
        setTimeout(() => this.endGame(), 2000);
    }

    hardDrop() {
        if (this.currentPiece && !this.currentPiece.landed) {
            this.currentPiece.velocity.y = -0.5;
        }
    }
    
    updateCameraPosition() {
        const x = Math.cos(this.cameraAngle) * this.cameraRadius;
        const z = Math.sin(this.cameraAngle) * this.cameraRadius;
        this.camera.position.set(x, this.cameraHeight, z);
        this.camera.lookAt(0, Math.max(this.towerHeight / 2, 2), 0);
    }

    updateScore() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
    }

    endGame() {
        this.gameOver = true;
        document.getElementById('gameOver').style.display = 'block';
    }

    restart() {
        // Clear scene
        this.tower.forEach(piece => this.scene.remove(piece));
        if (this.currentPiece) this.scene.remove(this.currentPiece.mesh);
        
        // Reset game state
        this.tower = [];
        this.currentPiece = null;
        this.score = 0;
        this.gameOver = false;
        this.towerHeight = 0;
        
        document.getElementById('gameOver').style.display = 'none';
        this.updateScore();
        this.spawnPiece();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.gameOver) {
            this.updateCurrentPiece();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
window.addEventListener('load', () => {
    window.game = new TetriJenga();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.game) {
        window.game.camera.aspect = window.innerWidth / window.innerHeight;
        window.game.camera.updateProjectionMatrix();
        window.game.renderer.setSize(window.innerWidth, window.innerHeight);
    }
});