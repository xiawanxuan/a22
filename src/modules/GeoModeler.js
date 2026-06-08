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

        const sortedStrata = [...strataData].sort((a, b) => b.topDepth - a.topDepth);

        sortedStrata.forEach((stratum, index) => {
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

            const geometry = this.createStratumGeometry(
                width, depth,
                topElevation, bottomElevation,
                stratum, index
            );

            const material = new THREE.MeshPhongMaterial({
                color: new THREE.Color(stratum.color),
                transparent: true,
                opacity: this.globalOpacity,
                side: THREE.DoubleSide,
                shininess: 15,
                wireframe: this.wireframe,
                depthWrite: false,
                depthTest: true
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(width / 2, 0, -depth / 2);
            mesh.receiveShadow = true;
            mesh.castShadow = true;
            mesh.renderOrder = 10 + index;
            mesh.userData = {
                id: stratum.id,
                name: stratum.name,
                type: 'stratum',
                data: stratum,
                selectable: true
            };

            layerGroup.add(mesh);

            const edgesGeometry = new THREE.EdgesGeometry(geometry, 25);
            const edgesMaterial = new THREE.LineBasicMaterial({
                color: new THREE.Color(stratum.color).multiplyScalar(0.4),
                transparent: true,
                opacity: this.globalOpacity * 0.2
            });
            const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
            edges.position.copy(mesh.position);
            edges.renderOrder = 10 + index;
            layerGroup.add(edges);

            this.strataGroup.add(layerGroup);
            this.objects.set(stratum.id, layerGroup);
        });
    }

    createStratumGeometry(width, depth, topY, bottomY, stratum, index) {
        const segmentsX = 48;
        const segmentsZ = 36;
        const geometry = new THREE.BoxGeometry(width, 1, depth, segmentsX, 1, segmentsZ);

        const positions = geometry.attributes.position;

        const foldStrike = stratum.foldStrike !== undefined ? stratum.foldStrike : 45 + index * 15;
        const foldAmplitude = stratum.foldAmplitude || (18 + index * 5);
        const foldWavelength = stratum.foldWavelength || (220 + index * 25);
        const dipAngle = stratum.dipAngle !== undefined ? stratum.dipAngle : (6 + index * 2);
        const dipDirection = stratum.dipDirection !== undefined ? stratum.dipDirection : (90 + index * 20);
        const roughness = stratum.roughness || (4 + index * 1.5);
        const thicknessVar = stratum.thicknessVariation || (8 + index * 2);

        const strikeRad = (foldStrike * Math.PI) / 180;
        const cosStrike = Math.cos(strikeRad);
        const sinStrike = Math.sin(strikeRad);

        const dipRad = (dipAngle * Math.PI) / 180;
        const dipDirRad = (dipDirection * Math.PI) / 180;

        const baseThickness = topY - bottomY;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            const nx = (x + width / 2) / width;
            const nz = (z + depth / 2) / depth;

            const alongStrike = nx * cosStrike + nz * sinStrike;
            const acrossStrike = -nx * sinStrike + nz * cosStrike;

            const primaryFold = Math.sin(acrossStrike * Math.PI * 2 * (depth / foldWavelength) + index * 0.6) * foldAmplitude;
            const secondaryFold = Math.sin(acrossStrike * Math.PI * 5.2 + index * 1.1) * foldAmplitude * 0.18;
            const axialVariation = Math.sin(alongStrike * Math.PI * 2.5 + index * 0.8) * foldAmplitude * 0.22;

            const noiseLarge = this.fbmNoise(nx * 2.5 + index * 2.3, nz * 2.5 + index * 3.1, index * 150, 3) * roughness * 2.5;
            const noiseMedium = this.fbmNoise(nx * 6 + index * 4.7, nz * 6 + index * 5.9, index * 250, 4) * roughness * 0.8;
            const noiseFine = this.simpleNoise(nx * 18 + index * 7.2, nz * 18 + index * 8.4, index * 350) * roughness * 0.25;
            const totalNoise = noiseLarge + noiseMedium + noiseFine;

            const dipOffsetX = (nx - 0.5) * Math.sin(dipDirRad) * Math.tan(dipRad) * depth * 0.5;
            const dipOffsetZ = (nz - 0.5) * Math.cos(dipDirRad) * Math.tan(dipRad) * depth * 0.5;
            const totalDip = dipOffsetX + dipOffsetZ;

            const faultOffset = this.getFaultOffsetAt(x + width / 2, z + depth / 2, index);

            const thicknessNoise = this.fbmNoise(nx * 3 + index * 11, nz * 3 + index * 13, index * 500, 3) * thicknessVar;
            const thicknessAlongStrike = Math.sin(alongStrike * Math.PI * 1.5 + index * 0.9) * thicknessVar * 0.4;

            const totalOffset = primaryFold + secondaryFold + axialVariation + totalNoise + totalDip + faultOffset;

            if (y > 0) {
                positions.setY(i, topY + totalOffset);
            } else {
                const thicknessMod = baseThickness + thicknessNoise + thicknessAlongStrike;
                positions.setY(i, topY + totalOffset * 0.9 - Math.max(thicknessMod, baseThickness * 0.4));
            }
        }

        geometry.computeVertexNormals();
        return geometry;
    }

    getFaultOffsetAt(x, z, stratumIndex) {
        if (!this.data || !this.data.faults || this.data.faults.length === 0) {
            return 0;
        }

        let totalOffset = 0;

        this.data.faults.forEach((fault, fi) => {
            const faultX = fault.position?.x || 100;
            const faultZ = fault.position?.z || -200;
            const faultWidth = fault.position?.width || 200;
            const displacement = fault.displacement || 20;
            const strike = fault.strike || 0;

            const relX = x - faultX;
            const relZ = z - (faultZ + (this.data.metadata?.area?.depth || 400) / 2);

            const strikeRad = (strike * Math.PI) / 180;
            const distAlong = relX * Math.cos(strikeRad) + relZ * Math.sin(strikeRad);
            const distAcross = -relX * Math.sin(strikeRad) + relZ * Math.cos(strikeRad);

            const alongFactor = Math.max(0, 1 - Math.abs(distAlong) / (faultWidth / 2));
            const faultInfluence = Math.exp(-Math.pow(distAcross / 30, 2)) * alongFactor;

            const baseDisplacement = displacement * 0.4 * (1 - stratumIndex * 0.12);
            const faultOffset = Math.max(0, baseDisplacement) * faultInfluence;

            totalOffset += (fi % 2 === 0 ? faultOffset : -faultOffset);
        });

        return totalOffset;
    }

    simpleNoise(x, y, seed) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.758) * 43758.5453;
        return n - Math.floor(n) - 0.5;
    }

    fbmNoise(x, y, seed, octaves = 4) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.simpleNoise(x * frequency, y * frequency, seed + i * 100) * amplitude;
            maxValue += amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return value / maxValue;
    }

    getSurfaceElevation(x, z, stratum, index, surfaceType) {
        const area = this.data.metadata?.area || { width: 500, depth: 400 };
        const width = area.width;
        const depth = area.depth;

        const nx = (x + width / 2) / width;
        const nz = (z + depth / 2) / depth;

        const baseElevation = surfaceType === 'top' ? -stratum.topDepth : -stratum.bottomDepth;

        const foldAmplitude = stratum.foldAmplitude || 15;
        const foldWavelength = stratum.foldWavelength || 300;
        const foldDirection = stratum.foldDirection || 30;

        const foldRad = (foldDirection * Math.PI) / 180;
        const foldX = nx * Math.cos(foldRad) - nz * Math.sin(foldRad);
        const foldZ = nx * Math.sin(foldRad) + nz * Math.cos(foldRad);

        const foldWave = Math.sin(foldX * Math.PI * 2 * (width / foldWavelength) + index * 0.8) * foldAmplitude;
        const secondaryFold = Math.sin(foldZ * Math.PI * 3 + index * 0.5) * foldAmplitude * 0.3;

        const noiseScale = 0.008;
        const noiseAmplitude = 8;
        const noiseVal = this.fbmNoise(
            (x + width / 2) * noiseScale + index * 10,
            (z + depth / 2) * noiseScale + index * 20,
            index + (surfaceType === 'top' ? 0 : 1000),
            5
        ) * noiseAmplitude;

        const tiltX = (nx - 0.5) * (stratum.tiltX || 12);
        const tiltZ = (nz - 0.5) * (stratum.tiltZ || 8);

        let elevation = baseElevation + foldWave + secondaryFold + noiseVal + tiltX + tiltZ;

        if (this.data.faults && this.data.faults.length > 0) {
            this.data.faults.forEach((fault, fi) => {
                const faultX = fault.position?.x || 100;
                const faultZ = fault.position?.z || -200;
                const faultWidth = fault.position?.width || 200;
                const displacement = fault.displacement || 20;

                const relX = (x + width / 2) - faultX;
                const relZ = (z + depth / 2) - (faultZ + depth / 2);

                const strikeRad = (fault.strike || 0) * Math.PI / 180;
                const distAlongStrike = relX * Math.cos(strikeRad) + relZ * Math.sin(strikeRad);
                const distAcrossStrike = -relX * Math.sin(strikeRad) + relZ * Math.cos(strikeRad);

                const alongStrikeFactor = Math.max(0, 1 - Math.abs(distAlongStrike) / (faultWidth / 2));
                const faultInfluence = Math.exp(-Math.pow(distAcrossStrike / 25, 2)) * alongStrikeFactor;

                const faultOffset = displacement * faultInfluence * 0.5;
                elevation += (fi % 2 === 0 ? faultOffset : -faultOffset);
            });
        }

        return elevation;
    }

    createStratumGeometryPro(width, depth, topY, bottomY, stratum, index) {
        const segmentsX = 80;
        const segmentsZ = 64;

        const topPositions = [];
        const bottomPositions = [];

        for (let j = 0; j <= segmentsZ; j++) {
            for (let i = 0; i <= segmentsX; i++) {
                const x = (i / segmentsX - 0.5) * width;
                const z = (j / segmentsZ - 0.5) * depth;

                const topElev = this.getSurfaceElevation(x, z, stratum, index, 'top');
                const bottomElev = this.getSurfaceElevation(x, z, stratum, index, 'bottom');

                topPositions.push(new THREE.Vector3(x, topElev, z));
                bottomPositions.push(new THREE.Vector3(x, bottomElev, z));
            }
        }

        const vertices = [];
        const indices = [];
        let vertexIndex = 0;

        for (let j = 0; j < segmentsZ; j++) {
            for (let i = 0; i < segmentsX; i++) {
                const a = j * (segmentsX + 1) + i;
                const b = a + 1;
                const c = a + segmentsX + 1;
                const d = c + 1;

                const topA = topPositions[a];
                const topB = topPositions[b];
                const topC = topPositions[c];
                const topD = topPositions[d];

                vertices.push(topA.x, topA.y, topA.z);
                vertices.push(topB.x, topB.y, topB.z);
                vertices.push(topC.x, topC.y, topC.z);
                vertices.push(topD.x, topD.y, topD.z);

                const baseIdx = vertexIndex;
                indices.push(baseIdx, baseIdx + 2, baseIdx + 1);
                indices.push(baseIdx + 1, baseIdx + 2, baseIdx + 3);
                vertexIndex += 4;

                const botA = bottomPositions[a];
                const botB = bottomPositions[b];
                const botC = bottomPositions[c];
                const botD = bottomPositions[d];

                vertices.push(botA.x, botA.y, botA.z);
                vertices.push(botB.x, botB.y, botB.z);
                vertices.push(botC.x, botC.y, botC.z);
                vertices.push(botD.x, botD.y, botD.z);

                const botBaseIdx = vertexIndex;
                indices.push(botBaseIdx, botBaseIdx + 1, botBaseIdx + 2);
                indices.push(botBaseIdx + 1, botBaseIdx + 3, botBaseIdx + 2);
                vertexIndex += 4;

                const sideY1 = topA;
                const sideY2 = botA;
                const sideY3 = topB;
                const sideY4 = botB;

                vertices.push(sideY1.x, sideY1.y, sideY1.z);
                vertices.push(sideY2.x, sideY2.y, sideY2.z);
                vertices.push(sideY3.x, sideY3.y, sideY3.z);
                vertices.push(sideY4.x, sideY4.y, sideY4.z);

                const sideBaseIdx = vertexIndex;
                indices.push(sideBaseIdx, sideBaseIdx + 1, sideBaseIdx + 2);
                indices.push(sideBaseIdx + 1, sideBaseIdx + 3, sideBaseIdx + 2);
                vertexIndex += 4;
            }
        }

        for (let i = 0; i < segmentsX; i++) {
            const frontIdx = i;
            const backIdx = (segmentsZ) * (segmentsX + 1) + i;

            const topFront = topPositions[frontIdx];
            const botFront = bottomPositions[frontIdx];
            const topFrontNext = topPositions[frontIdx + 1];
            const botFrontNext = bottomPositions[frontIdx + 1];

            vertices.push(topFront.x, topFront.y, topFront.z);
            vertices.push(botFront.x, botFront.y, botFront.z);
            vertices.push(topFrontNext.x, topFrontNext.y, topFrontNext.z);
            vertices.push(botFrontNext.x, botFrontNext.y, botFrontNext.z);

            const frontBaseIdx = vertexIndex;
            indices.push(frontBaseIdx, frontBaseIdx + 2, frontBaseIdx + 1);
            indices.push(frontBaseIdx + 1, frontBaseIdx + 2, frontBaseIdx + 3);
            vertexIndex += 4;

            const topBack = topPositions[backIdx];
            const botBack = bottomPositions[backIdx];
            const topBackNext = topPositions[backIdx + 1];
            const botBackNext = bottomPositions[backIdx + 1];

            vertices.push(topBack.x, topBack.y, topBack.z);
            vertices.push(botBack.x, botBack.y, botBack.z);
            vertices.push(topBackNext.x, topBackNext.y, topBackNext.z);
            vertices.push(botBackNext.x, botBackNext.y, botBackNext.z);

            const backBaseIdx = vertexIndex;
            indices.push(backBaseIdx, backBaseIdx + 1, backBaseIdx + 2);
            indices.push(backBaseIdx + 1, backBaseIdx + 3, backBaseIdx + 2);
            vertexIndex += 4;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        return geometry;
    }

    createStratumContourLines(width, depth, baseElevation, stratum, index, surfaceType) {
        const group = new THREE.Group();

        const segmentsX = 40;
        const segmentsZ = 32;

        const contourLevels = [-5, 0, 5, 10];

        contourLevels.forEach((level, levelIdx) => {
            const points = [];

            for (let i = 0; i <= segmentsX; i++) {
                const x = (i / segmentsX - 0.5) * width;
                const z = 0;

                const elev = this.getSurfaceElevation(x, z, stratum, index, surfaceType);
                if (Math.abs(elev - baseElevation - level) < 20) {
                    points.push(new THREE.Vector3(x, elev, z));
                }
            }

            if (points.length > 1) {
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({
                    color: new THREE.Color(stratum.color).multiplyScalar(0.6 + levelIdx * 0.1),
                    transparent: true,
                    opacity: this.globalOpacity * 0.4,
                    linewidth: 1
                });
                const line = new THREE.Line(geometry, material);
                line.userData = { selectable: false, isHelper: true };
                group.add(line);
            }
        });

        return group;
    }

    createStratumSideEdges(width, depth, topY, bottomY, stratum, index) {
        const group = new THREE.Group();

        const edgesColor = new THREE.Color(stratum.color).multiplyScalar(0.7);
        const edgesMaterial = new THREE.LineBasicMaterial({
            color: edgesColor,
            transparent: true,
            opacity: this.globalOpacity * 0.6
        });

        const cornerPoints = [
            { x: -width / 2, z: -depth / 2 },
            { x: width / 2, z: -depth / 2 },
            { x: width / 2, z: depth / 2 },
            { x: -width / 2, z: depth / 2 }
        ];

        for (let i = 0; i < 4; i++) {
            const p1 = cornerPoints[i];
            const p2 = cornerPoints[(i + 1) % 4];

            const top1 = this.getSurfaceElevation(p1.x, p1.z, stratum, index, 'top');
            const bot1 = this.getSurfaceElevation(p1.x, p1.z, stratum, index, 'bottom');
            const top2 = this.getSurfaceElevation(p2.x, p2.z, stratum, index, 'top');
            const bot2 = this.getSurfaceElevation(p2.x, p2.z, stratum, index, 'bottom');

            const topLinePoints = [
                new THREE.Vector3(p1.x, top1, p1.z),
                new THREE.Vector3(p2.x, top2, p2.z)
            ];
            const topLineGeo = new THREE.BufferGeometry().setFromPoints(topLinePoints);
            const topLine = new THREE.Line(topLineGeo, edgesMaterial);
            topLine.userData = { selectable: false, isHelper: true };
            group.add(topLine);

            const botLinePoints = [
                new THREE.Vector3(p1.x, bot1, p1.z),
                new THREE.Vector3(p2.x, bot2, p2.z)
            ];
            const botLineGeo = new THREE.BufferGeometry().setFromPoints(botLinePoints);
            const botLine = new THREE.Line(botLineGeo, edgesMaterial);
            botLine.userData = { selectable: false, isHelper: true };
            group.add(botLine);

            const cornerLinePoints = [
                new THREE.Vector3(p1.x, top1, p1.z),
                new THREE.Vector3(p1.x, bot1, p1.z)
            ];
            const cornerLineGeo = new THREE.BufferGeometry().setFromPoints(cornerLinePoints);
            const cornerLine = new THREE.Line(cornerLineGeo, edgesMaterial);
            cornerLine.userData = { selectable: false, isHelper: true };
            group.add(cornerLine);
        }

        return group;
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
            wireframe: this.wireframe,
            depthWrite: false,
            depthTest: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(pos.x, -height / 2, pos.z);
        mesh.rotation.y = -strikeRad;
        mesh.rotation.x = dipRad - Math.PI / 2;
        mesh.renderOrder = 50;

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
            wireframe: this.wireframe,
            depthWrite: false,
            depthTest: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(axis.x, -80, axis.z);
        mesh.rotation.y = -directionRad;
        mesh.renderOrder = 40;

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
            wireframe: this.wireframe,
            depthWrite: false,
            depthTest: true
        });
        const casing = new THREE.Mesh(casingGeometry, casingMaterial);
        casing.position.set(pos.x, -depth / 2, pos.z);
        casing.renderOrder = 20;
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
                    wireframe: this.wireframe,
                    depthWrite: false,
                    depthTest: true
                });
                const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
                layerMesh.position.set(
                    pos.x,
                    -(currentDepth + layerThickness / 2),
                    pos.z
                );
                layerMesh.renderOrder = 25;
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
                            m.transparent = true;
                            m.depthWrite = false;
                            m.depthTest = true;
                        });
                    } else {
                        child.material.opacity = opacity;
                        child.material.transparent = true;
                        child.material.depthWrite = false;
                        child.material.depthTest = true;
                    }
                }
                if (child.isLineSegments && child.material) {
                    child.material.opacity = opacity * 0.5;
                    child.material.transparent = true;
                }
                if (child.isLine && child.material) {
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
                            m.depthWrite = false;
                            m.transparent = true;
                        });
                    } else {
                        child.material.wireframe = enabled;
                        child.material.depthWrite = false;
                        child.material.transparent = true;
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
