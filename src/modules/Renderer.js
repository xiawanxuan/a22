import * as THREE from 'three';

class Renderer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;
        this.animationId = null;
        this.isAnimating = false;
        this.clock = new THREE.Clock();

        this.onRenderCallbacks = [];
        this.fps = 0;
        this.lastFpsTime = performance.now();
        this.frameCount = 0;
    }

    init(container) {
        if (!container) {
            throw new Error('容器元素不能为空');
        }

        this.container = container;

        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        this.initFog();

        window.addEventListener('resize', this.onResize.bind(this));

        return this;
    }

    initScene() {
        this.scene = new THREE.Scene();

        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#0a0e1a');
        gradient.addColorStop(0.3, '#151a30');
        gradient.addColorStop(0.6, '#1a1f3a');
        gradient.addColorStop(1, '#0f1425');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2, 512);

        const texture = new THREE.CanvasTexture(canvas);
        this.scene.background = texture;
    }

    initCamera() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(
            50,
            width / height,
            0.1,
            5000
        );

        this.camera.position.set(400, 350, 350);
        this.camera.lookAt(250, -150, -200);
    }

    initRenderer() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.renderer.localClippingEnabled = false;

        this.renderer.domElement.style.display = 'block';
        this.renderer.domElement.style.outline = 'none';

        this.container.appendChild(this.renderer.domElement);
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0x404860, 0.6);
        this.scene.add(ambientLight);

        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d26, 0.4);
        this.scene.add(hemisphereLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(300, 400, 200);
        mainLight.castShadow = true;

        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 1500;
        mainLight.shadow.camera.left = -500;
        mainLight.shadow.camera.right = 500;
        mainLight.shadow.camera.top = 500;
        mainLight.shadow.camera.bottom = -500;
        mainLight.shadow.bias = -0.0005;

        this.scene.add(mainLight);
        this.mainLight = mainLight;

        const fillLight = new THREE.DirectionalLight(0x6688cc, 0.3);
        fillLight.position.set(-200, 200, -200);
        this.scene.add(fillLight);

        const pointLight1 = new THREE.PointLight(0x00bcd4, 0.3, 600);
        pointLight1.position.set(0, -100, -200);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xff9800, 0.2, 500);
        pointLight2.position.set(500, -200, 0);
        this.scene.add(pointLight2);
    }

    initFog() {
        this.scene.fog = new THREE.Fog(0x0a0e1a, 800, 2000);
    }

    render() {
        if (!this.renderer || !this.scene || !this.camera) return;

        const delta = this.clock.getDelta();

        this.onRenderCallbacks.forEach(callback => {
            try {
                callback(delta);
            } catch (e) {
                console.error('渲染回调错误:', e);
            }
        });

        this.renderer.render(this.scene, this.camera);

        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsTime = now;
        }
    }

    animate() {
        if (this.isAnimating) return;

        this.isAnimating = true;

        const loop = () => {
            if (!this.isAnimating) return;

            this.animationId = requestAnimationFrame(loop);
            this.render();
        };

        loop();
    }

    stop() {
        this.isAnimating = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    onResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    addOnRenderCallback(callback) {
        if (typeof callback === 'function') {
            this.onRenderCallbacks.push(callback);
        }
    }

    removeOnRenderCallback(callback) {
        const index = this.onRenderCallbacks.indexOf(callback);
        if (index > -1) {
            this.onRenderCallbacks.splice(index, 1);
        }
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getRenderer() {
        return this.renderer;
    }

    getThreeRenderer() {
        return this.renderer;
    }

    setLocalClippingEnabled(enabled) {
        if (this.renderer) {
            this.renderer.localClippingEnabled = enabled;
        }
    }

    getLocalClippingEnabled() {
        return this.renderer?.localClippingEnabled || false;
    }

    getDomElement() {
        return this.renderer?.domElement;
    }

    getFps() {
        return this.fps;
    }

    setCameraPosition(x, y, z) {
        if (this.camera) {
            this.camera.position.set(x, y, z);
        }
    }

    setCameraLookAt(x, y, z) {
        if (this.camera) {
            this.camera.lookAt(x, y, z);
        }
    }

    dispose() {
        this.stop();

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        window.removeEventListener('resize', this.onResize.bind(this));

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;
        this.onRenderCallbacks = [];
    }
}

export default Renderer;
