import * as THREE from 'three';

class GeoModeler {
    constructor(scene) {
        this.scene = scene;
        this.objects = new Map();
        this.data = null;
        this.globalOpacity = 0.85;
        this.wireframe = false;
        this.strataGroup = new THREE.Group();
        this.strataGroup.name = 'strataGroup';
        this.faultsGroup = new THREE.Group();
        this.faultsGroup.name = 'faultsGroup';
        this.foldsGroup = new THREE.Group();
        this.foldsGroup.name = 'foldsGroup';
        this.drillingsGroup = new THREE.Group();
        this.drillingsGroup.name = 'drillingsGroup';
        this.helpersGroup = new THREE.Group();
        this.helpersGroup.name = 'helpersGroup';
    }

    buildAll(data) {
        this.data = data;
        this.clear();

        this.scene.add(this.strataGroup);
        this.scene.add(this.faultsGroup);
        this.scene.add(this.foldsGroup);
        this.scene.add(this.drillingsGroup);
        this.scene.add(this.helpersGroup);

        if (data.strata && data.strata.length > 0) {
            this.buildStrataLayers(data.strata);
        }

        if (data.faults && data.faults.length > 0) {
            data.faults.forEach(fault => this.buildFault(fault));
        }

        if (data.folds && data.folds.length > 0) {
            data.folds.forEach(fold => this.buildFold(fold));
        }

        if (data.drillings && data.drillings.length > 0) {
            data.drillings.forEach(drilling => this.buildDrilling(drilling));
        }

        this.buildHelpers(data);

        return this.objects;
    }

    clear() {
        this.objects.clear();

        [this.strataGroup, this.faultsGroup, this.foldsGroup, this.drillingsGroup, this.helpersGroup].forEach(group => {
            while (group.children.length > 0) {
                const child = group.children[0];
                group.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });

        if (this.scene) {
            this.scene.remove(this.strataGroup);
            this.scene.remove(this.faultsGroup);
            this.scene.remove(this.foldsGroup);
            this.scene.remove(this.drillingsGroup);
            this.scene.remove(this.helpersGroup);
        }
    }

    buildStrataLayers(strataData) {
        const area = this.data.metadata?.area || { width: 500, depth: 400, height: 300 };
        const width = area.width;
        const depth = area.depth;

        strataData.forEach((stratum, index) => {
            const layerGroup = new THREE.Group();
            layerGroup.name = stratum.id;
            layerGroup.userData = {
                id: stratum.id,
                name: stratum.name,
                type: 'stratum',
                data: stratum,
                selectable: true
            };

            const topElevation = -stratum.topDepth;
            const bottomElevation = -stratum.bottomDepth;
            const thickness = stratum.thickness;

            const geometry = this.createStratumGeometry(width, depth, topElevation, bottomElevation, index, stratum.type);

            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color(stratum.color),
                transparent: true,
                opacity: this.globalOpacity,
                side: THREE.DoubleSide,
                shininess: 10,
                wireframe: this.wireframe
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(width / 2, 0, -depth / 2);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            mesh.userData = {
                id: stratum.id,
                name: stratum.name,
                type: 'stratum',
                data: stratum,
                selectable: true
            };

            layerGroup.add(mesh);

            const edgesGeometry = new THREE.EdgesGeometry(geometry, 20);
            const edgesMaterial = new THREE.LineBasicMaterial({
                color: new THREE.Color(stratum.color).multiplyScalar(0.7),
                transparent: true,
                opacity: this.globalOpacity * 0.5
            });
            const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
            edges.position.copy(mesh.position);
            layerGroup.add(edges);

            this.strataGroup.add(layerGroup);
            this.objects.set(stratum.id, layerGroup);
        });
    }

    createStratumGeometry(width, depth, topY, bottomY, index, type) {
        const segmentsX = 30;
        const segmentsZ = 24;
        const geometry = new THREE.BoxGeometry(width, 1, depth, segmentsX, 1, segmentsZ);

        const positions = geometry.attributes.position;
        const thickness = topY - bottomY;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            const nx = (x + width / 2) / width;
            const nz = (z + depth / 2) / depth;

            const wave = Math.sin(nx * Math.PI * 2 + index * 0.5) * Math.cos(nz * Math.PI * 1.5 + index * 0.3) * 8;
            const noise = this.simpleNoise(nx * 5, nz * 5, index) * 3;
            const offset = wave + noise;

            if (y > 0) {
                positions.setY(i, topY + offset);
            } else {
                positions.setY(i, bottomY + offset * 0.7);
            }
        }

        geometry.computeVertexNormals();
        return geometry;
    }

