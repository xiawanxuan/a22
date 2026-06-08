import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

class ARPreviewer {
    constructor(renderer, modeler) {
        this.renderer = renderer;
        this.modeler = modeler;
        this.scene = renderer.getScene();
        this.camera = renderer.getCamera();

        this.arActive = false;
        this.arSupported = false;
        this.arMode = 'xr';
        this.modelScale = 0.001;
        this.modelPosition = new THREE.Vector3(0, -0.5, -1);

        this.arGroup = new THREE.Group();
        this.arGroup.name = 'arGroup';
        this.arGroup.visible = false;
        this.scene.add(this.arGroup);

        this.originalScale = new THREE.Vector3(1, 1, 1);
        this.originalPosition = new THREE.Vector3(0, 0, 0);

        this.deviceOrientation = {
            alpha: 0,
            beta: 0,
            gamma: 0
        };

        this.orientationEnabled = false;

        this.onARStateChangeCallbacks = [];
        this.onTrackingUpdateCallbacks = [];

        this.init();
    }

    init() {
        this.checkARSupport();
        this.setupOrientationListeners();
    }

    checkARSupport() {
        if (navigator.xr) {
            navigator.xr.isSessionSupported('immersive-ar').then(supported => {
                this.arSupported = supported;
                if (supported) {
                    this.arMode = 'xr';
                } else {
                    this.arMode = 'orientation';
                }
            }).catch(() => {
                this.arSupported = false;
                this.arMode = 'orientation';
            });
        } else {
            this.arSupported = false;
            this.arMode = 'orientation';
        }
    }

    isSupported() {
        return true;
    }

    getARMode() {
        return this.arMode;
    }

    isARActive() {
        return this.arActive;
    }

    async startAR(mode) {
        if (this.arActive) return;

        if (mode === 'xr' && this.arSupported) {
            await this.startXR();
        } else {
            this.startOrientationMode();
        }
    }

