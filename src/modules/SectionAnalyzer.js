import * as THREE from 'three';

class SectionAnalyzer {
    constructor(modeler, renderer) {
        this.modeler = modeler;
        this.renderer = renderer;
        this.scene = renderer.getScene();

        this.sectionGroup = new THREE.Group();
        this.sectionGroup.name = 'sectionGroup';
        this.scene.add(this.sectionGroup);

        this.clipPlanes = [];
        this.enabled = false;
        this.sectionPlanes = [];

        this.sectionMeshes = [];
        this.sectionLines = [];
        this.controlHandles = [];

        this.currentSection = {
            type: 'vertical',
            position: new THREE.Vector3(250, 0, -200),
            rotation: new THREE.Euler(0, 0, 0),
            width: 500,
            height: 350,
            depth: 400
        };

        this.onSectionChangeCallbacks = [];
    }

    enable() {
        if (this.enabled) return;
        this.enabled = true;
        this.sectionGroup.visible = true;
        this.createSectionPlanes();
        this.updateClipping();
    }

    disable() {
        if (!this.enabled) return;
        this.enabled = false;
        this.sectionGroup.visible = false;
        this.clearSectionPlanes();
        this.renderer.setLocalClippingEnabled(false);
    }

    setSectionType(type) {
        this.currentSection.type = type;
        this.updateSection();
    }

    setSectionPosition(x, y, z) {
        this.currentSection.position.set(x, y, z);
        this.updateSection();
    }

    setSectionRotation(angle) {
        this.currentSection.rotation.y = angle;
        this.updateSection();
    }

    updateSection() {
        if (!this.enabled) return;

        this.clearSectionPlanes();
        this.createSectionPlanes();
        this.updateClipping();
        this.createSectionFill();
        this.createSectionGrid();
        this.notifySectionChange();
    }

