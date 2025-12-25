// Game variables
let scene, camera, renderer, currentPiece, tower = [], score = 0, gameOver = false;
let cameraAngle = 0, cameraHeight = 12, mouseDown = false, isRotating = false;
let keys = {}, lastClick = 0;

// Initialize game
function init() {
    // Basic Three.js setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCamera();
    
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    light.castShadow = true;
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040, 0.4));
    
    // Ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshLambertMaterial({ color: 0x444444 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    setupControls();
    spawnPiece();
    animate();
}

function updateCamera() {
    const x = Math.cos(cameraAngle) * 15;
    const z = Math.sin(cameraAngle) * 15;
    camera.position.set(x, cameraHeight, z);
    camera.lookAt(0, 6, 0);
}

function setupControls() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space') {
            e.preventDefault();
            hardDrop();
        }
        if (e.code === 'KeyR' && gameOver) restart();
    });
    window.addEventListener('keyup', (e) => keys[e.code] = false);
    
    // Mouse camera
    renderer.domElement.addEventListener('mousedown', (e) => {
        mouseDown = true;
        const now = Date.now();
        if (now - lastClick < 300) hardDrop(); // Double click
        lastClick = now;
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!mouseDown) return;
        cameraAngle -= e.movementX * 0.01;
        cameraHeight = Math.max(5, Math.min(20, cameraHeight - e.movementY * 0.05));
        updateCamera();
        isRotating = true;
    });
    
    window.addEventListener('mouseup', () => {
        mouseDown = false;
        setTimeout(() => isRotating = false, 200);
    });
}

function createPiece() {
    const shapes = [
        [[0,0,0], [1,0,0], [2,0,0], [3,0,0]], // I
        [[0,0,0], [1,0,0], [0,0,1], [1,0,1]], // O  
        [[1,0,0], [0,0,0], [2,0,0], [1,0,1]], // T
        [[0,0,0], [1,0,0], [2,0,0], [2,0,1]], // L
    ];
    
    const group = new THREE.Group();
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    shape.forEach(([x, y, z]) => {
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.9, 0.9),
            new THREE.MeshLambertMaterial({ color })
        );
        cube.position.set(x, y, z);
        cube.castShadow = true;
        group.add(cube);
    });
    
    return group;
}

function spawnPiece() {
    if (gameOver) return;
    currentPiece = createPiece();
    currentPiece.position.set(0, 20, 0);
    currentPiece.falling = true;
    scene.add(currentPiece);
}

function hardDrop() {
    if (currentPiece && currentPiece.falling) {
        currentPiece.position.y = getTowerHeight() + 1;
        landPiece();
    }
}

function getTowerHeight() {
    return tower.length > 0 ? Math.max(...tower.map(p => p.position.y)) + 1 : 0;
}

function landPiece() {
    if (!currentPiece) return;
    
    currentPiece.falling = false;
    tower.push(currentPiece);
    
    // Check line clear
    const y = Math.round(currentPiece.position.y);
    const piecesAtLevel = tower.filter(p => Math.abs(p.position.y - y) < 1);
    
    if (piecesAtLevel.length >= 4) { // Line clear
        piecesAtLevel.forEach(p => {
            scene.remove(p);
            tower = tower.filter(t => t !== p);
        });
        // Drop pieces above
        tower.forEach(p => {
            if (p.position.y > y) p.position.y -= 1;
        });
        score += 100;
        document.getElementById('score').textContent = `Score: ${score}`;
    }
    
    // Stability check (Jenga physics)
    if (tower.length > 5 && Math.random() < 0.15) {
        collapse();
        return;
    }
    
    // Game over check
    if (currentPiece.position.y > 18) {
        endGame();
        return;
    }
    
    currentPiece = null;
    setTimeout(spawnPiece, 800);
}

function collapse() {
    // Scatter pieces
    tower.forEach((p, i) => {
        setTimeout(() => {
            p.position.x += (Math.random() - 0.5) * 3;
            p.position.z += (Math.random() - 0.5) * 3;
            p.rotation.x = Math.random();
            p.rotation.z = Math.random();
        }, i * 100);
    });
    setTimeout(endGame, 2000);
}

function endGame() {
    gameOver = true;
    document.getElementById('gameOver').style.display = 'block';
}

function restart() {
    // Clear scene
    tower.forEach(p => scene.remove(p));
    if (currentPiece) scene.remove(currentPiece);
    
    // Reset state
    tower = [];
    currentPiece = null;
    score = 0;
    gameOver = false;
    
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('score').textContent = 'Score: 0';
    spawnPiece();
}

function animate() {
    requestAnimationFrame(animate);
    
    // Handle input
    if (currentPiece && currentPiece.falling && !gameOver) {
        if (keys['KeyA']) currentPiece.position.x -= 0.1;
        if (keys['KeyD']) currentPiece.position.x += 0.1;
        if (keys['KeyW']) currentPiece.position.z -= 0.1;
        if (keys['KeyS']) currentPiece.position.z += 0.1;
        if (keys['KeyQ']) currentPiece.rotation.y += 0.1;
        if (keys['KeyE']) currentPiece.rotation.y -= 0.1;
        
        // Gravity (slow motion during camera rotation)
        const speed = isRotating ? 0.01 : 0.03;
        currentPiece.position.y -= speed;
        
        // Land check
        if (currentPiece.position.y <= getTowerHeight() + 1) {
            landPiece();
        }
    }
    
    renderer.render(scene, camera);
}

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start game
window.addEventListener('load', init);