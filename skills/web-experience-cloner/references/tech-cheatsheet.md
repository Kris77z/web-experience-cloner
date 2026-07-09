# 技术识别速查表

仅凭**类名 / uniform 名 / 关键词**快速判定用了什么技术。来自 oryzo 实捕的 254 uniform + 63 着色器。

## 渲染管线 / 后处理
| 指纹 | 技术 | 备注 |
|------|------|------|
| `TAAMesh`/`viewProjectionMatrixJittered`/`prevViewProjectionMatrix`/`u_velocityTexture` | **TAA 时序抗锯齿** | 相机亚像素抖动 + 历史重投影；几乎所有 mesh 都包一层 |
| `u_edgesTexture`/`u_areaTexture`/`u_searchTexture` | **SMAA** | 形态学抗锯齿 |
| `u_luminosityThreshold`/`u_blurTexture0..4` | **Bloom** | 阈值提亮 + 多级降采样模糊 |
| `u_focusDistance`/`u_lensCoeff`/`u_maxCoC`/`u_cocTexture`/`u_bokehTexture` | **Bokeh 景深** | 基于深度的弥散圆 CoC |
| `u_blueNoiseTexture`/`u_ditherSeed`/`u_lmsTexture` | **蓝噪声抖动** | 消色带，LMS 色彩空间 |
| `u_vignette*`/`u_channelMixerR/G/B`/`u_tintColor`/`u_contrast` | **颜色分级 Final** | 暗角/通道混合/色调 |
| `aces` chunk / `toneMappingExposure` | **ACES 色调映射** | 线性→显示色 |

## 程序化 / 流体
| 指纹 | 技术 |
|------|------|
| `u_curlScale`/`u_curlStrength`/`u_vel`/`u_dissipations`/`u_drawFrom` + `noised()` 带导数 | **curl-noise 流体画笔**（ping-pong） |
| `u_thermalTexture`/`u_thermalRatio` + 渐变 LUT | **LUT 热成像 overlay** |
| `fbm`/`noised`/`hash` | 值/分形噪声 |

## 3D 资产 / 渲染
| 指纹 | 技术 |
|------|------|
| `Splats`/`SplatSorter`/`.sog` + `u_shNCodebook`/`u_meansLTexture`/`u_meansUTexture`/`u_quatsTexture`/`splatIndexTexture` | **3D 高斯泼溅（SOGS 压缩）** + WASM 深度排序 |
| `u_lightFieldSlicedTexture`/`u_lightFieldGridCount`/`u_imgBasedMVP` | **切片光场**（基于图像、视角相关） |
| `MSDFTextGeometry`/`u_textMap`/`u_pixelRange` | **MSDF 文字**（任意缩放锐利） |
| `u_goboMatrix`/`u_goboTexture`/`u_goboParams` | **Gobo 投影光**（光罩斑驳阴影） |
| `u_envTexture`/`u_brdfLut`/`sampleHarmonics` | **IBL + 球谐**（PBR 环境光） |
| `InstancedMesh`/`instanceMatrix`/per-instance `u_position` | **实例化**（粒子/重复物） |
| `u_extraBumpScale`/`perturbNormalArb`/HEIGHT 贴图 | 高度图法线扰动 |

## 动画 / 交互（多在 JS 非着色器）
| 指纹 | 技术 |
|------|------|
| `SecondOrderDynamics`（k1=z/πf, k2=1/(2πf)², k3=rz/2πf） | **二阶动力学**弹簧-阻尼（跟手/过冲） |
| `WiggleSystem`/`WiggleJoint` | 链式二阶 → 软体甩动 |
| `BrownianMotion` | 低频随机漂移（活物微动） |
| GSAP `SplitText` + `mask:"chars"` | 逐字翻涌揭示 |
| `LetterFlippers` | hover 方向驱动逐字翻牌 |
| 自研 `ScrollManager`/`ScrollPane`/`ScrollDomRange`/`StackScene` | 平滑滚动 + 滚动区间映射 0→1 |
| `RiveAnimation` + `.riv` + `State Machine` | Rive 矢量动画（WASM，状态机驱动） |

## 框架外壳
| 指纹 | 框架 |
|------|------|
| `/_astro/`、`data-astro-*` | Astro |
| `__NEXT_DATA__` | Next.js |
| `__NUXT__` | Nuxt |
| `.buf` 自定义二进制 | 自研几何/动画格式（非标准 glTF） |