    createSectionPlanes() {
        const { type, position, rotation, width, height, depth } = this.currentSection;

        if (type === 'vertical') {
            const plane1 = new THREE.Plane();
            const plane2 = new THREE.Plane();

            const normal = new THREE.Vector3(1, 0, 0);
            normal.applyEuler(rotation);

            plane1.setFromNormalAndCoplanarPoint(normal, position);
            plane2.setFromNormalAndCoplanarPoint(normal.clone().negate(), position);

            this.clipPlanes = [plane1];
        } else if (type === 'horizontal') {
            const plane = new THREE.Plane();
            plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), position);
            this.clipPlanes = [plane];
        } else if (type === 'custom') {
            const normal = new THREE.Vector3(0, 0, 1);
            normal.applyEuler(rotation);
            const plane = new THREE.Plane();
            plane.setFromNormalAndCoplanarPoint(normal, position);
            this.clipPlanes = [plane];
        }
    }

    updateClipping() {
        this.renderer.setLocalClippingEnabled(true);

        const strataGroup = this.modeler.getStrataGroup();
        strataGroup.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => {
                        m.clippingPlanes = this.clipPlanes;
                        m.clipShadows = true;
                    });
                } else {
                    child.material.clippingPlanes = this.clipPlanes;
                    child.material.clipShadows = true;
                }
            }
        });

        const faultsGroup = this.modeler.getFaultsGroup();
        faultsGroup.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => {
                        m.clippingPlanes = this.clipPlanes;
                        m.clipShadows = true;
                    });
                } else {
                    child.material.clippingPlanes = this.clipPlanes;
                    child.material.clipShadows = true;
                }
            }
        });

        const foldsGroup = this.modeler.getFoldsGroup();
        foldsGroup.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => {
                        m.clippingPlanes = this.clipPlanes;
                        m.clipShadows = true;
                    });
                } else {
                    child.material.clippingPlanes = this.clipPlanes;
                    child.material.clipShadows = true;
                }
            }
        });
    }

    createSectionFill() {
        if (this.currentSection.type === 'horizontal') return;

        const { position, rotation, width, height } = this.currentSection;

        const sectionPlaneGeo = new THREE.PlaneGeometry(width, height, 1, 1);
        const sectionPlaneMat = new THREE.MeshBasicMaterial({
            color: 0x4fc3f7,
            transparent: true,
            opacity: 0.08,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const sectionPlane = new THREE.Mesh(sectionPlaneGeo, sectionPlaneMat);
        sectionPlane.position.copy(position);
        sectionPlane.rotation.copy(rotation);
        sectionPlane.rotation.x = Math.PI / 2;
        sectionPlane.renderOrder = 1000;
        sectionPlane.userData = { isSectionHelper: true, selectable: false };

        this.sectionMeshes.push(sectionPlane);
        this.sectionGroup.add(sectionPlane);
    }

    createSectionGrid() {
        if (this.currentSection.type === 'horizontal') return;

        const { position, rotation, width, height } = this.currentSection;

        const gridHelper = new THREE.GridHelper(Math.max(width, height), 20, 0x4fc3f7, 0x29b6f6);
        gridHelper.position.copy(position);
        gridHelper.position.y += 2;
        gridHelper.rotation.copy(rotation);
        gridHelper.rotation.x = Math.PI / 2;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.25;
        gridHelper.userData = { isSectionHelper: true, selectable: false };

        this.sectionLines.push(gridHelper);
        this.sectionGroup.add(gridHelper);

        const borderGeo = new THREE.BufferGeometry();
        const halfW = width / 2;
        const halfH = height / 2;
        const borderPoints = [
            new THREE.Vector3(-halfW, -halfH, 0),
            new THREE.Vector3(halfW, -halfH, 0),
            new THREE.Vector3(halfW, halfH, 0),
            new THREE.Vector3(-halfW, halfH, 0),
            new THREE.Vector3(-halfW, -halfH, 0)
        ];
        borderGeo.setFromPoints(borderPoints);

        const borderMat = new THREE.LineBasicMaterial({
            color: 0x00bcd4,
            transparent: true,
            opacity: 0.7
        });
        const border = new THREE.Line(borderGeo, borderMat);
        border.position.copy(position);
        border.rotation.copy(rotation);
        border.rotation.x = Math.PI / 2;
        border.userData = { isSectionHelper: true, selectable: false };

        this.sectionLines.push(border);
        this.sectionGroup.add(border);
    }

    clearSectionPlanes() {
        this.sectionMeshes.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
            this.sectionGroup.remove(mesh);
        });
        this.sectionMeshes = [];

        this.sectionLines.forEach(line => {
            if (line.geometry) line.geometry.dispose();
            if (line.material) {
                if (Array.isArray(line.material)) {
                    line.material.forEach(m => m.dispose());
                } else {
                    line.material.dispose();
                }
            }
            this.sectionGroup.remove(line);
        });
        this.sectionLines = [];
    }

    getSectionData() {
        const data = {
            type: this.currentSection.type,
            position: this.currentSection.position.clone(),
            rotation: this.currentSection.rotation.clone(),
            strataIntersections: []
        };

        const strataData = this.modeler.data?.strata || [];
        const { position, rotation } = this.currentSection;

        strataData.forEach((stratum, idx) => {
            const topDepth = -stratum.topDepth;
            const bottomDepth = -stratum.bottomDepth;

            const dist = position.x - 250;
            const offset = dist * Math.sin(rotation.y) * 0.1;

            data.strataIntersections.push({
                id: stratum.id,
                name: stratum.name,
                color: stratum.color,
                topElevation: topDepth + offset + idx * 2,
                bottomElevation: bottomDepth + offset - idx * 2,
                thickness: stratum.bottomDepth - stratum.topDepth
            });
        });

        return data;
    }

    exportSectionData() {
        const data = this.getSectionData();
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `section_${data.type}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    addOnSectionChangeCallback(callback) {
        this.onSectionChangeCallbacks.push(callback);
    }

    notifySectionChange() {
        const data = this.getSectionData();
        this.onSectionChangeCallbacks.forEach(cb => cb(data));
    }

    reset() {
        this.currentSection = {
            type: 'vertical',
            position: new THREE.Vector3(250, 0, -200),
            rotation: new THREE.Euler(0, 0, 0),
            width: 500,
            height: 350,
            depth: 400
        };

        if (this.enabled) {
            this.updateSection();
        }
    }

    dispose() {
        this.disable();
        this.clearSectionPlanes();
        if (this.scene) {
            this.scene.remove(this.sectionGroup);
        }
    }
}

export default SectionAnalyzer;
