// Game variables
let scene, camera, renderer, currentPiece, tower = [], score = 0, gameOver = false;
let cameraAngle = 0, cameraHeight = 12, mouseDown = false, isRotating = false;
let keys = {}, lastClick = 0;

// Initialize game
function init() {
    // Basic Three.js setup
    scene = new THREE.Scene();
    
    // Dynamic space background
    const spaceGeometry = new THREE.SphereGeometry(500, 32, 32);
    const spaceMaterial = new THREE.MeshBasicMaterial({
        color: 0x000033,
        transparent: true,
        opacity: 0.8
    });
    const spaceSphere = new THREE.Mesh(spaceGeometry, spaceMaterial);
    spaceSphere.material.side = THREE.BackSide;
    scene.add(spaceSphere);
    
    // Add stars
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 1000;
        const y = (Math.random() - 0.5) * 1000;
        const z = (Math.random() - 0.5) * 1000;
        starsVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCamera();
    
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Lighting with space ambiance
    const light = new THREE.DirectionalLight(0x9999ff, 0.8);
    light.position.set(10, 10, 10);
    light.castShadow = true;
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x330066, 0.4));
    
    // Holographic guide
    const guideGeometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const guideMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3,
        wireframe: true
    });
    window.holoGuide = new THREE.Mesh(guideGeometry, guideMaterial);
    window.holoGuide.visible = false;
    scene.add(window.holoGuide);
    
    // Ground with holographic effect
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshLambertMaterial({ 
            color: 0x001133,
            transparent: true,
            opacity: 0.7
        })
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
        while (!checkCollision() && currentPiece.position.y > 0) {
            currentPiece.position.y -= 0.1;
        }
        currentPiece.position.y += 0.1; // Back up slightly
        landPiece();
    }
}

function checkCollision() {
    if (!currentPiece) return false;
    
    // Check ground collision
    let minY = Infinity;
    currentPiece.children.forEach(cube => {
        const worldPos = new THREE.Vector3();
        cube.getWorldPosition(worldPos);
        minY = Math.min(minY, worldPos.y);
    });
    
    if (minY <= 0.5) return true;
    
    // Check collision with tower pieces
    for (let piece of tower) {
        for (let cube of piece.children) {
            const cubeWorldPos = new THREE.Vector3();
            cube.getWorldPosition(cubeWorldPos);
            
            for (let currentCube of currentPiece.children) {
                const currentWorldPos = new THREE.Vector3();
                currentCube.getWorldPosition(currentWorldPos);
                
                // Tight collision: within 0.95 units (cube size is 0.9)
                const dx = Math.abs(cubeWorldPos.x - currentWorldPos.x);
                const dy = Math.abs(cubeWorldPos.y - currentWorldPos.y);
                const dz = Math.abs(cubeWorldPos.z - currentWorldPos.z);
                
                if (dx < 0.95 && dy < 0.95 && dz < 0.95) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

function getTowerHeight() {
    if (tower.length === 0) return 0;
    
    // Get precise collision height for current piece position
    const pieceX = Math.round(currentPiece.position.x);
    const pieceZ = Math.round(currentPiece.position.z);
    
    let maxHeight = 0;
    tower.forEach(piece => {
        piece.children.forEach(cube => {
            const worldPos = new THREE.Vector3();
            cube.getWorldPosition(worldPos);
            const cubeX = Math.round(worldPos.x);
            const cubeZ = Math.round(worldPos.z);
            
            // Check if any cube of current piece would collide
            currentPiece.children.forEach(currentCube => {
                const currentWorldPos = new THREE.Vector3();
                currentCube.getWorldPosition(currentWorldPos);
                const currentX = Math.round(currentWorldPos.x);
                const currentZ = Math.round(currentWorldPos.z);
                
                if (Math.abs(cubeX - currentX) < 0.5 && Math.abs(cubeZ - currentZ) < 0.5) {
                    maxHeight = Math.max(maxHeight, worldPos.y + 1);
                }
            });
        });
    });
    
    return maxHeight;
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
        
        // Update holographic guide
        updateHoloGuide();
        
        // Land check - precise collision
        if (checkCollision()) {
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

function updateHoloGuide() {
    if (!currentPiece || !window.holoGuide) return;
    
    // Find landing position
    let testY = currentPiece.position.y;
    const originalY = currentPiece.position.y;
    
    // Simulate drop to find landing spot
    while (testY > 0) {
        currentPiece.position.y = testY;
        if (checkCollision()) {
            testY += 0.1;
            break;
        }
        testY -= 0.1;
    }
    
    // Position holographic guide
    window.holoGuide.position.copy(currentPiece.position);
    window.holoGuide.rotation.copy(currentPiece.rotation);
    window.holoGuide.visible = true;
    
    // Restore original position
    currentPiece.position.y = originalY;
}