import * as THREE from 'three';

class ReserveCalculator {
    constructor(modeler) {
        this.modeler = modeler;
        this.results = null;
    }

    calculateAll() {
        const results = {
            totalVolume: 0,
            totalMass: 0,
            strata: [],
            timestamp: Date.now()
        };

        const strataData = this.modeler.data?.strata || [];
        const area = this.modeler.data?.metadata?.area || { width: 500, depth: 400 };

        strataData.forEach((stratum, index) => {
            const stratumResult = this.calculateStratumReserve(stratum, index, area);
            results.strata.push(stratumResult);
            results.totalVolume += stratumResult.volume;
            results.totalMass += stratumResult.mass;
        });

        results.totalVolume = Math.round(results.totalVolume * 100) / 100;
        results.totalMass = Math.round(results.totalMass * 100) / 100;

        this.results = results;
        return results;
    }

    calculateStratumReserve(stratum, index, area) {
        const volume = this.calculateStratumVolume(stratum, index, area);
        const density = stratum.properties?.density || this.getDefaultDensity(stratum.type);
        const grade = stratum.properties?.grade || 0;
        const recoveryRate = stratum.properties?.recoveryRate || 0.85;

        const mass = volume * density;
        const mineralMass = mass * grade;
        const recoverableReserve = mineralMass * recoveryRate;

        return {
            id: stratum.id,
            name: stratum.name,
            type: stratum.type,
            color: stratum.color,
            volume: Math.round(volume * 100) / 100,
            density: density,
            mass: Math.round(mass * 100) / 100,
            grade: grade,
            mineralMass: Math.round(mineralMass * 100) / 100,
            recoveryRate: recoveryRate,
            recoverableReserve: Math.round(recoverableReserve * 100) / 100,
            topDepth: stratum.topDepth,
            bottomDepth: stratum.bottomDepth,
            averageThickness: Math.round((stratum.bottomDepth - stratum.topDepth) * 100) / 100,
            surfaceArea: Math.round(area.width * area.depth * 100) / 100
        };
    }

    calculateStratumVolume(stratum, index, area) {
        const width = area.width;
        const depth = area.depth;
        const baseThickness = stratum.bottomDepth - stratum.topDepth;

        const samplesX = 30;
        const samplesZ = 24;

        let volume = 0;
        const cellWidth = width / samplesX;
        const cellDepth = depth / samplesZ;

        for (let i = 0; i < samplesX; i++) {
            for (let j = 0; j < samplesZ; j++) {
                const x = (i / samplesX - 0.5) * width + cellWidth / 2;
                const z = (j / samplesZ - 0.5) * depth + cellDepth / 2;

                const nx = (x + width / 2) / width;
                const nz = (z + depth / 2) / depth;

                const foldStrike = 45 + index * 15;
                const foldAmplitude = 18 + index * 5;
                const foldWavelength = 220 + index * 25;
                const roughness = 4 + index * 1.5;
                const thicknessVar = 8 + index * 2;

                const strikeRad = (foldStrike * Math.PI) / 180;
                const cosStrike = Math.cos(strikeRad);
                const sinStrike = Math.sin(strikeRad);

                const alongStrike = nx * cosStrike + nz * sinStrike;
                const acrossStrike = -nx * sinStrike + nz * cosStrike;

                const primaryFold = Math.sin(acrossStrike * Math.PI * 2 * (depth / foldWavelength) + index * 0.6) * foldAmplitude;
                const secondaryFold = Math.sin(acrossStrike * Math.PI * 5.2 + index * 1.1) * foldAmplitude * 0.18;
                const axialVariation = Math.sin(alongStrike * Math.PI * 2.5 + index * 0.8) * foldAmplitude * 0.22;

                const noiseLarge = this.fbmNoise(nx * 2.5 + index * 2.3, nz * 2.5 + index * 3.1, index * 150, 3) * roughness * 2.5;
                const noiseMedium = this.fbmNoise(nx * 6 + index * 4.7, nz * 6 + index * 5.9, index * 250, 4) * roughness * 0.8;
                const noiseFine = this.simpleNoise(nx * 18 + index * 7.2, nz * 18 + index * 8.4, index * 350) * roughness * 0.25;
                const totalNoise = noiseLarge + noiseMedium + noiseFine;

                const thicknessNoise = this.fbmNoise(nx * 3 + index * 11, nz * 3 + index * 13, index * 500, 3) * thicknessVar;
                const thicknessAlongStrike = Math.sin(alongStrike * Math.PI * 1.5 + index * 0.9) * thicknessVar * 0.4;

                const thicknessMod = baseThickness + thicknessNoise + thicknessAlongStrike;
                const actualThickness = Math.max(thicknessMod, baseThickness * 0.4);

                const cellVolume = cellWidth * cellDepth * actualThickness;
                volume += cellVolume;
            }
        }

        return Math.abs(volume);
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

    getDefaultDensity(type) {
        const densities = {
            soil: 1.8,
            clay: 2.0,
            sandstone: 2.4,
            limestone: 2.6,
            slate: 2.7,
            granite: 2.7,
            basalt: 2.9,
            coal: 1.3,
            ore: 3.2
        };
        return densities[type] || 2.5;
    }

    getResults() {
        if (!this.results) {
            this.calculateAll();
        }
        return this.results;
    }

    exportResults() {
        const results = this.getResults();
        const jsonData = JSON.stringify(results, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reserve_calculation_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportCSV() {
        const results = this.getResults();
        let csv = '地层名称,地层类型,体积(立方米),密度(t/m³),总质量(吨),品位,矿产质量(吨),回收率,可采储量(吨),平均厚度(米),顶深(米),底深(米)\n';

        results.strata.forEach(s => {
            csv += `${s.name},${s.type},${s.volume},${s.density},${s.mass},${s.grade},${s.mineralMass},${s.recoveryRate},${s.recoverableReserve},${s.averageThickness},${s.topDepth},${s.bottomDepth}\n`;
        });

        csv += `\n合计,,,,${results.totalMass},,,,\n`;

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reserve_calculation_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    updateStratumProperty(stratumId, property, value) {
        if (!this.modeler.data?.strata) return;

        const stratum = this.modeler.data.strata.find(s => s.id === stratumId);
        if (stratum) {
            if (!stratum.properties) {
                stratum.properties = {};
            }
            stratum.properties[property] = value;
            this.results = null;
        }
    }

    setGrade(stratumId, grade) {
        this.updateStratumProperty(stratumId, 'grade', grade);
    }

    setDensity(stratumId, density) {
        this.updateStratumProperty(stratumId, 'density', density);
    }

    setRecoveryRate(stratumId, rate) {
        this.updateStratumProperty(stratumId, 'recoveryRate', rate);
    }
}

export default ReserveCalculator;