    simpleNoise(x, y, seed) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.758) * 43758.5453;
        return n - Math.floor(n) - 0.5;
    }

    buildFault(faultData) {
        const faultGroup = new THREE.Group();
        faultGroup.name = faultData.id;
        faultGroup.userData = {
            id: faultData.id,
            name: faultData.name,
            type: 'fault',
            data: faultData,
            selectable: true
        };

        const pos = faultData.position;
        const dipRad = (faultData.dipAngle * Math.PI) / 180;
        const strikeRad = (faultData.strike * Math.PI) / 180;

        const width = pos.width;
        const height = pos.height;

        const geometry = new THREE.PlaneGeometry(width, height, 20, 15);

        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            const wave = Math.sin(x * 0.02) * Math.cos(y * 0.03) * 5;
            positions.setZ(i, z + wave);
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(faultData.color),
            transparent: true,
            opacity: this.globalOpacity * 0.8,
            side: THREE.DoubleSide,
            shininess: 5,
            wireframe: this.wireframe
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(pos.x, -height / 2, pos.z);
        mesh.rotation.y = -strikeRad;
        mesh.rotation.x = dipRad - Math.PI / 2;

        mesh.userData = {
            id: faultData.id,
            name: faultData.name,
            type: 'fault',
            data: faultData,
            selectable: true
        };

        faultGroup.add(mesh);

        const edgesGeometry = new THREE.EdgesGeometry(geometry, 15);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(faultData.color),
            transparent: true,
            opacity: this.globalOpacity * 0.6
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        edges.position.copy(mesh.position);
        edges.rotation.copy(mesh.rotation);
        faultGroup.add(edges);

        this.faultsGroup.add(faultGroup);
        this.objects.set(faultData.id, faultGroup);
    }

    buildFold(foldData) {
        const foldGroup = new THREE.Group();
        foldGroup.name = foldData.id;
        foldGroup.userData = {
            id: foldData.id,
            name: foldData.name,
            type: 'fold',
            data: foldData,
            selectable: true
        };

        const axis = foldData.axis;
        const amplitude = foldData.amplitude;
        const wavelength = foldData.wavelength;
        const length = axis.length;
        const directionRad = (axis.direction * Math.PI) / 180;

        const width = wavelength * 1.5;
        const segmentsX = 40;
        const segmentsY = 1;
        const segmentsZ = 30;

        const geometry = new THREE.BoxGeometry(width, 2, length, segmentsX, segmentsY, segmentsZ);

        const positions = geometry.attributes.position;
        const isSyncline = foldData.type === 'syncline';
        const sign = isSyncline ? -1 : 1;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            const wave = Math.sin((x / width + 0.5) * Math.PI * 2) * amplitude * sign;
            const axialWave = Math.sin(z / length * Math.PI * 3) * amplitude * 0.3;
            const noise = this.simpleNoise(x * 0.02, z * 0.02, foldData.index) * 3;

            if (y > 0) {
                positions.setY(i, wave + axialWave + noise);
            } else {
                positions.setY(i, wave + axialWave + noise - 15 - Math.abs(x / width) * 10);
            }
        }

        geometry.computeVertexNormals();

        const material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(foldData.color),
            transparent: true,
            opacity: this.globalOpacity * 0.7,
            side: THREE.DoubleSide,
            shininess: 8,
            wireframe: this.wireframe
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(axis.x, -80, axis.z);
        mesh.rotation.y = -directionRad;

        mesh.userData = {
            id: foldData.id,
            name: foldData.name,
            type: 'fold',
            data: foldData,
            selectable: true
        };

        foldGroup.add(mesh);

        const edgesGeometry = new THREE.EdgesGeometry(geometry, 20);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(foldData.color),
            transparent: true,
            opacity: this.globalOpacity * 0.5
        });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        edges.position.copy(mesh.position);
        edges.rotation.copy(mesh.rotation);
        foldGroup.add(edges);

        this.foldsGroup.add(foldGroup);
        this.objects.set(foldData.id, foldGroup);
    }

    buildDrilling(drillingData) {
        const drillGroup = new THREE.Group();
        drillGroup.name = drillingData.id;
        drillGroup.userData = {
            id: drillingData.id,
            name: drillingData.name,
            type: 'drilling',
            data: drillingData,
            selectable: true
        };

        const pos = drillingData.position;
        const depth = drillingData.totalDepth;
        const radius = drillingData.diameter * 20;

        const casingGeometry = new THREE.CylinderGeometry(radius, radius, depth, 16, 1, true);
        const casingMaterial = new THREE.MeshPhongMaterial({
            color: 0x90A4AE,
            transparent: true,
            opacity: this.globalOpacity * 0.6,
            side: THREE.DoubleSide,
            shininess: 30,
            wireframe: this.wireframe
        });
        const casing = new THREE.Mesh(casingGeometry, casingMaterial);
        casing.position.set(pos.x, -depth / 2, pos.z);
        casing.userData = {
            id: drillingData.id,
            name: drillingData.name,
            type: 'drilling',
            data: drillingData,
            selectable: true
        };
        drillGroup.add(casing);

        if (drillingData.layers && drillingData.layers.length > 0) {
            let currentDepth = 0;
            drillingData.layers.forEach((layer, idx) => {
                const layerThickness = layer.to - layer.from;
                const layerGeometry = new THREE.CylinderGeometry(
                    radius * 0.7,
                    radius * 0.7,
                    layerThickness,
                    12
                );
                const layerColor = this.getLayerColor(idx);
                const layerMaterial = new THREE.MeshPhongMaterial({
                    color: layerColor,
                    transparent: true,
                    opacity: this.globalOpacity,
                    shininess: 10,
                    wireframe: this.wireframe
                });
                const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
                layerMesh.position.set(
                    pos.x,
                    -(currentDepth + layerThickness / 2),
                    pos.z
                );
                layerMesh.userData = {
                    id: drillingData.id,
                    name: drillingData.name,
                    type: 'drilling',
                    data: drillingData,
                    selectable: true
                };
                drillGroup.add(layerMesh);
                currentDepth += layerThickness;
            });
        }

        const topGeometry = new THREE.CylinderGeometry(radius * 1.3, radius * 1.3, 1.5, 16);
        const topMaterial = new THREE.MeshPhongMaterial({
            color: 0x455A64,
            shininess: 50
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(pos.x, -0.75, pos.z);
        drillGroup.add(top);

        const labelDiv = this.createDrillingLabel(drillingData.name, pos.x, 5, pos.z);
        drillGroup.add(labelDiv);

        this.drillingsGroup.add(drillGroup);
        this.objects.set(drillingData.id, drillGroup);
    }

    getLayerColor(index) {
        const colors = [
            0x8D6E63, 0xA1887F, 0xBCAAA4, 0xD7CCC8,
            0x6D4C41, 0x5D4037, 0x4E342E, 0x3E2723
        ];
        return colors[index % colors.length];
    }

    createDrillingLabel(text, x, y, z) {
        const group = new THREE.Group();

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = 'rgba(20, 28, 50, 0.9)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.strokeStyle = 'rgba(100, 120, 180, 0.5)';
        context.lineWidth = 2;
        context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

        context.fillStyle = '#FFD54F';
        context.font = 'bold 28px -apple-system, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, y, z);
        sprite.scale.set(15, 3.75, 1);

        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xFFD54F,
            transparent: true,
            opacity: 0.6
        });
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, y - 1.8, z),
            new THREE.Vector3(x, 0, z)
        ]);
        const line = new THREE.Line(lineGeometry, lineMaterial);

        group.add(sprite);
        group.add(line);

        return group;
    }

    buildHelpers(data) {
        const area = data.metadata?.area || { width: 500, depth: 400, height: 300 };

        const gridHelper = new THREE.GridHelper(Math.max(area.width, area.depth) * 1.2, 50, 0x455A64, 0x37474F);
        gridHelper.position.set(area.width / 2, -area.height * 0.05, -area.depth / 2);
        gridHelper.name = 'gridHelper';
        this.helpersGroup.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(50);
        axesHelper.position.set(10, 5, -10);
        axesHelper.name = 'axesHelper';
        this.helpersGroup.add(axesHelper);

        const boxGeometry = new THREE.BoxGeometry(area.width, area.height, area.depth);
        const boxEdges = new THREE.EdgesGeometry(boxGeometry);
        const boxLine = new THREE.LineSegments(
            boxEdges,
            new THREE.LineBasicMaterial({
                color: 0x546E7A,
                transparent: true,
                opacity: 0.4
            })
        );
        boxLine.position.set(area.width / 2, -area.height / 2, -area.depth / 2);
        boxLine.name = 'boundingBox';
        this.helpersGroup.add(boxLine);
    }

    getObjectById(id) {
        return this.objects.get(id);
    }

    getAllObjects() {
        return Array.from(this.objects.values());
    }

    setLayerVisible(id, visible) {
        const obj = this.objects.get(id);
        if (obj) {
            obj.visible = visible;
        }
    }

    setLayerOpacity(id, opacity) {
        const obj = this.objects.get(id);
        if (obj) {
            obj.traverse(child => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            m.opacity = opacity;
                            m.transparent = opacity < 1;
                        });
                    } else {
                        child.material.opacity = opacity;
                        child.material.transparent = opacity < 1;
                    }
                }
                if (child.isLineSegments && child.material) {
                    child.material.opacity = opacity * 0.5;
                    child.material.transparent = true;
                }
            });
        }
    }

    setGlobalOpacity(opacity) {
        this.globalOpacity = opacity;

        this.objects.forEach((obj, id) => {
            this.setLayerOpacity(id, opacity);
        });
    }

    setWireframe(enabled) {
        this.wireframe = enabled;

        this.objects.forEach(obj => {
            obj.traverse(child => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            m.wireframe = enabled;
                        });
                    } else {
                        child.material.wireframe = enabled;
                    }
                }
            });
        });
    }

    setGridVisible(visible) {
        const grid = this.helpersGroup.getObjectByName('gridHelper');
        if (grid) {
            grid.visible = visible;
        }

        const bbox = this.helpersGroup.getObjectByName('boundingBox');
        if (bbox) {
            bbox.visible = visible;
        }
    }

    setAxesVisible(visible) {
        const axes = this.helpersGroup.getObjectByName('axesHelper');
        if (axes) {
            axes.visible = visible;
        }
    }

    highlightObject(id) {
        const obj = this.objects.get(id);
        if (!obj) return;

        this.clearAllHighlights();

        obj.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => {
                        m._originalEmissive = m.emissive?.getHex() || 0;
                        if (m.emissive) m.emissive.setHex(0x4488ff);
                        m._originalEmissiveIntensity = m.emissiveIntensity || 0;
                        m.emissiveIntensity = 0.4;
                    });
                } else {
                    child.material._originalEmissive = child.material.emissive?.getHex() || 0;
                    if (child.material.emissive) child.material.emissive.setHex(0x4488ff);
                    child.material._originalEmissiveIntensity = child.material.emissiveIntensity || 0;
                    child.material.emissiveIntensity = 0.4;
                }
            }
        });

        obj.userData._highlighted = true;
    }

    clearAllHighlights() {
        this.objects.forEach(obj => {
            if (obj.userData._highlighted) {
                obj.traverse(child => {
                    if (child.isMesh && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => {
                                if (m._originalEmissive !== undefined && m.emissive) {
                                    m.emissive.setHex(m._originalEmissive);
                                    m.emissiveIntensity = m._originalEmissiveIntensity || 0;
                                }
                            });
                        } else {
                            if (child.material._originalEmissive !== undefined && child.material.emissive) {
                                child.material.emissive.setHex(child.material._originalEmissive);
                                child.material.emissiveIntensity = child.material._originalEmissiveIntensity || 0;
                            }
                        }
                    }
                });
                obj.userData._highlighted = false;
            }
        });
    }

    getStrataGroup() {
        return this.strataGroup;
    }

    getFaultsGroup() {
        return this.faultsGroup;
    }

    getFoldsGroup() {
        return this.foldsGroup;
    }

    getDrillingsGroup() {
        return this.drillingsGroup;
    }

    getHelpersGroup() {
        return this.helpersGroup;
    }
}

export default GeoModeler;
