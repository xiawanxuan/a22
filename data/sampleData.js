export const sampleGeoData = {
    metadata: {
        name: "示例地质数据集",
        version: "1.0",
        coordinateSystem: "局部坐标系",
        unit: "米",
        area: {
            width: 500,
            depth: 400,
            height: 300
        }
    },

    strata: [
        {
            id: "strata-1",
            name: "表土层",
            type: "soil",
            color: "#8B7355",
            topDepth: 0,
            bottomDepth: 20,
            description: "第四系松散堆积层，主要由粉质黏土和砂土组成",
            properties: {
                岩性: "粉质黏土、砂土",
                厚度: "约20米",
                承载力: "120-180 kPa",
                渗透性: "中等",
                含水量: "25-35%"
            },
            topSurface: {
                type: "plane",
                elevation: 0
            },
            bottomSurface: {
                type: "plane",
                elevation: -20
            }
        },
        {
            id: "strata-2",
            name: "黏土层",
            type: "clay",
            color: "#A0522D",
            topDepth: 20,
            bottomDepth: 60,
            description: "粉质黏土，可塑-硬塑状态，局部夹粉土薄层",
            properties: {
                岩性: "粉质黏土",
                厚度: "约40米",
                承载力: "200-280 kPa",
                压缩模量: "8-12 MPa",
                内摩擦角: "12-18°"
            },
            topSurface: {
                type: "plane",
                elevation: -20
            },
            bottomSurface: {
                type: "plane",
                elevation: -60
            }
        },
        {
            id: "strata-3",
            name: "砂岩层",
            type: "sandstone",
            color: "#D2B48C",
            topDepth: 60,
            bottomDepth: 130,
            description: "中细粒砂岩，钙质胶结，中等风化，裂隙发育",
            properties: {
                岩性: "中细粒砂岩",
                厚度: "约70米",
                抗压强度: "30-50 MPa",
                弹性模量: "20-30 GPa",
                泊松比: "0.25-0.30"
            },
            topSurface: {
                type: "plane",
                elevation: -60
            },
            bottomSurface: {
                type: "plane",
                elevation: -130
            }
        },
        {
            id: "strata-4",
            name: "石灰岩层",
            type: "limestone",
            color: "#708090",
            topDepth: 130,
            bottomDepth: 220,
            description: "厚层石灰岩，质地坚硬，岩溶发育不均",
            properties: {
                岩性: "厚层石灰岩",
                厚度: "约90米",
                抗压强度: "60-90 MPa",
                弹性模量: "40-55 GPa",
                泊松比: "0.22-0.27"
            },
            topSurface: {
                type: "plane",
                elevation: -130
            },
            bottomSurface: {
                type: "plane",
                elevation: -220
            }
        },
        {
            id: "strata-5",
            name: "板岩层",
            type: "slate",
            color: "#2F4F4F",
            topDepth: 220,
            bottomDepth: 300,
            description: "变质板岩，片理发育，岩石完整",
            properties: {
                岩性: "板岩",
                厚度: "约80米",
                抗压强度: "80-120 MPa",
                弹性模量: "50-70 GPa",
                泊松比: "0.20-0.25"
            },
            topSurface: {
                type: "plane",
                elevation: -220
            },
            bottomSurface: {
                type: "plane",
                elevation: -300
            }
        }
    ],

    faults: [
        {
            id: "fault-1",
            name: "F1正断层",
            type: "normal",
            color: "#FF6B6B",
            description: "走向近南北，倾向东，倾角约70度的正断层",
            strike: 0,
            dipAngle: 70,
            dipDirection: 90,
            displacement: 25,
            properties: {
                断层类型: "正断层",
                走向: "近南北向",
                倾向: "东",
                倾角: "约70°",
                断距: "约25米",
                破碎带宽度: "5-8米",
                活动时代: "燕山期"
            },
            position: {
                x: 100,
                z: -200,
                width: 200,
                height: 250
            }
        },
        {
            id: "fault-2",
            name: "F2逆断层",
            type: "reverse",
            color: "#FFA726",
            description: "走向北西-南东，倾向北东，倾角约45度的逆断层",
            strike: 135,
            dipAngle: 45,
            dipDirection: 45,
            displacement: 15,
            properties: {
                断层类型: "逆断层",
                走向: "北西-南东向",
                倾向: "北东",
                倾角: "约45°",
                断距: "约15米",
                破碎带宽度: "3-5米",
                活动时代: "喜马拉雅期"
            },
            position: {
                x: 300,
                z: -200,
                width: 180,
                height: 200
            }
        }
    ],

    folds: [
        {
            id: "fold-1",
            name: "背斜构造",
            type: "anticline",
            color: "#66BB6A",
            description: "轴向近东西的宽缓背斜，核部地层较老",
            axis: {
                x: 250,
                z: -50,
                length: 300,
                direction: 0
            },
            amplitude: 40,
            wavelength: 200,
            properties: {
                褶皱类型: "背斜",
                轴向: "近东西向",
                幅度: "约40米",
                波长: "约200米",
                两翼倾角: "10-15°",
                核部地层: "砂岩层"
            }
        },
        {
            id: "fold-2",
            name: "向斜构造",
            type: "syncline",
            color: "#42A5F5",
            description: "轴向北东-南西的向斜构造，核部地层较新",
            axis: {
                x: 350,
                z: -250,
                length: 250,
                direction: 45
            },
            amplitude: 30,
            wavelength: 180,
            properties: {
                褶皱类型: "向斜",
                轴向: "北东-南西向",
                幅度: "约30米",
                波长: "约180米",
                两翼倾角: "8-12°",
                核部地层: "石灰岩层"
            }
        }
    ],

    drillings: [
        {
            id: "drill-1",
            name: "ZK1号钻孔",
            code: "ZK001",
            position: { x: 80, y: 0, z: -100 },
            totalDepth: 280,
            diameter: 0.15,
            completionDate: "2023-06-15",
            properties: {
                钻孔编号: "ZK001",
                孔口标高: "52.30 m",
                终孔深度: "280.00 m",
                钻孔直径: "150 mm",
                钻进方法: "回转钻进",
                岩芯采取率: "85%"
            },
            layers: [
                { name: "表土层", from: 0, to: 18, lithology: "粉质黏土" },
                { name: "黏土层", from: 18, to: 58, lithology: "粉质黏土" },
                { name: "砂岩层", from: 58, to: 125, lithology: "中细粒砂岩" },
                { name: "石灰岩层", from: 125, to: 210, lithology: "厚层石灰岩" },
                { name: "板岩层", from: 210, to: 280, lithology: "板岩" }
            ]
        },
        {
            id: "drill-2",
            name: "ZK2号钻孔",
            code: "ZK002",
            position: { x: 250, y: 0, z: -200 },
            totalDepth: 250,
            diameter: 0.15,
            completionDate: "2023-07-20",
            properties: {
                钻孔编号: "ZK002",
                孔口标高: "48.50 m",
                终孔深度: "250.00 m",
                钻孔直径: "150 mm",
                钻进方法: "回转钻进",
                岩芯采取率: "82%"
            },
            layers: [
                { name: "表土层", from: 0, to: 22, lithology: "粉质黏土" },
                { name: "黏土层", from: 22, to: 65, lithology: "粉质黏土" },
                { name: "砂岩层", from: 65, to: 140, lithology: "中细粒砂岩" },
                { name: "石灰岩层", from: 140, to: 250, lithology: "厚层石灰岩" }
            ]
        },
        {
            id: "drill-3",
            name: "ZK3号钻孔",
            code: "ZK003",
            position: { x: 420, y: 0, z: -150 },
            totalDepth: 300,
            diameter: 0.15,
            completionDate: "2023-08-10",
            properties: {
                钻孔编号: "ZK003",
                孔口标高: "55.80 m",
                终孔深度: "300.00 m",
                钻孔直径: "150 mm",
                钻进方法: "冲击回转钻进",
                岩芯采取率: "88%"
            },
            layers: [
                { name: "表土层", from: 0, to: 15, lithology: "粉质黏土、砂土" },
                { name: "黏土层", from: 15, to: 55, lithology: "粉质黏土" },
                { name: "砂岩层", from: 55, to: 120, lithology: "中细粒砂岩" },
                { name: "石灰岩层", from: 120, to: 200, lithology: "厚层石灰岩" },
                { name: "板岩层", from: 200, to: 300, lithology: "板岩" }
            ]
        },
        {
            id: "drill-4",
            name: "ZK4号钻孔",
            code: "ZK004",
            position: { x: 150, y: 0, z: -320 },
            totalDepth: 220,
            diameter: 0.15,
            completionDate: "2023-09-05",
            properties: {
                钻孔编号: "ZK004",
                孔口标高: "50.20 m",
                终孔深度: "220.00 m",
                钻孔直径: "150 mm",
                钻进方法: "回转钻进",
                岩芯采取率: "78%"
            },
            layers: [
                { name: "表土层", from: 0, to: 20, lithology: "粉质黏土" },
                { name: "黏土层", from: 20, to: 60, lithology: "粉质黏土" },
                { name: "砂岩层", from: 60, to: 150, lithology: "中细粒砂岩" },
                { name: "石灰岩层", from: 150, to: 220, lithology: "厚层石灰岩" }
            ]
        }
    ]
};
