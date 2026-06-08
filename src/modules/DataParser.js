class DataParser {
    constructor() {
        this.rawData = null;
        this.parsedData = {
            strata: [],
            faults: [],
            folds: [],
            drillings: [],
            metadata: null
        };
    }

    parse(rawData) {
        if (!rawData || typeof rawData !== 'object') {
            throw new Error('无效的地质数据格式');
        }

        this.rawData = rawData;
        this.parsedData.metadata = this.parseMetadata(rawData.metadata);
        this.parsedData.strata = this.parseStrata(rawData.strata || []);
        this.parsedData.faults = this.parseFaults(rawData.faults || []);
        this.parsedData.folds = this.parseFolds(rawData.folds || []);
        this.parsedData.drillings = this.parseDrillings(rawData.drillings || []);

        return this.parsedData;
    }

    validate(rawData) {
        const errors = [];

        if (!rawData) {
            errors.push('数据为空');
            return { valid: false, errors };
        }

        if (!rawData.strata || !Array.isArray(rawData.strata)) {
            errors.push('缺少地层数据或格式错误');
        } else if (rawData.strata.length === 0) {
            errors.push('地层数据为空');
        }

        if (rawData.strata) {
            rawData.strata.forEach((stratum, index) => {
                if (!stratum.id) {
                    errors.push(`地层 ${index} 缺少id`);
                }
                if (!stratum.name) {
                    errors.push(`地层 ${index} 缺少name`);
                }
                if (typeof stratum.topDepth === 'undefined') {
                    errors.push(`地层 ${stratum.id || index} 缺少topDepth`);
                }
                if (typeof stratum.bottomDepth === 'undefined') {
                    errors.push(`地层 ${stratum.id || index} 缺少bottomDepth`);
                }
            });
        }

        if (rawData.faults && Array.isArray(rawData.faults)) {
            rawData.faults.forEach((fault, index) => {
                if (!fault.id) {
                    errors.push(`断层 ${index} 缺少id`);
                }
                if (!fault.position) {
                    errors.push(`断层 ${fault.id || index} 缺少position`);
                }
            });
        }

        if (rawData.folds && Array.isArray(rawData.folds)) {
            rawData.folds.forEach((fold, index) => {
                if (!fold.id) {
                    errors.push(`褶皱 ${index} 缺少id`);
                }
            });
        }

        if (rawData.drillings && Array.isArray(rawData.drillings)) {
            rawData.drillings.forEach((drilling, index) => {
                if (!drilling.id) {
                    errors.push(`钻孔 ${index} 缺少id`);
                }
                if (!drilling.position) {
                    errors.push(`钻孔 ${drilling.id || index} 缺少position`);
                }
                if (typeof drilling.totalDepth === 'undefined') {
                    errors.push(`钻孔 ${drilling.id || index} 缺少totalDepth`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    parseMetadata(metadata) {
        if (!metadata) {
            return {
                name: '未命名地质数据',
                version: '1.0',
                coordinateSystem: '局部坐标系',
                unit: '米',
                area: { width: 500, depth: 400, height: 300 }
            };
        }

        return {
            name: metadata.name || '未命名地质数据',
            version: metadata.version || '1.0',
            coordinateSystem: metadata.coordinateSystem || '局部坐标系',
            unit: metadata.unit || '米',
            area: {
                width: metadata.area?.width || 500,
                depth: metadata.area?.depth || 400,
                height: metadata.area?.height || 300
            }
        };
    }

    parseStrata(strataData) {
        return strataData.map((stratum, index) => {
            const parsed = {
                id: stratum.id || `stratum-${index}`,
                name: stratum.name || `地层 ${index + 1}`,
                type: stratum.type || 'unknown',
                color: stratum.color || this.getColorByType(stratum.type, index),
                topDepth: stratum.topDepth ?? 0,
                bottomDepth: stratum.bottomDepth ?? 100,
                description: stratum.description || '',
                properties: stratum.properties || {},
                topSurface: stratum.topSurface || { type: 'plane', elevation: 0 },
                bottomSurface: stratum.bottomSurface || { type: 'plane', elevation: -100 },
                index
            };

            parsed.thickness = parsed.bottomDepth - parsed.topDepth;

            return parsed;
        });
    }

    parseFaults(faultsData) {
        return faultsData.map((fault, index) => ({
            id: fault.id || `fault-${index}`,
            name: fault.name || `断层 ${index + 1}`,
            type: fault.type || 'normal',
            color: fault.color || '#FF6B6B',
            description: fault.description || '',
            strike: fault.strike || 0,
            dipAngle: fault.dipAngle || 60,
            dipDirection: fault.dipDirection || 90,
            displacement: fault.displacement || 10,
            properties: fault.properties || {},
            position: {
                x: fault.position?.x ?? 0,
                z: fault.position?.z ?? 0,
                width: fault.position?.width ?? 200,
                height: fault.position?.height ?? 200
            },
            index
        }));
    }

    parseFolds(foldsData) {
        return foldsData.map((fold, index) => ({
            id: fold.id || `fold-${index}`,
            name: fold.name || `褶皱 ${index + 1}`,
            type: fold.type || 'anticline',
            color: fold.color || '#66BB6A',
            description: fold.description || '',
            axis: {
                x: fold.axis?.x ?? 0,
                z: fold.axis?.z ?? 0,
                length: fold.axis?.length ?? 200,
                direction: fold.axis?.direction ?? 0
            },
            amplitude: fold.amplitude || 20,
            wavelength: fold.wavelength || 150,
            properties: fold.properties || {},
            index
        }));
    }

    parseDrillings(drillingsData) {
        return drillingsData.map((drilling, index) => ({
            id: drilling.id || `drill-${index}`,
            name: drilling.name || `钻孔 ${index + 1}`,
            code: drilling.code || `ZK${String(index + 1).padStart(3, '0')}`,
            position: {
                x: drilling.position?.x ?? 0,
                y: drilling.position?.y ?? 0,
                z: drilling.position?.z ?? 0
            },
            totalDepth: drilling.totalDepth ?? 100,
            diameter: drilling.diameter ?? 0.15,
            completionDate: drilling.completionDate || '',
            properties: drilling.properties || {},
            layers: drilling.layers || [],
            index
        }));
    }

    getColorByType(type, index) {
        const colorMap = {
            soil: '#8B7355',
            clay: '#A0522D',
            sandstone: '#D2B48C',
            limestone: '#708090',
            slate: '#2F4F4F',
            granite: '#696969',
            basalt: '#36454F',
            shale: '#556B2F',
            coal: '#2F2F2F',
            aquifer: '#4FC3F7'
        };

        if (colorMap[type]) {
            return colorMap[type];
        }

        const defaultColors = [
            '#78909C', '#90A4AE', '#B0BEC5', '#CFD8DC',
            '#5D4037', '#6D4C41', '#8D6E63', '#A1887F'
        ];

        return defaultColors[index % defaultColors.length];
    }

    getStrata() {
        return this.parsedData.strata;
    }

    getFaults() {
        return this.parsedData.faults;
    }

    getFolds() {
        return this.parsedData.folds;
    }

    getDrillings() {
        return this.parsedData.drillings;
    }

    getMetadata() {
        return this.parsedData.metadata;
    }

    getAllLayers() {
        const layers = [];

        this.parsedData.strata.forEach(s => {
            layers.push({ id: s.id, name: s.name, type: 'stratum', color: s.color, visible: true });
        });

        this.parsedData.faults.forEach(f => {
            layers.push({ id: f.id, name: f.name, type: 'fault', color: f.color, visible: true });
        });

        this.parsedData.folds.forEach(f => {
            layers.push({ id: f.id, name: f.name, type: 'fold', color: f.color, visible: true });
        });

        this.parsedData.drillings.forEach(d => {
            layers.push({ id: d.id, name: d.name, type: 'drilling', color: '#FFD54F', visible: true });
        });

        return layers;
    }

    getModelCount() {
        return (
            this.parsedData.strata.length +
            this.parsedData.faults.length +
            this.parsedData.folds.length +
            this.parsedData.drillings.length
        );
    }

    getItemById(id) {
        const allItems = [
            ...this.parsedData.strata,
            ...this.parsedData.faults,
            ...this.parsedData.folds,
            ...this.parsedData.drillings
        ];

        return allItems.find(item => item.id === id);
    }

    getBounds() {
        const metadata = this.parsedData.metadata;
        if (metadata && metadata.area) {
            return {
                minX: 0,
                maxX: metadata.area.width,
                minY: -metadata.area.height,
                maxY: 0,
                minZ: -metadata.area.depth,
                maxZ: 0
            };
        }

        return {
            minX: 0,
            maxX: 500,
            minY: -300,
            maxY: 0,
            minZ: -400,
            maxZ: 0
        };
    }
}

export default DataParser;
