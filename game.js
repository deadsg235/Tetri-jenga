let scene, camera, renderer, currentPiece, tower = [], score = 0, gameOver = false;
let mouseDown = false, cameraAngle = 0, cameraHeight = 10, isRotating = false;
let lastClick = 0;

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    updateCamera();
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    light.castShadow = true;
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040, 0.3));
    
    // Ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshLambertMaterial({ color: 0x333333 })
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
    camera.lookAt(0, 5, 0);
}

function setupControls() {
    const keys = {};
    
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space') {
            e.preventDefault();
            hardDrop();
        }
        if (e.code === 'KeyR' && gameOver) restart();
    });
    
    window.addEventListener('keyup', (e) => keys[e.code] = false);
    
    // Mouse controls
    renderer.domElement.addEventListener('mousedown', (e) => {
        mouseDown = true;
        const now = Date.now();
        if (now - lastClick < 300) hardDrop();
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
        setTimeout(() => isRotating = false, 100);
    });
    
    // Movement
    setInterval(() => {
        if (!currentPiece || gameOver) return;
        if (keys['KeyA']) currentPiece.position.x -= 0.1;
        if (keys['KeyD']) currentPiece.position.x += 0.1;
        if (keys['KeyW']) currentPiece.position.z -= 0.1;
        if (keys['KeyS']) currentPiece.position.z += 0.1;
        if (keys['KeyQ']) currentPiece.rotation.y += 0.1;
        if (keys['KeyE']) currentPiece.rotation.y -= 0.1;
    }, 16);
}

function createPiece() {
    const shapes = [
        [[0,0,0], [1,0,0], [2,0,0], [3,0,0]], // I
        [[0,0,0], [1,0,0], [0,0,1], [1,0,1]], // O
        [[1,0,0], [0,0,0], [2,0,0], [1,0,1]], // T
    ];
    
    const group = new THREE.Group();
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    const material = new THREE.MeshLambertMaterial({ 
        color: colors[Math.floor(Math.random() * colors.length)] 
    });
    
    shape.forEach(([x, y, z]) => {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), material);
        cube.position.set(x, y, z);
        cube.castShadow = true;
        group.add(cube);
    });
    
    return group;
}

function spawnPiece() {
    if (gameOver) return;
    currentPiece = createPiece();
    currentPiece.position.set(0, 15, 0);
    currentPiece.velocity = isRotating ? -0.01 : -0.03;
    scene.add(currentPiece);
}

function hardDrop() {
    if (currentPiece) currentPiece.velocity = -0.5;
}

function landPiece() {
    tower.push(currentPiece);
    
    // Check line clear
    const y = Math.round(currentPiece.position.y);
    const piecesAtLevel = tower.filter(p => Math.abs(p.position.y - y) < 1);
    
    if (piecesAtLevel.length >= 6) {
        piecesAtLevel.forEach(p => {
            scene.remove(p);
            tower = tower.filter(t => t !== p);
        });
        tower.forEach(p => { if (p.position.y > y) p.position.y -= 1; });
        score += 100;
        document.getElementById('score').textContent = `Score: ${score}`;
    }
    
    // Stability check
    if (Math.random() < 0.1) {
        tower.forEach(p => {
            p.position.x += (Math.random() - 0.5) * 2;
            p.position.z += (Math.random() - 0.5) * 2;
        });
        gameOver = true;
        document.getElementById('gameOver').style.display = 'block';
        return;
    }
    
    if (currentPiece.position.y > 18) {
        gameOver = true;
        document.getElementById('gameOver').style.display = 'block';
        return;
    }
    
    currentPiece = null;
    setTimeout(spawnPiece, 500);
}

function restart() {
    tower.forEach(p => scene.remove(p));
    if (currentPiece) scene.remove(currentPiece);
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
    
    if (currentPiece && !gameOver) {
        currentPiece.position.y += currentPiece.velocity;
        currentPiece.velocity = isRotating ? -0.01 : -0.03;
        
        if (currentPiece.position.y <= 1) {
            landPiece();
        }
    }
    
    renderer.render(scene, camera);
}

// Handle resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start game
window.addEventListener('load', init);