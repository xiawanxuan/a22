import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

class InteractionController {
    constructor() {
        this.renderer = null;
        this.camera = null;
        this.scene = null;
        this.modeler = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.pickCallbacks = [];
        this.hoverCallbacks = [];
        this.coordCallbacks = [];

        this.hoveredObject = null;
        this.selectedObject = null;
        this.enabled = true;

        this.targetPosition = new THREE.Vector3();
        this.targetLookAt = new THREE.Vector3();
        this.isAnimatingView = false;
        this.animationProgress = 0;
        this.animationDuration = 800;
        this.startPosition = new THREE.Vector3();
        this.startLookAt = new THREE.Vector3();

        this.isDragging = false;
        this.mouseDownTime = 0;
        this.mouseDownPosition = new THREE.Vector2();
        this.clickThreshold = 5;
    }

    init(renderer, modeler) {
        if (!renderer) {
            throw new Error('渲染器实例不能为空');
        }

        this.renderer = renderer;
        this.camera = renderer.getCamera();
        this.scene = renderer.getScene();
        this.modeler = modeler;

        this.initOrbitControls();
        this.initEventListeners();

        return this;
    }

    initOrbitControls() {
        const domElement = this.renderer.getDomElement();

        this.controls = new OrbitControls(this.camera, domElement);

        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;

        this.controls.minDistance = 20;
        this.controls.maxDistance = 1500;

        this.controls.maxPolarAngle = Math.PI * 0.9;
        this.controls.minPolarAngle = 0.1;

        this.controls.screenSpacePanning = true;

        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
        };

