import Renderer from './modules/Renderer.js';
import DataParser from './modules/DataParser.js';
import GeoModeler from './modules/GeoModeler.js';
import InteractionController from './modules/InteractionController.js';
import SectionAnalyzer from './modules/SectionAnalyzer.js';
import ReserveCalculator from './modules/ReserveCalculator.js';
import ARPreviewer from './modules/ARPreviewer.js';
import { sampleGeoData } from '../data/sampleData.js';

class GeoVisualizationApp {
    constructor() {
        this.renderer = null;
        this.dataParser = null;
        this.modeler = null;
        this.controller = null;
        this.sectionAnalyzer = null;
        this.reserveCalculator = null;
        this.arPreviewer = null;

        this.container = null;
        this.propertyPanel = null;
        this.propertyContent = null;
        this.layerList = null;
        this.fpsCounter = null;
        this.coordInfo = null;
        this.modelCountEl = null;

        this.layers = [];
        this.selectedItem = null;

        this.init();
    }

    init() {
        console.log('地质可视化系统正在初始化...');

        this.initDOM();
        this.initModules();
        this.initUIEvents();
        this.loadSampleData();
        this.start();

        console.log('地质可视化系统初始化完成！');
    }

    initDOM() {
        this.container = document.getElementById('three-container');
        this.propertyPanel = document.getElementById('property-panel');
        this.propertyContent = document.getElementById('property-content');
        this.layerList = document.getElementById('layer-list');
        this.fpsCounter = document.getElementById('fps-counter');
        this.coordInfo = document.getElementById('coord-info');
        this.modelCountEl = document.getElementById('model-count');
    }

    initModules() {
        this.renderer = new Renderer();
        this.renderer.init(this.container);

        this.dataParser = new DataParser();

        this.modeler = new GeoModeler(this.renderer.getScene());

        this.controller = new InteractionController();
        this.controller.init(this.renderer, this.modeler);

        this.sectionAnalyzer = new SectionAnalyzer(this.modeler, this.renderer);

        this.reserveCalculator = new ReserveCalculator(this.modeler);

        this.arPreviewer = new ARPreviewer(this.renderer, this.modeler);

        this.renderer.addOnRenderCallback(delta => {
            this.controller.update(delta);
            this.updateStats();
        });
    }

