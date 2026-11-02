import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

type SceneOptions = {
  initialExploded: boolean
  onReady: () => void
  onError: () => void
}

type PartPose = { node: THREE.Object3D; baseY: number; assembledY: number; currentY: number }

export type PhinScene = {
  setExploded: (exploded: boolean) => void
  resize: () => void
  dispose: () => void
}

export function createPhinScene(canvas: HTMLCanvasElement, options: SceneOptions): PhinScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-.2, .2, .2, -.2, .01, 20)
  const expandedViewHeight = .22
  camera.zoom = options.initialExploded ? 1 : expandedViewHeight / .155
  let fitZoom = camera.zoom
  let targetY = options.initialExploded ? .094 : .048
  let controls: OrbitControls | null = null
  const aimCamera = () => {
    camera.top = expandedViewHeight / 2
    camera.bottom = -expandedViewHeight / 2
    const aspect = Math.max(.01, canvas.clientWidth / Math.max(1, canvas.clientHeight))
    camera.left = -expandedViewHeight * aspect / 2
    camera.right = expandedViewHeight * aspect / 2
    if (controls) {
      controls.target.y = targetY
      controls.update()
    } else {
      camera.position.set(.105, targetY + .205, .86)
      camera.up.set(0, 1, 0)
      camera.lookAt(0, targetY, 0)
    }
    camera.updateProjectionMatrix()
  }

  const ambient = new THREE.HemisphereLight(0xfffaf0, 0x756e63, 2.15)
  scene.add(ambient)
  const key = new THREE.DirectionalLight(0xfff8ed, 3.15)
  key.position.set(-.34, .58, .42)
  key.castShadow = true
  key.shadow.mapSize.set(1536, 1536)
  key.shadow.camera.left = -.2
  key.shadow.camera.right = .2
  key.shadow.camera.top = .42
  key.shadow.camera.bottom = -.18
  key.shadow.bias = -.00005
  key.shadow.normalBias = .012
  key.shadow.radius = 4
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xe8eff4, 2.0)
  fill.position.set(.42, .35, -.26)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xffffff, 1.25)
  rim.position.set(.15, .56, .24)
  scene.add(rim)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), .035)
  scene.environment = environment.texture

  const floorMaterial = new THREE.ShadowMaterial({ color: 0x28231d, opacity: .15 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = .001
  floor.receiveShadow = true
  scene.add(floor)

  let disposed = false
  let frame = 0
  let desiredExploded = options.initialExploded
  let transition: {
    fromPositions: Map<string, number>
    toPositions: Map<string, number>
    fromHeight: number
    toHeight: number
    fromTargetY: number
    toTargetY: number
    started: number
  } | null = null
  let parts = new Map<string, PartPose>()
  let model: THREE.Group | null = null
  let handleKeyDown: ((event: KeyboardEvent) => void) | null = null
  let resizeObserver: ResizeObserver | null = null
  const loader = new GLTFLoader()

  const targetPose = (exploded: boolean) => new Map([...parts].map(([name, part]) => [name, exploded ? part.baseY : part.assembledY]))
  const cameraPose = (exploded: boolean) => {
    const aspect = Math.max(.01, canvas.clientWidth / Math.max(1, canvas.clientHeight))
    const explodedHeight = Math.max(expandedViewHeight, .135 / aspect)
    const assembledZoom = Math.min(expandedViewHeight / .122, expandedViewHeight * aspect / .155)
    return { height: exploded ? explodedHeight : expandedViewHeight / assembledZoom, y: exploded ? .094 : .048 }
  }

  const startTransition = (exploded: boolean) => {
    const toPositions = targetPose(exploded)
    const toCamera = cameraPose(exploded)
    transition = {
      fromPositions: new Map([...parts].map(([name, part]) => [name, part.node.position.y])),
      toPositions,
      fromHeight: camera.zoom,
      toHeight: expandedViewHeight / toCamera.height,
      fromTargetY: targetY,
      toTargetY: toCamera.y,
      started: performance.now(),
    }
  }

  const resize = () => {
    const userZoom = fitZoom > 0 ? camera.zoom / fitZoom : 1
    const width = canvas.clientWidth || window.innerWidth
    const height = canvas.clientHeight || window.innerHeight
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height, false)
    aimCamera()
    fitZoom = expandedViewHeight / cameraPose(desiredExploded).height
    camera.zoom = fitZoom * userZoom
    camera.updateProjectionMatrix()
  }

  loader.load('/coffee-phin.glb', (gltf) => {
    if (disposed) return
    model = gltf.scene
    model.traverse((object) => {
      object.castShadow = true
      object.receiveShadow = true
      const namedPart = ['Lid', 'Tamper', 'Chamber', 'Plate'].includes(object.name)
      if (namedPart) {
        const assembledY = Number(object.userData.assembledY)
        parts.set(object.name, {
          node: object,
          baseY: object.position.y,
          assembledY: Number.isFinite(assembledY) ? assembledY : object.position.y,
          currentY: object.position.y,
        })
      }
      const materials = object instanceof THREE.Mesh ? (Array.isArray(object.material) ? object.material : [object.material]) : []
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          const name = material.name.toLowerCase()
          if (name.includes('polymer')) {
            material.metalness = .0
            material.roughness = .68
            material.envMapIntensity = .1
          } else if (name.includes('polished') || name.includes('wire')) {
            material.metalness = .96
            material.roughness = .14
            material.envMapIntensity = 1.7
          } else {
            material.metalness = .92
            material.roughness = .24
            material.envMapIntensity = 1.35
          }
        }
      }
    })
    if (parts.size !== 4) {
      options.onError()
      return
    }
    scene.add(model)
    const initial = targetPose(desiredExploded)
    for (const [name, part] of parts) {
      part.node.position.y = initial.get(name) ?? part.baseY
      part.currentY = part.node.position.y
    }
    const pose = cameraPose(desiredExploded)
    camera.zoom = expandedViewHeight / pose.height
    fitZoom = camera.zoom
    targetY = pose.y
    resize()
    controls = new OrbitControls(camera, canvas)
    controls.target.set(0, targetY, 0)
    controls.enableDamping = true
    controls.dampingFactor = .075
    controls.enablePan = false
    controls.minDistance = .35
    controls.maxDistance = 1.8
    controls.minZoom = .72
    controls.maxZoom = 2.8
    controls.minPolarAngle = .08
    controls.maxPolarAngle = Math.PI * .83
    controls.rotateSpeed = .72
    controls.zoomSpeed = .78
    handleKeyDown = (event) => {
      if (!controls) return
      const step = .13
      if (event.key === 'ArrowLeft') controls.rotateLeft(step)
      else if (event.key === 'ArrowRight') controls.rotateLeft(-step)
      else if (event.key === 'ArrowUp') controls.rotateUp(step)
      else if (event.key === 'ArrowDown') controls.rotateUp(-step)
      else return
      event.preventDefault()
      controls.update()
    }
    canvas.addEventListener('keydown', handleKeyDown)
    controls.update()
    options.onReady()
  }, undefined, () => {
    if (!disposed) options.onError()
  })

  const tick = (now: number) => {
    if (disposed) return
    controls?.update()
    if (transition) {
      const linear = Math.min(1, (now - transition.started) / 640)
      const eased = 1 - Math.pow(1 - linear, 5)
      for (const [name, part] of parts) {
        const from = transition.fromPositions.get(name) ?? part.baseY
        const to = transition.toPositions.get(name) ?? part.baseY
        part.node.position.y = THREE.MathUtils.lerp(from, to, eased)
      }
      const nextTargetY = THREE.MathUtils.lerp(transition.fromTargetY, transition.toTargetY, eased)
      if (controls) {
        const targetDelta = nextTargetY - targetY
        controls.target.y += targetDelta
        camera.position.y += targetDelta
      }
      targetY = nextTargetY
      camera.zoom = THREE.MathUtils.lerp(transition.fromHeight, transition.toHeight, eased)
      camera.updateProjectionMatrix()
      if (linear >= 1) {
        transition = null
        fitZoom = camera.zoom
      }
    }
    renderer.render(scene, camera)
    frame = window.requestAnimationFrame(tick)
  }
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  window.addEventListener('resize', resize)
  resize()
  frame = window.requestAnimationFrame(tick)

  return {
    setExploded(exploded) {
      if (desiredExploded === exploded) return
      desiredExploded = exploded
      if (parts.size) startTransition(exploded)
    },
    resize,
    dispose() {
      disposed = true
      window.cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', resize)
      if (handleKeyDown) canvas.removeEventListener('keydown', handleKeyDown)
      controls?.dispose()
      if (model) {
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose()
            const materials = Array.isArray(object.material) ? object.material : [object.material]
            for (const material of materials) {
              for (const value of Object.values(material)) {
                if (value instanceof THREE.Texture) value.dispose()
              }
              material.dispose()
            }
          }
        })
      }
      environment.dispose()
      pmrem.dispose()
      floor.geometry.dispose()
      floorMaterial.dispose()
      renderer.dispose()
    },
  }
}