        this.controls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
        };

        this.controls.zoomSpeed = 1.0;
        this.controls.rotateSpeed = 0.8;
        this.controls.panSpeed = 1.0;

        this.controls.target.set(250, -150, -200);
    }

    initEventListeners() {
        const domElement = this.renderer.getDomElement();

        domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
        domElement.addEventListener('mouseleave', this.onMouseLeave.bind(this));
        domElement.addEventListener('click', this.onClick.bind(this), false);

        domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        domElement.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

        domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

        domElement.addEventListener('contextmenu', e => e.preventDefault());
    }

    onMouseDown(event) {
        if (!this.enabled) return;

        this.isDragging = true;
        this.mouseDownTime = performance.now();
        this.mouseDownPosition.set(event.clientX, event.clientY);
    }

    onMouseMove(event) {
        if (!this.enabled) return;

        const rect = this.renderer.getDomElement().getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.updateCoordDisplay();
        this.updateHover();
    }

    onMouseUp(event) {
        this.isDragging = false;
    }

    onMouseLeave(event) {
        this.isDragging = false;

        if (this.hoveredObject) {
            this.clearHover();
        }
    }

    onClick(event) {
        if (!this.enabled) return;

        const currentTime = performance.now();
        const timeDiff = currentTime - this.mouseDownTime;
        const posDiff = Math.hypot(
            event.clientX - this.mouseDownPosition.x,
            event.clientY - this.mouseDownPosition.y
        );

        if (timeDiff < 300 && posDiff < this.clickThreshold) {
            this.handlePick();
        }
    }

    onTouchStart(event) {
        if (!this.enabled) return;
        if (event.touches.length === 1) {
            this.mouseDownTime = performance.now();
            const touch = event.touches[0];
            this.mouseDownPosition.set(touch.clientX, touch.clientY);
        }
    }

    onTouchMove(event) {
        if (!this.enabled) return;

        if (event.touches.length === 1) {
            const rect = this.renderer.getDomElement().getBoundingClientRect();
            const touch = event.touches[0];
            this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
            this.updateCoordDisplay();
        }
    }

    onTouchEnd(event) {
        if (!this.enabled) return;

        if (event.changedTouches.length === 1) {
            const currentTime = performance.now();
            const touch = event.changedTouches[0];
            const timeDiff = currentTime - this.mouseDownTime;
            const posDiff = Math.hypot(
                touch.clientX - this.mouseDownPosition.x,
                touch.clientY - this.mouseDownPosition.y
            );

            if (timeDiff < 300 && posDiff < this.clickThreshold * 2) {
                const rect = this.renderer.getDomElement().getBoundingClientRect();
                this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
                this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
                this.handlePick();
            }
        }
    }

    onWheel(event) {
        if (!this.enabled) return;
    }

    updateCoordDisplay() {
        if (!this.coordCallbacks.length) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(groundPlane, intersectPoint);

        if (intersectPoint) {
            this.coordCallbacks.forEach(callback => {
                try {
                    callback(intersectPoint);
                } catch (e) {
                    console.error('坐标回调错误:', e);
                }
            });
        }
    }

    updateHover() {
        if (this.isDragging || !this.modeler) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const pickableObjects = [];
        this.modeler.getAllObjects().forEach(obj => {
            if (obj.visible) {
                obj.traverse(child => {
                    if (child.isMesh && child.userData?.selectable) {
                        pickableObjects.push(child);
                    }
                });
            }
        });

        const intersects = this.raycaster.intersectObjects(pickableObjects, false);

        if (intersects.length > 0) {
            const hitObject = this.findParentGroup(intersects[0].object);
            if (hitObject && hitObject !== this.hoveredObject) {
                this.clearHover();
                this.hoveredObject = hitObject;

                if (this.modeler && hitObject.userData?.id) {
                    this.modeler.highlightObject(hitObject.userData.id);
                }

                this.hoverCallbacks.forEach(callback => {
                    try {
                        callback(hitObject.userData, intersects[0].point);
                    } catch (e) {
                        console.error('悬停回调错误:', e);
                    }
                });

                this.renderer.getDomElement().style.cursor = 'pointer';
            }
        } else {
            this.clearHover();
        }
    }

    clearHover() {
        if (this.hoveredObject && this.hoveredObject !== this.selectedObject) {
            if (this.modeler) {
                this.modeler.clearAllHighlights();

                if (this.selectedObject?.userData?.id) {
                    this.modeler.highlightObject(this.selectedObject.userData.id);
                }
            }
        }

        this.hoveredObject = null;
        this.renderer.getDomElement().style.cursor = 'grab';
    }

    handlePick() {
        if (!this.modeler) return;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const pickableObjects = [];
        this.modeler.getAllObjects().forEach(obj => {
            if (obj.visible) {
                obj.traverse(child => {
                    if (child.isMesh && child.userData?.selectable) {
                        pickableObjects.push(child);
                    }
                });
            }
        });

        const intersects = this.raycaster.intersectObjects(pickableObjects, false);

        if (intersects.length > 0) {
            const hitObject = this.findParentGroup(intersects[0].object);

            if (hitObject && hitObject.userData) {
                this.selectedObject = hitObject;

                if (this.modeler && hitObject.userData.id) {
                    this.modeler.clearAllHighlights();
                    this.modeler.highlightObject(hitObject.userData.id);
                }

                this.pickCallbacks.forEach(callback => {
                    try {
                        callback(hitObject.userData, intersects[0].point);
                    } catch (e) {
                        console.error('拾取回调错误:', e);
                    }
                });
            }
        } else {
            this.selectedObject = null;

            if (this.modeler) {
                this.modeler.clearAllHighlights();
            }

            this.pickCallbacks.forEach(callback => {
                try {
                    callback(null, null);
                } catch (e) {
                    console.error('拾取回调错误:', e);
                }
            });
        }
    }

    findParentGroup(object) {
        let current = object;
        while (current) {
            if (current.userData && current.userData.selectable && current.userData.id) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    setViewPreset(preset) {
        const center = new THREE.Vector3(250, -150, -200);
        let targetPos = new THREE.Vector3();

        switch (preset) {
            case 'top':
                targetPos.set(center.x, 600, center.z);
                break;
            case 'front':
                targetPos.set(center.x, center.y, 400);
                break;
            case 'side':
                targetPos.set(600, center.y, center.z);
                break;
            case 'iso':
                targetPos.set(center.x + 350, center.y + 400, center.z + 350);
                break;
            case 'reset':
                targetPos.set(400, 350, 350);
                break;
            default:
                return;
        }

        this.animateTo(targetPos, center.clone());
    }

    animateTo(targetPos, targetLookAt) {
        if (!this.controls || !this.camera) return;

        this.startPosition.copy(this.camera.position);
        this.startLookAt.copy(this.controls.target);
        this.targetPosition.copy(targetPos);
        this.targetLookAt.copy(targetLookAt);
        this.isAnimatingView = true;
        this.animationProgress = 0;
        this.animationStartTime = performance.now();

        if (this.controls) {
            this.controls.enabled = false;
        }
    }

    resetView() {
        this.setViewPreset('reset');
    }

    update(delta) {
        if (this.controls && this.enabled) {
            this.controls.update();
        }

        if (this.isAnimatingView) {
            const elapsed = performance.now() - this.animationStartTime;
            this.animationProgress = Math.min(elapsed / this.animationDuration, 1);

            const t = this.easeInOutCubic(this.animationProgress);

            this.camera.position.lerpVectors(
                this.startPosition,
                this.targetPosition,
                t
            );

            if (this.controls) {
                this.controls.target.lerpVectors(
                    this.startLookAt,
                    this.targetLookAt,
                    t
                );
            }

            if (this.animationProgress >= 1) {
                this.isAnimatingView = false;
                if (this.controls) {
                    this.controls.enabled = true;
                }
            }
        }
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    enable() {
        this.enabled = true;
        if (this.controls) {
            this.controls.enabled = true;
        }
    }

    disable() {
        this.enabled = false;
        if (this.controls) {
            this.controls.enabled = false;
        }
    }

    onPick(callback) {
        if (typeof callback === 'function') {
            this.pickCallbacks.push(callback);
        }
    }

    onHover(callback) {
        if (typeof callback === 'function') {
            this.hoverCallbacks.push(callback);
        }
    }

    onCoordUpdate(callback) {
        if (typeof callback === 'function') {
            this.coordCallbacks.push(callback);
        }
    }

    exportModel(format = 'glb') {
        if (!this.scene || !this.modeler) {
            return Promise.reject(new Error('场景或模型未初始化'));
        }

        return new Promise((resolve, reject) => {
            const exporter = new GLTFExporter();

            const exportGroup = new THREE.Group();

            const strataClone = this.modeler.getStrataGroup().clone();
            const faultsClone = this.modeler.getFaultsGroup().clone();
            const foldsClone = this.modeler.getFoldsGroup().clone();
            const drillingsClone = this.modeler.getDrillingsGroup().clone();

            exportGroup.add(strataClone);
            exportGroup.add(faultsClone);
            exportGroup.add(foldsClone);
            exportGroup.add(drillingsClone);

            const options = {
                binary: format === 'glb',
                trs: false,
                onlyVisible: true,
                truncateDrawRange: true,
                maxTextureSize: 4096
            };

            exporter.parse(
                exportGroup,
                result => {
                    if (result instanceof ArrayBuffer) {
                        resolve({
                            data: result,
                            format: 'glb',
                            filename: 'geological-model.glb'
                        });
                    } else {
                        resolve({
                            data: JSON.stringify(result, null, 2),
                            format: 'gltf',
                            filename: 'geological-model.gltf'
                        });
                    }
                },
                error => {
                    reject(error);
                },
                options
            );
        });
    }

    downloadModel(format = 'glb') {
        return this.exportModel(format).then(result => {
            const blob = new Blob([result.data], {
                type: format === 'glb' ? 'model/gltf-binary' : 'model/gltf+json'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return result;
        });
    }

    getControls() {
        return this.controls;
    }

    getSelectedObject() {
        return this.selectedObject;
    }

    getHoveredObject() {
        return this.hoveredObject;
    }

    dispose() {
        this.disable();

        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }

        const domElement = this.renderer?.getDomElement();
        if (domElement) {
            domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
            domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
            domElement.removeEventListener('mouseup', this.onMouseUp.bind(this));
            domElement.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
            domElement.removeEventListener('click', this.onClick.bind(this));
            domElement.removeEventListener('touchstart', this.onTouchStart.bind(this));
            domElement.removeEventListener('touchmove', this.onTouchMove.bind(this));
            domElement.removeEventListener('touchend', this.onTouchEnd.bind(this));
            domElement.removeEventListener('wheel', this.onWheel.bind(this));
            domElement.removeEventListener('contextmenu', e => e.preventDefault());
        }

        this.pickCallbacks = [];
        this.hoverCallbacks = [];
        this.coordCallbacks = [];

        this.renderer = null;
        this.camera = null;
        this.scene = null;
        this.modeler = null;
    }
}

export default InteractionController;