    initUIEvents() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.controller.setViewPreset(view);
            });
        });

        document.getElementById('global-opacity').addEventListener('input', e => {
            const opacity = parseFloat(e.target.value);
            this.modeler.setGlobalOpacity(opacity);
        });

        document.getElementById('show-wireframe').addEventListener('change', e => {
            this.modeler.setWireframe(e.target.checked);
        });

        document.getElementById('show-grid').addEventListener('change', e => {
            this.modeler.setGridVisible(e.target.checked);
        });

        document.getElementById('show-axes').addEventListener('change', e => {
            this.modeler.setAxesVisible(e.target.checked);
        });

        document.getElementById('close-property').addEventListener('click', () => {
            this.closePropertyPanel();
        });

        document.getElementById('btn-help').addEventListener('click', () => {
            document.getElementById('help-modal').classList.add('active');
        });

        document.getElementById('close-help').addEventListener('click', () => {
            document.getElementById('help-modal').classList.remove('active');
        });

        document.getElementById('help-modal').addEventListener('click', e => {
            if (e.target.classList.contains('modal-overlay')) {
                document.getElementById('help-modal').classList.remove('active');
            }
        });

        document.getElementById('btn-export').addEventListener('click', () => {
            this.exportModel();
        });

        document.getElementById('btn-fullscreen').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        this.controller.onPick((data, point) => {
            if (data) {
                this.showProperty(data);
            } else {
                this.closePropertyPanel();
            }
        });

        this.controller.onCoordUpdate(point => {
            this.updateCoordDisplay(point);
        });

        this.initSectionEvents();
        this.initReserveEvents();
        this.initAREvents();
    }

    loadSampleData() {
        try {
            const validation = this.dataParser.validate(sampleGeoData);
            if (!validation.valid) {
                console.warn('数据验证警告:', validation.errors);
            }

            const parsedData = this.dataParser.parse(sampleGeoData);

            this.modeler.buildAll(parsedData);

            this.layers = this.dataParser.getAllLayers();
            this.buildLayerList();

            this.modelCountEl.textContent = `模型数量: ${this.dataParser.getModelCount()}`;

            this.controller.setViewPreset('reset');

        } catch (error) {
            console.error('加载数据失败:', error);
            alert('加载地质数据失败: ' + error.message);
        }
    }

    buildLayerList() {
        this.layerList.innerHTML = '';

        const typeLabels = {
            stratum: '地层',
            fault: '断层',
            fold: '褶皱',
            drilling: '钻孔'
        };

        const typeOrder = ['stratum', 'fault', 'fold', 'drilling'];
        const grouped = {};

        typeOrder.forEach(type => {
            grouped[type] = this.layers.filter(l => l.type === type);
        });

        typeOrder.forEach(type => {
            if (grouped[type].length === 0) return;

            const typeHeader = document.createElement('div');
            typeHeader.className = 'layer-type-header';
            typeHeader.style.cssText = `
                font-size: 11px;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 8px 4px 4px;
                font-weight: 600;
            `;
            typeHeader.textContent = typeLabels[type];
            this.layerList.appendChild(typeHeader);

            grouped[type].forEach(layer => {
                const item = document.createElement('div');
                item.className = 'layer-item';
                item.dataset.id = layer.id;
                item.dataset.type = layer.type;

                item.innerHTML = `
                    <div class="layer-color" style="background: ${layer.color}"></div>
                    <span class="layer-name">${layer.name}</span>
                    <div class="layer-toggle active" data-id="${layer.id}"></div>
                `;

                const toggle = item.querySelector('.layer-toggle');
                toggle.addEventListener('click', e => {
                    e.stopPropagation();
                    this.toggleLayer(layer.id, toggle);
                });

                item.addEventListener('click', () => {
                    this.focusLayer(layer.id);
                });

                this.layerList.appendChild(item);
            });
        });

        this.layerList.scrollTop = 0;
    }

    toggleLayer(id, toggleEl) {
        const isActive = toggleEl.classList.contains('active');
        toggleEl.classList.toggle('active', !isActive);

        this.modeler.setLayerVisible(id, !isActive);

        const layerItem = toggleEl.closest('.layer-item');
        if (layerItem) {
            layerItem.style.opacity = isActive ? '0.5' : '1';
        }
    }

    focusLayer(id) {
        const item = this.dataParser.getItemById(id);
        if (item) {
            this.showProperty(item);
            this.modeler.highlightObject(id);
        }
    }

    getCategoryType(data) {
        if (data.type && ['stratum', 'fault', 'fold', 'drilling'].includes(data.type)) {
            return data.type;
        }

        if (data.topDepth !== undefined && data.bottomDepth !== undefined) {
            return 'stratum';
        }
        if (data.dipAngle !== undefined && data.strike !== undefined) {
            return 'fault';
        }
        if (data.amplitude !== undefined && data.wavelength !== undefined) {
            return 'fold';
        }
        if (data.totalDepth !== undefined || data.layers !== undefined) {
            return 'drilling';
        }

        if (data.data) {
            return this.getCategoryType(data.data);
        }

        return 'unknown';
    }

    showProperty(data) {
        this.selectedItem = data;

        const categoryType = this.getCategoryType(data);
        const typeLabels = {
            stratum: '地层',
            fault: '断层',
            fold: '褶皱',
            drilling: '钻孔'
        };

        const typeLabel = typeLabels[categoryType] || '未知';
        const itemData = data.data || data;
        data._categoryType = categoryType;

        let propertiesHTML = '';
        const properties = itemData.properties || {};

        if (Object.keys(properties).length > 0) {
            propertiesHTML = `
                <div class="property-group">
                    <div class="property-group-title">详细属性</div>
                    ${Object.entries(properties).map(([key, value]) => `
                        <div class="property-row">
                            <span class="property-label">${key}</span>
                            <span class="property-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        let basicInfoHTML = '';

        if (categoryType === 'stratum') {
            basicInfoHTML = `
                <div class="property-group">
                    <div class="property-group-title">基本信息</div>
                    <div class="property-row">
                        <span class="property-label">类型</span>
                        <span class="property-value">${typeLabel}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">岩性</span>
                        <span class="property-value">${itemData.type || '-'}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">顶界深度</span>
                        <span class="property-value">${itemData.topDepth} m</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">底界深度</span>
                        <span class="property-value">${itemData.bottomDepth} m</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">厚度</span>
                        <span class="property-value">${itemData.thickness || (itemData.bottomDepth - itemData.topDepth)} m</span>
                    </div>
                </div>
            `;
        } else if (categoryType === 'fault') {
            basicInfoHTML = `
                <div class="property-group">
                    <div class="property-group-title">基本信息</div>
                    <div class="property-row">
                        <span class="property-label">类型</span>
                        <span class="property-value">${typeLabel}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">断层类型</span>
                        <span class="property-value">${itemData.type === 'normal' ? '正断层' : itemData.type === 'reverse' ? '逆断层' : itemData.type || '-'}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">走向</span>
                        <span class="property-value">${itemData.strike}°</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">倾角</span>
                        <span class="property-value">${itemData.dipAngle}°</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">断距</span>
                        <span class="property-value">${itemData.displacement} m</span>
                    </div>
                </div>
            `;
        } else if (categoryType === 'fold') {
            basicInfoHTML = `
                <div class="property-group">
                    <div class="property-group-title">基本信息</div>
                    <div class="property-row">
                        <span class="property-label">类型</span>
                        <span class="property-value">${typeLabel}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">褶皱类型</span>
                        <span class="property-value">${itemData.type === 'anticline' ? '背斜' : itemData.type === 'syncline' ? '向斜' : itemData.type || '-'}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">幅度</span>
                        <span class="property-value">${itemData.amplitude} m</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">波长</span>
                        <span class="property-value">${itemData.wavelength} m</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">轴向长度</span>
                        <span class="property-value">${itemData.axis?.length || '-'} m</span>
                    </div>
                </div>
            `;
        } else if (categoryType === 'drilling') {
            basicInfoHTML = `
                <div class="property-group">
                    <div class="property-group-title">基本信息</div>
                    <div class="property-row">
                        <span class="property-label">类型</span>
                        <span class="property-value">${typeLabel}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">钻孔编号</span>
                        <span class="property-value">${itemData.code || '-'}</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">总深度</span>
                        <span class="property-value">${itemData.totalDepth} m</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">直径</span>
                        <span class="property-value">${(itemData.diameter * 1000).toFixed(0)} mm</span>
                    </div>
                    <div class="property-row">
                        <span class="property-label">坐标</span>
                        <span class="property-value">(${itemData.position?.x?.toFixed(1)}, ${itemData.position?.z?.toFixed(1)})</span>
                    </div>
                </div>
            `;

            if (itemData.layers && itemData.layers.length > 0) {
                propertiesHTML += `
                    <div class="property-group">
                        <div class="property-group-title">地层分层</div>
                        ${itemData.layers.map(layer => `
                            <div class="property-row">
                                <span class="property-label">${layer.name}</span>
                                <span class="property-value">${layer.from} - ${layer.to} m</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        let descriptionHTML = '';
        if (itemData.description) {
            descriptionHTML = `
                <div class="property-group">
                    <div class="property-group-title">描述</div>
                    <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">
                        ${itemData.description}
                    </p>
                </div>
            `;
        }

        const itemColor = itemData.color || data.color || '#666';

        this.propertyContent.innerHTML = `
            <div class="property-header">
                <h4>${itemData.name || data.name}</h4>
                <div class="property-type" style="
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 4px;
                    background: ${itemColor};
                    color: #fff;
                    font-size: 11px;
                ">${typeLabel}</div>
            </div>
            ${basicInfoHTML}
            ${descriptionHTML}
            ${propertiesHTML}
        `;
    }

    closePropertyPanel() {
        this.selectedItem = null;
        this.modeler.clearAllHighlights();

        this.propertyContent.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;">
                    <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                <p>点击地质体查看属性</p>
            </div>
        `;
    }

    updateCoordDisplay(point) {
        if (!point) return;

        const x = point.x.toFixed(1);
        const y = (-point.y).toFixed(1);
        const z = Math.abs(point.z).toFixed(1);

        this.coordInfo.textContent = `X: ${x} | Y: ${y} | Z: ${z}`;
    }

    updateStats() {
        const fps = this.renderer.getFps();
        if (fps > 0) {
            this.fpsCounter.textContent = `${fps} FPS`;
        }
    }

    exportModel() {
        const btn = document.getElementById('btn-export');
        btn.style.opacity = '0.5';
        btn.style.cursor = 'wait';

        this.controller.downloadModel('glb')
            .then(() => {
                console.log('模型导出成功');
            })
            .catch(error => {
                console.error('模型导出失败:', error);
                alert('模型导出失败: ' + error.message);
            })
            .finally(() => {
                btn.style.opacity = '';
                btn.style.cursor = '';
            });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('全屏错误:', err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    initSectionEvents() {
        document.getElementById('enable-section').addEventListener('change', e => {
            if (e.target.checked) {
                this.sectionAnalyzer.enable();
            } else {
                this.sectionAnalyzer.disable();
            }
        });

        document.getElementById('section-type').addEventListener('change', e => {
            this.sectionAnalyzer.setSectionType(e.target.value);
        });

        document.getElementById('section-pos-x').addEventListener('input', e => {
            const x = parseFloat(e.target.value);
            const y = this.sectionAnalyzer.currentSection.position.y;
            const z = this.sectionAnalyzer.currentSection.position.z;
            this.sectionAnalyzer.setSectionPosition(x, y, z);
        });

        document.getElementById('section-pos-y').addEventListener('input', e => {
            const y = parseFloat(e.target.value);
            const x = this.sectionAnalyzer.currentSection.position.x;
            const z = this.sectionAnalyzer.currentSection.position.z;
            this.sectionAnalyzer.setSectionPosition(x, y, z);
        });

        document.getElementById('section-rotation').addEventListener('input', e => {
            const angle = parseFloat(e.target.value) * Math.PI / 180;
            this.sectionAnalyzer.setSectionRotation(angle);
        });

        document.getElementById('btn-export-section').addEventListener('click', () => {
            this.sectionAnalyzer.exportSectionData();
        });
    }

    initReserveEvents() {
        document.getElementById('btn-calculate-reserve').addEventListener('click', () => {
            this.calculateReserves();
        });

        document.getElementById('btn-export-json').addEventListener('click', () => {
            if (this.reserveCalculator.getResults()) {
                this.reserveCalculator.exportResults();
            } else {
                alert('请先计算储量');
            }
        });

        document.getElementById('btn-export-csv').addEventListener('click', () => {
            if (this.reserveCalculator.getResults()) {
                this.reserveCalculator.exportCSV();
            } else {
                alert('请先计算储量');
            }
        });
    }

    initAREvents() {
        setTimeout(() => {
            const arStatusEl = document.getElementById('ar-status');
            if (this.arPreviewer.arSupported) {
                arStatusEl.textContent = '设备支持: WebXR AR';
                arStatusEl.classList.add('supported');
                document.getElementById('ar-mode').value = 'xr';
            } else {
                arStatusEl.textContent = '设备支持: 方向感应模式';
                arStatusEl.classList.add('unsupported');
                document.getElementById('ar-mode').value = 'orientation';
            }
        }, 1000);

        document.getElementById('btn-start-ar').addEventListener('click', () => {
            const btn = document.getElementById('btn-start-ar');
            if (this.arPreviewer.isARActive()) {
                this.arPreviewer.stopAR();
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="23 7 16 12 23 17 23 7"/>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                    启动AR预览
                `;
            } else {
                const mode = document.getElementById('ar-mode').value;
                this.arPreviewer.startAR(mode);
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                    退出AR预览
                `;
            }
        });

        document.getElementById('ar-scale').addEventListener('input', e => {
            const scale = parseFloat(e.target.value);
            this.arPreviewer.setARScale(scale);
        });

        this.arPreviewer.addOnARStateChangeCallback((active, mode) => {
            const btn = document.getElementById('btn-start-ar');
            if (active) {
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                    退出AR预览
                `;
            } else {
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="23 7 16 12 23 17 23 7"/>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                    启动AR预览
                `;
            }
        });
    }

    calculateReserves() {
        const resultContainer = document.getElementById('reserve-result');
        resultContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 12px; text-align: center;">计算中...</p>';

        setTimeout(() => {
            try {
                const results = this.reserveCalculator.calculateAll();
                this.showReserveResults(results);
            } catch (error) {
                console.error('储量计算失败:', error);
                resultContainer.innerHTML = `<p style="color: #f44; font-size: 12px; text-align: center;">计算失败: ${error.message}</p>`;
            }
        }, 100);
    }

    showReserveResults(results) {
        const resultContainer = document.getElementById('reserve-result');

        let html = '';
        results.strata.forEach(stratum => {
            html += `
                <div class="reserve-item">
                    <div class="reserve-item-header">
                        <div class="reserve-item-color" style="background: ${stratum.color}"></div>
                        <span class="reserve-item-name">${stratum.name}</span>
                    </div>
                    <div class="reserve-item-props">
                        <span>体积:</span>
                        <span>${stratum.volume.toFixed(2)} m³</span>
                        <span>质量:</span>
                        <span>${stratum.mass.toFixed(2)} t</span>
                        <span>厚度:</span>
                        <span>${stratum.averageThickness.toFixed(1)} m</span>
                        <span>密度:</span>
                        <span>${stratum.density} t/m³</span>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="reserve-summary">
                总质量: ${results.totalMass.toFixed(2)} 吨
            </div>
        `;

        resultContainer.innerHTML = html;
    }

    start() {
        this.renderer.animate();
    }

    stop() {
        this.renderer.stop();
    }

    dispose() {
        this.stop();

        if (this.controller) {
            this.controller.dispose();
        }

        if (this.modeler) {
            this.modeler.clear();
        }

        if (this.renderer) {
            this.renderer.dispose();
        }

        this.renderer = null;
        this.dataParser = null;
        this.modeler = null;
        this.controller = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new GeoVisualizationApp();
});

export default GeoVisualizationApp;
