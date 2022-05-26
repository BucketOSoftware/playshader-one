/*
 * playshader-one demo
 *
 * IMPORTANT NOTE: this code is designed to be straightforward (no build
 * tooling, etc.), not to demonstrate best practices, whatever those are. Had
 * this been a real application, I would have written better organized code.
 */
const SKY_COLOR = 0x87ceeb
// Commonly used resolution for the hardware
const RESOLUTION = [320, 240]
let gl, scene, camera, sun, ambient

let loading, house

let lastTime = 0
let totalTime = 0

let needsResize = true
window.addEventListener('resize', () => (needsResize = true))

const itemsToLoad = 7
function loadingProgress(url, itemsLoaded, itemsTotal) {
    const percentage = (itemsLoaded / itemsToLoad) * 100
    // console.log('Loading:', url, itemsLoaded, itemsTotal)
    // console.log('Progress: %.0f%%', percentage)

    const bar = document.getElementById('progressbar')
    bar.style.width = `${percentage}%`
    if (percentage > 99.9) {
        bar.classList.add('loaded')
    }
}

function gltfLoadingProgress(progress) {
    const { lengthComputable, total, loaded } = progress
}

async function fetchShader(type) {
    const file = await fetch(`playshader.${type}`)
    return file.text()
}

async function main() {
    // TODO: check browser compatibility

    document.body.style.backgroundColor = `#${SKY_COLOR.toString(16)}`

    // Start loading resources

    const loader = new THREE.GLTFLoader()
    loader.manager.onStart = loadingProgress
    loader.manager.onProgress = loadingProgress

    const resourcesPromise = Promise.all([
        loader.loadAsync('nekostop.gltf'),
        ...['vert', 'frag'].map((t) => fetchShader(t)),
    ])

    // Don't show the progress bar unless the load time is noticeable
    setTimeout(() => {
        document.getElementById('progressbar').classList.remove('hidden')
    }, 500)

    // Create the shader

    const psx = new THREE.ShaderMaterial({
        lights: true,
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.lights,
            THREE.UniformsLib.fog,
            {
                resolution: { value: RESOLUTION },
                map: { value: null },
            },
        ]),
        defines: {
            // NO_DITHERING: 1,
        },
        glslVersion: THREE.GLSL3,
        vertexShader: null,
        fragmentShader: null,
    })

    gl = new THREE.WebGLRenderer({ antialias: false })
    gl.outputEncoding = THREE.sRGBEncoding
    gl.setSize(...RESOLUTION)
    // Ask the browser to upscale in a chunky fashion
    gl.domElement.style.imageRendering = 'pixelated'
    gl.domElement.imageSmoothingEnabled = false
    document.body.appendChild(gl.domElement)

    // Scene

    scene = new THREE.Scene()
    scene.fog = new THREE.Fog(SKY_COLOR, 15, 40)
    scene.background = new THREE.Color(SKY_COLOR)

    // Lighting

    const ambient = new THREE.AmbientLight(0x404040)
    scene.add(ambient)

    sun = new THREE.DirectionalLight(0xffffff, 3)
    sun.position.set(0, 20, 5)
    sun.target.position.set(0, 0, 0)
    scene.add(sun)

    // Camera
    {
        const fov = 60
        const aspect = RESOLUTION[0] / RESOLUTION[1]
        const near = 1
        const far = 1000
        camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
        // camera.aspect
        camera.position.set(0, 9, 14)
        camera.lookAt(0, 3, 0)
    }

    // Render something while we wait for assets to load

    const geometry = new THREE.BoxGeometry()
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    const loadModel = new THREE.Mesh(geometry, material)
    scene.add(loadModel)

    requestAnimationFrame(render)
    // Set up a UI for testing params
    const gui = new guify({
        title: 'playshader-one',
        theme: 'light',
        barMode: 'offset',
        opacity: 0.9,
    })
    gui.Register([
        // prettier-ignore
        {
            type: 'range', label: 'Sunlight',
            min: 0, max: 5, step: 0.25,
            object: sun, property: 'intensity',
        },
        // prettier-ignore
        {
            type: 'interval', label: 'Fog',
            min: 0, max: 40, precision: 0,
            initial: [scene.fog.near, scene.fog.far],
            onChange: (range) => {
                [scene.fog.near, scene.fog.far] = range
            },
        },
    ])

    // Wait on resources and render
    const [model, vert, frag] = await resourcesPromise
    psx.vertexShader = vert
    psx.fragmentShader = frag

    house = model.scene.getObjectByName('Scene')

    // Apply the PlayShader One material
    house.traverse((obj) => {
        if (obj.name === 'lantern') {
            // TODO: find a way to make it look like this is lighting up the lantern, perhaps?
            const ptLight = new THREE.PointLight(0x0033ff, 10, 2, 1)
            ptLight.position.copy(obj.position)
            obj.parent.add(ptLight)
        }

        if (obj.material) {
            const oldMaterial = obj.material
            obj.material = psx.clone()
            obj.material.uniforms.map.value = oldMaterial.map
            oldMaterial.dispose()
        }
    })

    scene.remove(loading)
    scene.add(model.scene)

    lastTime = performance.now()
    requestAnimationFrame(render)
}

const lightMoveSpeed = 50
function render(time) {
    // We don't really need to do this every time the event fires
    if (needsResize) {
        // We don't resize the canvas itself because we'd lose the low-res
        // appearance. Maybe there's a way to do that in glsl
        const aspect = RESOLUTION[0] / RESOLUTION[1]
        const h = window.innerHeight
        gl.domElement.style.width = h * aspect + 'px'
        gl.domElement.style.height = h + 'px'

        needsResize = false
    }

    let delta = (time - lastTime) / 1000
    if (delta > 1) {
        delta = 0.1
    }
    totalTime += delta
    lastTime = time

    if (house) {
        requestAnimationFrame(render)
        house.rotateY(Math.PI * 0.05 * delta)
        sun.position.x = Math.sin(totalTime / lightMoveSpeed) * 30
        sun.position.z = Math.cos(totalTime / lightMoveSpeed) * 5
    } else if (loading) {
        requestAnimationFrame(render)
        loading.rotateY(Math.PI * 2 * delta)
    }
    gl.render(scene, camera)
}

document.addEventListener('DOMContentLoaded', main)
