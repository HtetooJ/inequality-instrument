import * as THREE from 'three'

const EASE = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}
const segment = (p: number, start: number, end: number) => EASE((p - start) / (end - start))
const fade = (p: number, start: number, end: number) => THREE.MathUtils.clamp((p - start) / (end - start), 0, 1)
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function lathe(points: [number, number][], material: THREE.Material, segments = 96) {
  return new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments), material)
}
function mat(color: number, roughness = .42, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}
function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, radial = 64) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radial), material)
}
function addSketchEdges(mesh: THREE.Mesh, opacity = .8, threshold = 28) {
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, threshold),
    new THREE.LineBasicMaterial({ color: 0x626862, transparent: true, opacity, depthWrite: false }),
  )
  lines.position.copy(mesh.position)
  lines.rotation.copy(mesh.rotation)
  lines.scale.copy(mesh.scale)
  lines.renderOrder = 2
  mesh.parent?.add(lines)
  return lines
}

export type PhinScene = {
  render: (progress: number, stillPose: boolean) => void
  resize: () => void
  dispose: () => void
}

export function createPhinScene(canvas: HTMLCanvasElement): PhinScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65))
  renderer.setClearColor(0xf3f0e9, 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.VSMShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf3f0e9)
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 140)
  const target = V(0, 1.2, 0)

  scene.add(new THREE.HemisphereLight(0xfffdf5, 0x96938d, 2.25))
  const key = new THREE.DirectionalLight(0xfff4df, 2.65)
  key.position.set(-4.5, 12, 5.5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -5.5
  key.shadow.camera.right = 5.5
  key.shadow.camera.top = 6
  key.shadow.camera.bottom = -4
  key.shadow.bias = -.00025
  key.shadow.normalBias = .018
  key.shadow.radius = 2
  key.shadow.blurSamples = 8
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xe7ece9, 1.2)
  fill.position.set(5, 4, -3)
  scene.add(fill)
  const rimLight = new THREE.DirectionalLight(0xffffff, .72)
  rimLight.position.set(1.5, 5, 4)
  scene.add(rimLight)

  const woodCanvas = document.createElement('canvas')
  woodCanvas.width = 1024
  woodCanvas.height = 1024
  const woodContext = woodCanvas.getContext('2d')
  if (woodContext) {
    const woodBase = woodContext.createRadialGradient(470, 430, 24, 512, 512, 700)
    woodBase.addColorStop(0, '#a87950')
    woodBase.addColorStop(.68, '#916741')
    woodBase.addColorStop(1, '#795438')
    woodContext.fillStyle = woodBase
    woodContext.fillRect(0, 0, woodCanvas.width, woodCanvas.height)
    for (let i = 0; i < 13; i++) {
      const radiusX = 28 + i * 34
      const radiusY = radiusX * (.68 + (i % 4) * .025)
      woodContext.beginPath()
      woodContext.ellipse(512, 512, radiusX, radiusY, -.08, 0, Math.PI * 2)
      woodContext.strokeStyle = i % 3 === 0 ? 'rgba(49,30,18,.042)' : 'rgba(255,231,201,.03)'
      woodContext.lineWidth = i % 4 === 0 ? 1.5 : 1
      woodContext.stroke()
    }
  }
  const woodTexture = new THREE.CanvasTexture(woodCanvas)
  woodTexture.colorSpace = THREE.SRGBColorSpace
  woodTexture.anisotropy = renderer.capabilities.getMaxAnisotropy()
  const tableWood = new THREE.MeshStandardMaterial({ map: woodTexture, color: 0xffffff, roughness: .7, metalness: 0 })
  const tabletop = new THREE.Mesh(new THREE.CylinderGeometry(2.42, 2.38, .16, 128), tableWood)
  tabletop.position.y = -.025
  tabletop.receiveShadow = true
  tabletop.castShadow = true
  scene.add(tabletop)
  const tableEdge = new THREE.Mesh(new THREE.TorusGeometry(2.39, .04, 12, 128), mat(0x684a32, .58))
  tableEdge.rotation.x = Math.PI / 2
  tableEdge.position.y = -.09
  tableEdge.castShadow = true
  scene.add(tableEdge)
  const legMaterial = mat(0x594634, .52)
  for (let index = 0; index < 3; index++) {
    const angle = index / 3 * Math.PI * 2 + Math.PI / 6
    const top = V(Math.cos(angle) * 1.18, -.13, Math.sin(angle) * 1.18)
    const bottom = V(Math.cos(angle) * 1.72, -1.27, Math.sin(angle) * 1.72)
    const axis = new THREE.Vector3().subVectors(bottom, top)
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.075, .11, axis.length(), 20), legMaterial)
    leg.position.copy(top).add(bottom).multiplyScalar(.5)
    leg.quaternion.setFromUnitVectors(V(0, 1, 0), axis.normalize())
    leg.castShadow = true
    leg.receiveShadow = true
    scene.add(leg)
  }
  const underside = cylinder(1.04, 1.18, .09, mat(0x705136, .62), 64)
  underside.position.y = -.16
  underside.castShadow = true
  scene.add(underside)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat(0xf3f0e9, .96))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.32
  floor.receiveShadow = true
  scene.add(floor)

  const aluminum = new THREE.MeshStandardMaterial({ color: 0xd8ddda, roughness: .34, metalness: .28 })
  const aluminumLight = new THREE.MeshStandardMaterial({ color: 0xe5e7e2, roughness: .3, metalness: .2 })
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x858c87, roughness: .4, metalness: .32 })
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xd7e0dc, roughness: .32, metalness: 0, transmission: .24, thickness: .18, transparent: true, opacity: .38, side: THREE.DoubleSide, flatShading: true })
  const glassRib = new THREE.MeshStandardMaterial({ color: 0x9ca9a3, roughness: .38, metalness: .02, transparent: true, opacity: .48, flatShading: true })
  const milkMaterial = mat(0xd9bd93, .38)
  const coffeeMaterial = new THREE.MeshPhysicalMaterial({ color: 0x392217, roughness: .18, metalness: 0, clearcoat: .82, clearcoatRoughness: .12, ior: 1.333 })
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x7d7e78, transparent: true, opacity: .075, depthWrite: false })

  const glassGroup = new THREE.Group()
  glassGroup.position.set(0, .05, 0)
  const glassBody = lathe([
    [0, .06], [.43, .06], [.48, .08], [.52, .16], [.52, 1.28], [.50, 1.34], [.48, 1.36],
    [.46, 1.33], [.46, .2], [0, .2],
  ], glass)
  glassBody.castShadow = false
  glassBody.receiveShadow = true
  glassGroup.add(glassBody)
  addSketchEdges(glassBody, .72, 18)
  const glassFoot = cylinder(.47, .45, .07, glassRib)
  glassFoot.position.y = .11
  glassGroup.add(glassFoot)
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.49, .028, 12, 96), glassRib)
  rim.rotation.x = Math.PI / 2
  rim.position.y = 1.34
  glassGroup.add(rim)
  const ribs = new THREE.Group()
  for (let i = 0; i < 52; i++) {
    const a = (i / 52) * Math.PI * 2
    const rib = cylinder(.015, .018, 1.06, glassRib, 8)
    rib.position.set(Math.cos(a) * .508, .69, Math.sin(a) * .508)
    ribs.add(rib)
  }
  glassGroup.add(ribs)
  const glassSeam = cylinder(.016, .016, 1.12, glassRib, 10)
  glassSeam.position.set(0, .72, .515)
  glassGroup.add(glassSeam)
  const milk = lathe([
    [0, 0], [.42, 0], [.45, .025], [.455, .25], [.45, .32], [.43, .35], [.34, .365], [.18, .372], [0, .374],
  ], milkMaterial, 64)
  milk.position.y = .07
  milk.scale.y = .001
  milk.castShadow = true
  glassGroup.add(milk)
  const coffee = lathe([
    [0, 0], [.43, 0], [.452, .025], [.454, .68], [.451, .77], [.436, .81],
    [.425, .825], [.39, .83], [.3, .834], [.18, .836], [0, .836],
  ], coffeeMaterial, 64)
  coffee.position.y = .44
  coffee.scale.y = .001
  coffee.castShadow = true
  glassGroup.add(coffee)
  const coffeeSurfaceMaterial = new THREE.MeshPhysicalMaterial({ color: 0x5b3822, roughness: .12, metalness: 0, clearcoat: 1, clearcoatRoughness: .08, ior: 1.333, side: THREE.DoubleSide })
  const coffeeSurfaceGeometry = new THREE.SphereGeometry(.424, 72, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  const coffeeSurface = new THREE.Mesh(coffeeSurfaceGeometry, coffeeSurfaceMaterial)
  coffeeSurface.scale.y = .05
  coffeeSurface.position.y = .44 + .821
  coffeeSurface.visible = false
  coffeeSurface.castShadow = false
  glassGroup.add(coffeeSurface)
  const surfaceHighlightMaterial = new THREE.MeshBasicMaterial({ color: 0xd2aa79, transparent: true, opacity: .22, depthWrite: false })
  const surfaceHighlights = new THREE.Group()
  for (const [radius, arc] of [[.25, Math.PI * 1.24], [.34, Math.PI * 1.1]] as const) {
    const ringGeometry = new THREE.TorusGeometry(radius, .0045, 5, 72, arc)
    const ring = new THREE.Mesh(ringGeometry, surfaceHighlightMaterial)
    ring.rotation.x = -Math.PI / 2
    ring.rotation.z = -.62
    ring.position.set(-.03, 0, .015)
    surfaceHighlights.add(ring)
  }
  surfaceHighlights.visible = false
  glassGroup.add(surfaceHighlights)
  scene.add(glassGroup)

  const basePart = new THREE.Group()
  const baseDish = lathe([
    [.025, .012], [.12, .012], [.22, .022], [.32, .046], [.42, .082], [.49, .112],
    [.56, .135], [.72, .137], [.755, .118], [.75, .082], [.71, .062], [.58, .064],
    [.49, .068], [.4, .052], [.3, .03], [.18, .016], [.025, .012],
  ], aluminumLight)
  baseDish.castShadow = true
  baseDish.receiveShadow = true
  basePart.add(baseDish)
  addSketchEdges(baseDish, .82, 18)
  const baseRim = new THREE.Mesh(new THREE.TorusGeometry(.69, .055, 12, 96), aluminum)
  baseRim.rotation.x = Math.PI / 2
  baseRim.position.y = .11
  basePart.add(baseRim)
  const perforations = new THREE.Group()
  const holeMaterial = mat(0x53605e, .82, .13)
  const holeCoords: [number, number][] = []
  for (const radius of [.10, .19, .28, .37, .44]) {
    const count = radius === .10 ? 8 : radius === .19 ? 12 : radius === .28 ? 16 : radius === .37 ? 20 : 24
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 + (radius % .2) * .4
      holeCoords.push([Math.cos(angle) * radius, Math.sin(angle) * radius])
    }
  }
  for (const [x, z] of holeCoords) {
    const r = .014
    const hole = new THREE.Mesh(new THREE.CircleGeometry(r, 16), holeMaterial)
    hole.rotation.x = -Math.PI / 2
    const radius = Math.hypot(x, z)
    hole.position.set(x, .014 + .12 * (radius / .52) ** 1.8, z)
    perforations.add(hole)
  }
  basePart.add(perforations)

  const chamberPart = new THREE.Group()
  const chamberBody = lathe([
    [.48, 0], [.51, .045], [.51, .87], [.535, .96], [.54, 1.01], [.505, 1.04], [.46, 1.01],
    [.455, .96], [.43, .14], [.4, .075], [.48, .06],
  ], aluminum)
  chamberBody.castShadow = true
  chamberBody.receiveShadow = true
  chamberPart.add(chamberBody)
  addSketchEdges(chamberBody, .82, 18)
  const chamberLip = new THREE.Mesh(new THREE.TorusGeometry(.52, .045, 12, 96), aluminumLight)
  chamberLip.rotation.x = Math.PI / 2
  chamberLip.position.y = .98
  chamberPart.add(chamberLip)
  const bottomRim = new THREE.Mesh(new THREE.TorusGeometry(.49, .024, 10, 96), darkMetal)
  bottomRim.rotation.x = Math.PI / 2
  bottomRim.position.y = .055
  chamberPart.add(bottomRim)
  const chamberPerforations = new THREE.Group()
  for (let ring = 0; ring < 4; ring++) {
    const radius = .11 + ring * .085
    const count = 8 + ring * 6
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (ring % 2) * .12
      const hole = new THREE.Mesh(new THREE.CircleGeometry(.012, 10), holeMaterial)
      hole.rotation.x = -Math.PI / 2
      hole.position.set(Math.cos(angle) * radius, .083, Math.sin(angle) * radius)
      chamberPerforations.add(hole)
    }
  }
  chamberPart.add(chamberPerforations)
  const chamberTabStem = cylinder(.075, .095, .12, aluminumLight, 24)
  chamberTabStem.rotation.z = Math.PI / 2
  chamberTabStem.position.set(.565, .96, 0)
  chamberPart.add(chamberTabStem)
  const chamberTab = new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 16), aluminumLight)
  chamberTab.scale.set(1.28, .28, .72)
  chamberTab.position.set(.68, .96, 0)
  chamberPart.add(chamberTab)

  const pressPart = new THREE.Group()
  const pressPlate = lathe([[0, .015], [.2, .018], [.39, .03], [.435, .045], [.42, .065], [.2, .057], [0, .052]], darkMetal)
  pressPart.add(pressPlate)
  addSketchEdges(pressPlate, .76, 18)
  const pressKnobStem = cylinder(.045, .055, .18, aluminumLight, 24)
  pressKnobStem.position.y = .15
  pressPart.add(pressKnobStem)
  const pressKnob = new THREE.Mesh(new THREE.SphereGeometry(.085, 24, 16), aluminumLight)
  pressKnob.scale.set(1, .72, 1)
  pressKnob.position.y = .26
  pressPart.add(pressKnob)
  for (let ring = 0; ring < 3; ring++) {
    const radius = .16 + ring * .105
    const count = 10 + ring * 8
    for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2 + (ring % 2) * .12
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.012, 10), holeMaterial)
    hole.rotation.x = -Math.PI / 2
    hole.position.set(Math.cos(angle) * radius, .046, Math.sin(angle) * radius)
    pressPart.add(hole)
    }
  }

  const lidPart = new THREE.Group()
  const lid = lathe([
    [0, .14], [.2, .135], [.38, .12], [.49, .085], [.535, .045], [.55, .02], [.53, 0],
    [.49, .015], [.42, .055], [.28, .095], [0, .105],
  ], aluminumLight)
  lid.castShadow = true
  lidPart.add(lid)
  addSketchEdges(lid, .78, 18)
  const lidEdge = new THREE.Mesh(new THREE.TorusGeometry(.535, .035, 12, 96), aluminum)
  lidEdge.rotation.x = Math.PI / 2
  lidEdge.position.y = .04
  lidPart.add(lidEdge)
  const lidButton = new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 16), aluminum)
  lidButton.scale.set(1, .5, 1)
  lidButton.position.y = .18
  lidPart.add(lidButton)
  for (const radius of [.22, .29, .36]) {
    const embossRing = new THREE.Mesh(new THREE.TorusGeometry(radius, .008, 6, 64), aluminum)
    embossRing.rotation.x = Math.PI / 2
    embossRing.position.y = .138 - (radius - .22) * .12
    lidPart.add(embossRing)
  }
  const lidTabStem = cylinder(.07, .09, .13, aluminum, 24)
  lidTabStem.rotation.z = Math.PI / 2
  lidTabStem.position.set(.55, .035, 0)
  lidPart.add(lidTabStem)
  const lidTab = new THREE.Mesh(new THREE.SphereGeometry(.19, 24, 16), aluminumLight)
  lidTab.scale.set(1.45, .3, .78)
  lidTab.position.set(.69, .035, 0)
  lidPart.add(lidTab)

  const parts = new THREE.Group()
  basePart.position.y = 1.47
  chamberPart.position.y = 1.57
  pressPart.position.y = 2.32
  lidPart.position.y = 2.61
  parts.add(basePart, chamberPart, pressPart, lidPart)
  scene.add(parts)

  // Dry grounds arrive as a small, source-free fall from above the frame.
  const grounds = new THREE.Group()
  const fallingGrains: { mesh: THREE.Mesh; target: THREE.Vector3; phase: number }[] = []
  const grainCount = 360
  const grainGeometry = new THREE.DodecahedronGeometry(.014, 0)
  const dryGrainMaterials = [0x65452d, 0x5a3d29, 0x513823, 0x60412a].map((color) =>
    new THREE.MeshStandardMaterial({ color, roughness: .9, flatShading: true }),
  )
  const dampGrainColors = [0x493321, 0x432f21, 0x3d2b1f, 0x463020].map((color) => new THREE.Color(color))
  const dryGrainColors = dryGrainMaterials.map((material) => material.color.clone())
  for (let i = 0; i < grainCount; i++) {
    const colorIndex = i % dryGrainMaterials.length
    const grainMaterial = dryGrainMaterials[colorIndex]
    const grain = new THREE.Mesh(grainGeometry, grainMaterial)
    const angle = i * 2.399
    const radius = .015 + Math.sqrt((i + .5) / grainCount) * .35
    const size = .82 + (i % 5) * .065
    const target = V(Math.cos(angle) * radius, 1.77 + ((i * 7) % 9) * .01, Math.sin(angle) * radius)
    grain.scale.set(size * (1 + (i % 3) * .08), size * (.27 + (i % 4) * .03), size * (.92 + (i % 2) * .08))
    grain.rotation.set(i * .37, i * .81, i * .23)
    grain.position.copy(target)
    grain.castShadow = true
    grounds.add(grain)
    fallingGrains.push({ mesh: grain, target, phase: (i / grainCount) * .82, colorIndex })
  }
  scene.add(grounds)

  const streamMaterial = new THREE.MeshBasicMaterial({ color: 0xb8e4e6, transparent: true, opacity: 0, depthWrite: false })
  const waterPath = new THREE.CatmullRomCurve3([
    V(0, 4.3, 0), V(.018, 3.78, -.006), V(-.014, 3.16, .008), V(0, 2.52, .02),
  ])
  const stream = new THREE.Mesh(new THREE.TubeGeometry(waterPath, 24, .031, 8, false), streamMaterial)
  stream.visible = false
  stream.renderOrder = 3
  scene.add(stream)
  const milkStreamMaterial = new THREE.MeshBasicMaterial({ color: 0xe5c9a5, transparent: true, opacity: 0, depthWrite: false })
  const milkStreamPath = new THREE.CatmullRomCurve3([V(0, 2.08, 0), V(.008, 1.64, 0), V(-.006, 1.05, .006), V(0, .29, .01)])
  const milkStream = new THREE.Mesh(new THREE.TubeGeometry(milkStreamPath, 20, .042, 8, false), milkStreamMaterial)
  milkStream.visible = false
  milkStream.renderOrder = 3
  scene.add(milkStream)
  const waterMaterial = new THREE.MeshStandardMaterial({ color: 0xb9e2e2, roughness: .26, transparent: true, opacity: .88, depthWrite: false })
  const waterSurface = cylinder(.42, .42, .018, waterMaterial, 48)
  waterSurface.position.set(0, 2.31, .02)
  waterSurface.visible = false
  waterSurface.castShadow = false
  scene.add(waterSurface)
  const drips = new THREE.Group()
  const dropletMaterial = mat(0x513824, .3)
  const droplet = new THREE.Mesh(new THREE.SphereGeometry(.065, 24, 18), dropletMaterial)
  droplet.scale.set(.92, 1.12, .92)
  droplet.visible = false
  drips.add(droplet)
  const dripThreadMaterial = new THREE.MeshBasicMaterial({ color: 0x513824, transparent: true, opacity: 0, depthWrite: false })
  const dripThreadPath = new THREE.CatmullRomCurve3([V(0, 1.49, 0), V(.012, 1.43, .008), V(.032, 1.37, .024)])
  const dripThread = new THREE.Mesh(new THREE.TubeGeometry(dripThreadPath, 8, .018, 6, false), dripThreadMaterial)
  dripThread.visible = false
  dripThread.renderOrder = 4
  scene.add(dripThread)
  scene.add(drips)

  const rippleMaterial = new THREE.MeshBasicMaterial({ color: 0xc1e4e3, transparent: true, opacity: 0, depthWrite: false })
  const ripples = new THREE.Group()
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.12, .008, 6, 48), rippleMaterial.clone())
    ring.rotation.x = -Math.PI / 2
    ring.visible = false
    ripples.add(ring)
  }
  scene.add(ripples)

  const softShadow = new THREE.Mesh(new THREE.CircleGeometry(.74, 64), shadowMaterial)
  softShadow.rotation.x = -Math.PI / 2
  softShadow.position.set(0, .052, 0)
  softShadow.scale.set(1.08, .72, 1)
  scene.add(softShadow)

  const fitCamera = () => {
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function render(progress: number, stillPose: boolean) {
    const p = THREE.MathUtils.clamp(progress, 0, 14)
    const mobile = canvas.clientWidth < 640
    const spin = stillPose ? 1 : segment(p, 0, 1)
    glassGroup.rotation.y = spin * Math.PI * 2
    const glassEnter = stillPose ? (p >= 1 ? 1 : 0) : segment(p, 0, 1)
    glassGroup.position.set(0, .05 + (1 - glassEnter) * .48, 0)
    glassGroup.visible = stillPose ? p >= 1 : p > .015
    shadowMaterial.opacity = glassGroup.visible ? .075 * glassEnter : 0
    const milkAmount = stillPose ? (p >= 3 ? 1 : p >= 2 ? .55 : 0) : segment(p, 2, 3)
    milk.scale.y = Math.max(.001, milkAmount)
    milk.position.y = .07
    milk.visible = milkAmount > .015
    const milkPour = stillPose ? (p >= 2 && p < 3 ? 1 : 0) : fade(p, 2.12, 2.4) * (1 - fade(p, 2.78, 2.98))
    milkStream.visible = milkPour > .04
    milkStreamMaterial.opacity = milkPour * .92
    let coffeeAmount = p >= 12 ? .88 : 0
    let settledDropCount = 0
    let activeDrop: { forming: number; falling: number; impacting: number; inAir: boolean } | null = null
    if (p >= 9 && p < 12) {
      if (stillPose) {
        coffeeAmount = .44
      } else {
        const elapsed = p - 9
        const spacing = 3 / 8
        const formDuration = .11
        const fallDuration = .13
        const riseDuration = .07
        for (let index = 0; index < 8; index++) {
          const start = index * spacing
          const impactAt = start + formDuration + fallDuration
          const riseEnd = impactAt + riseDuration
          if (elapsed >= riseEnd) {
            settledDropCount++
            continue
          }
          if (elapsed >= impactAt) {
            const impacting = EASE((elapsed - impactAt) / riseDuration)
            coffeeAmount = (settledDropCount + impacting) * .11
            activeDrop = { forming: 1, falling: 1, impacting, inAir: false }
            break
          }
          if (elapsed >= start) {
            const local = elapsed - start
            activeDrop = {
              forming: EASE(local / formDuration),
              falling: local < formDuration ? 0 : EASE((local - formDuration) / fallDuration),
              impacting: 0,
              inAir: true,
            }
            break
          }
        }
        coffeeAmount = Math.max(coffeeAmount, settledDropCount * .11)
      }
    }
    coffee.scale.y = Math.max(.001, coffeeAmount)
    coffee.position.y = .44
    coffee.visible = coffeeAmount > .015
    coffeeSurface.position.y = .44 + .836 * coffeeAmount - .015 * coffeeAmount
    coffeeSurface.scale.y = .05 * coffeeAmount
    coffeeSurface.visible = coffee.visible
    surfaceHighlights.position.y = .44 + .836 * coffeeAmount
    surfaceHighlights.visible = coffee.visible

    const baseSettle = stillPose ? (p >= 3 ? 1 : 0) : segment(p, 3, 3.4)
    const chamberSettle = stillPose ? (p >= 4 ? 1 : 0) : segment(p, 4, 4.4)
    basePart.position.y = 1.47 + (1 - baseSettle) * .92
    chamberPart.position.y = 1.57 + (1 - chamberSettle) * 1.38
    basePart.visible = p >= 3
    chamberPart.visible = p >= 4

    const grainAmount = stillPose ? (p >= 5 ? 1 : 0) : segment(p, 5, 5.72)
    grounds.visible = p >= 5
    const dampness = p < 7 ? 0 : fade(p, 7, 7.48)
    dryGrainMaterials.forEach((material, index) => material.color.copy(dryGrainColors[index]).lerp(dampGrainColors[index], dampness))
    fallingGrains.forEach(({ mesh, target: landing, phase }) => {
      const fall = THREE.MathUtils.clamp((grainAmount - phase) / .22, 0, 1)
      mesh.visible = grainAmount > phase
      if (mesh.visible) mesh.position.set(landing.x, THREE.MathUtils.lerp(3.65, landing.y, EASE(fall)), landing.z)
    })

    const pressDrop = stillPose ? (p >= 6 ? 1 : 0) : segment(p, 6, 6.62)
    pressPart.position.y = THREE.MathUtils.lerp(3.02, 1.74, pressDrop)
    pressPart.visible = p >= 6 && p < 8.28

    const pourStart = 7
    const pourEnd = 7.66
    const pour = p >= pourStart && p <= pourEnd
    const pourProgress = pour ? fade(p, pourStart, pourStart + .025) * (1 - fade(p, pourEnd - .025, pourEnd)) : 0
    stream.visible = pour
    streamMaterial.opacity = pourProgress * .96
    const bloomFill = stillPose
      ? (p >= 7 ? .78 : 0)
      : segment(p, 7, 7.66) * .78
    waterSurface.visible = p >= 7 && p < 8.3
    waterSurface.position.y = 1.82 + .49 * bloomFill
    waterSurface.scale.set(1, 1, 1)
    ripples.visible = stream.visible
    ripples.children.forEach((child, index) => {
      const ring = child as THREE.Mesh
      const phase = (pourProgress * 1.7 + index * .48) % 1
      ring.position.set(0, waterSurface.position.y + .012, .02)
      ring.scale.setScalar(.55 + phase * 1.4)
      const material = ring.material as THREE.MeshBasicMaterial
      material.opacity = stream.visible ? .34 * (1 - phase) : 0
      ring.visible = stream.visible
    })
    const coverSettle = stillPose ? (p >= 8 ? 1 : 0) : segment(p, 8.28, 8.56)
    lidPart.position.y = 2.61 + (1 - coverSettle) * .8
    lidPart.visible = p >= 8.28

    const sideIn = stillPose ? (p >= 9 ? 1 : 0) : segment(p, 7.8, 9)
    const sideOut = stillPose ? (p >= 12 ? 1 : 0) : segment(p, 12, 14)
    const rawOrbitAngle = .48 + .42 * segment(p, 0, 8) + .25 * sideIn + .96 * sideOut
    const dripStart = p >= 9 && p < 12
    const dripTime = p - 9
    droplet.visible = false
    dripThread.visible = false
    dripThreadMaterial.opacity = 0
    if (stillPose && dripStart) {
      droplet.visible = true
      droplet.position.set(.032, 1.37, .024)
      droplet.scale.set(.92, 1.12, .92)
    } else if (dripStart && activeDrop) {
      droplet.visible = true
      const surfaceBeforeImpact = glassGroup.position.y + coffee.position.y + .858 * (settledDropCount * .11)
      if (activeDrop.inAir) {
        const surfaceY = surfaceBeforeImpact + .055
        const dropY = THREE.MathUtils.lerp(1.37, surfaceY, activeDrop.falling)
        droplet.position.set(.032, dropY, .024)
        const stretch = .7 + activeDrop.forming * .55
        droplet.scale.set(.82 + activeDrop.forming * .1, stretch, .82 + activeDrop.forming * .1)
        dripThread.visible = activeDrop.falling === 0
        dripThreadMaterial.opacity = dripThread.visible ? .86 * activeDrop.forming : 0
      } else {
        droplet.position.set(.032, surfaceBeforeImpact + .035, .024)
        droplet.scale.set(.82, 1.12 * (1 - activeDrop.impacting * .22), .82)
      }
    }
    const finishProgress = stillPose ? (p >= 12 ? 1 : 0) : segment(p, 12, 14)
    const clearGlass = segment(finishProgress, 0, .18)
    const tableSettle = segment(finishProgress, .58, .9)
    const travelX = segment(finishProgress, .18, .66)
    const finalOrbitAngle = .48 + .42 + .25 + .96
    const sideOffset = 1.85 * travelX
    const sideX = Math.cos(finalOrbitAngle) * sideOffset
    const sideZ = -Math.sin(finalOrbitAngle) * sideOffset
    // Keep the brewer's tabletop path in world space; camera orbit must not drag it around the table.
    parts.position.set(sideX, THREE.MathUtils.lerp(.78 * clearGlass, -1.42, tableSettle), sideZ)
    grounds.position.copy(parts.position)

    // A smooth partial orbit lowers to a held side view for the drops, then rises as the phin leaves.
    const rawElevation = 22 + 7 * segment(p, 0, 1) + 4 * segment(p, 4, 6) - 21 * sideIn + 25 * sideOut
    const finishView = stillPose ? (p >= 12 ? 1 : 0) : segment(p, 12, 14)
    const orbitAngle = stillPose
      ? (p >= 12 ? 2.11 : p >= 9 ? 1.15 : .48)
      : rawOrbitAngle
    const elevation = stillPose
      ? (p >= 12 ? 58 : p >= 9 ? 12 : p < 1 ? 22 : 29)
      : rawElevation
    const lookY = stillPose
      ? (p < 1 ? .35 : p >= 12 ? .82 : 1.25)
      : .35 + .9 * segment(p, 0, 2) - .35 * sideOut + .2 * finishView
    // The camera eases toward the midpoint of the final glass-and-phin composition.
    target.set(sideX * .5, lookY, sideZ * .5)
    const storyRadius = mobile ? 12.4 : 8.8
    const openingRadius = mobile ? 15.2 : 12.5
    const introPushIn = stillPose ? (p >= 1 ? 1 : 0) : segment(p, 0, 1)
    const baseRadius = THREE.MathUtils.lerp(openingRadius, storyRadius, introPushIn)
    const finishDolly = stillPose ? (p >= 12 ? (mobile ? 1.36 : 1.16) : 1) : THREE.MathUtils.lerp(1, mobile ? 1.36 : 1.16, finishView)
    const orbitRadius = baseRadius * finishDolly
    const elevationRadians = THREE.MathUtils.degToRad(elevation)
    const horizontalRadius = Math.cos(elevationRadians) * orbitRadius
    camera.position.set(
      target.x + Math.sin(orbitAngle) * horizontalRadius,
      target.y + Math.sin(elevationRadians) * orbitRadius,
      target.z + Math.cos(orbitAngle) * horizontalRadius,
    )
    camera.lookAt(target)
    camera.updateMatrixWorld()
    renderer.render(scene, camera)
  }

  fitCamera()
  render(0, false)
  return {
    render,
    resize: fitCamera,
    dispose: () => {
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose?.())
        else mesh.material?.dispose?.()
      })
      woodTexture.dispose()
      renderer.dispose()
    },
  }
}