    async startXR() {
        try {
            const threeRenderer = this.renderer.getThreeRenderer();

            this.originalBackground = this.scene.background;
            this.scene.background = null;

            const arButton = ARButton.createButton(threeRenderer, {
                requiredFeatures: ['hit-test'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: { root: document.body }
            });
            document.body.appendChild(arButton);

            threeRenderer.xr.enabled = true;
            threeRenderer.xr.setReferenceSpaceType('local');

            const strataGroup = this.modeler.getStrataGroup();
            const faultsGroup = this.modeler.getFaultsGroup();
            const foldsGroup = this.modeler.getFoldsGroup();
            const drillingsGroup = this.modeler.getDrillingsGroup();

            this.arGroup.add(strataGroup.clone());
            this.arGroup.add(faultsGroup.clone());
            this.arGroup.add(foldsGroup.clone());
            this.arGroup.add(drillingsGroup.clone());

            this.arGroup.scale.set(this.modelScale, this.modelScale, this.modelScale);
            this.arGroup.position.copy(this.modelPosition);
            this.arGroup.visible = true;

            strataGroup.visible = false;
            faultsGroup.visible = false;
            foldsGroup.visible = false;
            drillingsGroup.visible = false;

            const helpersGroup = this.modeler.getHelpersGroup();
            helpersGroup.visible = false;

            this.arActive = true;
            this.notifyARStateChange(true);

        } catch (error) {
            console.warn('WebXR启动失败，切换到方向感应模式:', error);
            this.startOrientationMode();
        }
    }

    startOrientationMode() {
        const threeRenderer = this.renderer.getThreeRenderer();

        this.originalBackground = this.scene.background;
        this.scene.background = null;

        const area = this.modeler.data?.metadata?.area || { width: 500, depth: 400, height: 300 };
        const maxDim = Math.max(area.width, area.depth, area.height);
        this.modelScale = 0.5 / maxDim;

        const strataGroup = this.modeler.getStrataGroup();
        const faultsGroup = this.modeler.getFaultsGroup();
        const foldsGroup = this.modeler.getFoldsGroup();
        const drillingsGroup = this.modeler.getDrillingsGroup();

        this.originalGroups = {
            strata: strataGroup,
            faults: faultsGroup,
            folds: foldsGroup,
            drillings: drillingsGroup,
            helpers: this.modeler.getHelpersGroup()
        };

        this.cloneGroupsToAR(strataGroup);
        this.cloneGroupsToAR(faultsGroup);
        this.cloneGroupsToAR(foldsGroup);
        this.cloneGroupsToAR(drillingsGroup);

        this.arGroup.scale.set(this.modelScale, this.modelScale, this.modelScale);
        this.arGroup.position.set(0, -0.3, -1);
        this.arGroup.rotation.x = -0.3;
        this.arGroup.visible = true;

        strataGroup.visible = false;
        faultsGroup.visible = false;
        foldsGroup.visible = false;
        drillingsGroup.visible = false;

        const helpersGroup = this.modeler.getHelpersGroup();
        helpersGroup.visible = false;

        this.requestOrientationPermission();

        this.arActive = true;
        this.arMode = 'orientation';
        this.notifyARStateChange(true);

        this.orientationAnimationId = requestAnimationFrame(this.updateOrientationView.bind(this));
    }

    cloneGroupsToAR(sourceGroup) {
        sourceGroup.children.forEach(child => {
            const clone = child.clone(true);
            clone.traverse(obj => {
                if (obj.isMesh) {
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material = obj.material.map(m => m.clone());
                        } else {
                            obj.material = obj.material.clone();
                        }
                    }
                }
            });
            this.arGroup.add(clone);
        });
    }

    async requestOrientationPermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    this.enableOrientation();
                }
            } catch (e) {
                console.log('方向感应权限请求失败:', e);
            }
        } else {
            this.enableOrientation();
        }
    }

    enableOrientation() {
        window.addEventListener('deviceorientation', this.onDeviceOrientation.bind(this));
        this.orientationEnabled = true;
    }

    setupOrientationListeners() {
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', (event) => {
                if (!this.orientationEnabled) return;
                this.deviceOrientation.alpha = event.alpha || 0;
                this.deviceOrientation.beta = event.beta || 0;
                this.deviceOrientation.gamma = event.gamma || 0;
            });
        }
    }

    onDeviceOrientation(event) {
        this.deviceOrientation.alpha = event.alpha || 0;
        this.deviceOrientation.beta = event.beta || 0;
        this.deviceOrientation.gamma = event.gamma || 0;
    }

    updateOrientationView() {
        if (!this.arActive || this.arMode !== 'orientation') return;

        const { alpha, beta, gamma } = this.deviceOrientation;

        const alphaRad = (alpha - 180) * Math.PI / 180;
        const betaRad = (beta - 45) * Math.PI / 180;
        const gammaRad = gamma * Math.PI / 180;

        this.arGroup.rotation.set(
            -betaRad * 0.5,
            alphaRad * 0.5,
            -gammaRad * 0.3
        );

        this.notifyTrackingUpdate({
            position: this.arGroup.position.clone(),
            rotation: this.arGroup.rotation.clone(),
            mode: 'orientation'
        });

        this.orientationAnimationId = requestAnimationFrame(this.updateOrientationView.bind(this));
    }

    stopAR() {
        if (!this.arActive) return;

        if (this.arMode === 'xr') {
            this.stopXR();
        } else {
            this.stopOrientationMode();
        }

        this.arActive = false;
        this.notifyARStateChange(false);
    }

    stopXR() {
        const threeRenderer = this.renderer.getThreeRenderer();
        threeRenderer.xr.enabled = false;

        if (this.scene.background === null) {
            this.scene.background = this.originalBackground;
        }

        const arButton = document.querySelector('.ar-button');
        if (arButton) arButton.remove();

        this.cleanupAR();
    }

    stopOrientationMode() {
        if (this.orientationAnimationId) {
            cancelAnimationFrame(this.orientationAnimationId);
        }

        window.removeEventListener('deviceorientation', this.onDeviceOrientation.bind(this));
        this.orientationEnabled = false;

        if (this.scene.background === null) {
            this.scene.background = this.originalBackground;
        }

        this.cleanupAR();
    }

    cleanupAR() {
        while (this.arGroup.children.length > 0) {
            const child = this.arGroup.children[0];
            this.arGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }

        this.arGroup.visible = false;

        if (this.originalGroups) {
            this.originalGroups.strata.visible = true;
            this.originalGroups.faults.visible = true;
            this.originalGroups.folds.visible = true;
            this.originalGroups.drillings.visible = true;
            this.originalGroups.helpers.visible = true;
        }
    }

    setARScale(scale) {
        this.modelScale = scale;
        if (this.arActive) {
            this.arGroup.scale.set(scale, scale, scale);
        }
    }

    setARPosition(x, y, z) {
        this.modelPosition.set(x, y, z);
        if (this.arActive) {
            this.arGroup.position.set(x, y, z);
        }
    }

    rotateARModel(axis, angle) {
        if (!this.arActive) return;
        this.arGroup.rotation[axis] = angle;
    }

    resetARView() {
        if (!this.arActive) return;

        this.arGroup.position.copy(this.modelPosition);
        this.arGroup.rotation.set(0, 0, 0);
        this.arGroup.scale.set(this.modelScale, this.modelScale, this.modelScale);
    }

    addOnARStateChangeCallback(callback) {
        this.onARStateChangeCallbacks.push(callback);
    }

    notifyARStateChange(active) {
        this.onARStateChangeCallbacks.forEach(cb => cb(active, this.arMode));
    }

    addOnTrackingUpdateCallback(callback) {
        this.onTrackingUpdateCallbacks.push(callback);
    }

    notifyTrackingUpdate(data) {
        this.onTrackingUpdateCallbacks.forEach(cb => cb(data));
    }

    dispose() {
        this.stopAR();
        if (this.arGroup && this.scene) {
            this.scene.remove(this.arGroup);
        }
        window.removeEventListener('deviceorientation', this.onDeviceOrientation.bind(this));
    }
}

export default ARPreviewer;
