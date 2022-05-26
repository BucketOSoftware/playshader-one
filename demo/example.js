/*
 * playshader-one demo
 */

const SKY_COLOR = 0x87ceeb
const aspect = 4 / 3

// State

// Commonly used resolution for the hardware
const resolution = [320, 240]

let gl, scene, camera, sun, ambient
let house

let shaderEnabled = true
let playShader
let stockShaders = new Map()

let lastTime = 0
let totalTime = 0

let needsResize = true
window.addEventListener('resize', () => (needsResize = true))

// Promises-based async loading system for scripts and assets

let promises = {
    resolved: 0,
}

function pageActive() {
    return new Promise((resolve) => {
        if (document.readyState === 'interactive') {
            promises.resolved += 1
            resolve()
        } else {
            promises.resolved += 1
            document.addEventListener('DOMContentLoaded', () => resolve())
        }
    })
}

function loadScript(url) {
    return new Promise((resolve) => {
        console.log('loading!', url)

        const script = document.createElement('script')
        script.async = true
        script.src = url
        script.addEventListener('load', () => {
            promises.resolved += 1
            resolve()
        })
        document.head.appendChild(script)
    })
}

async function loadGltfLoader() {
    await promises.three
    await loadScript(
        'https://unpkg.com/three@0.140.2/examples/js/loaders/GLTFLoader.js'
    )
    promises.resolved += 1
}

async function loadModel() {
    await promises.gltfLoader
    const loader = new THREE.GLTFLoader()
    loader.manager.onStart = gltfLoadingProgress
    loader.manager.onProgress = gltfLoadingProgress
    const model = await loader.loadAsync('nekostop.gltf')
    promises.resolved += 1
    return model
}

async function fetchShader(type) {
    console.log('fetching', type)
    const file = await fetch(`playshader.${type}`)
    const text = await file.text()
    promises.resolved += 1
    return text
}

promises.ready = pageActive()
promises.three = loadScript(
    'https://unpkg.com/three@0.140.2/build/three.min.js'
)
promises.gltfLoader = loadGltfLoader()
promises.guify = loadScript('https://unpkg.com/guify@0.15.1/lib/guify.min.js')

// console.dir(promises.gltfLoader)
promises.model = loadModel()
promises.vertexShader = fetchShader('vert')
promises.fragmentShader = fetchShader('frag')

promises.iWorkedHardOnThisLoadingScreen = new Promise((resolve) => {
    setTimeout(() => {
        promises.resolved += 1
        resolve()
    }, 1500)
})

let resourcesLoaded = 0
let resourcesTotal = 7

function updateProgress() {
    console.dir(Object.keys(promises))
    const promisesTotal = Object.keys(promises).length - 1

    // One of the promises is incrementing `resolved` twice. How about that
    const progress =
        (resourcesLoaded + promises.resolved) /
        (resourcesTotal + promisesTotal - 1)

    const bar = document.getElementById('progressbar')
    bar.style.width = `${Math.round(progress * 100)}%`

    if (progress < 1) {
        setTimeout(updateProgress, 250)
    }
}

function gltfLoadingProgress(url, itemsLoaded, itemsTotal) {
    console.log('Loading:', url, itemsLoaded, itemsTotal)

    resourcesLoaded = itemsLoaded
}

main()

async function main() {
    updateProgress()

    console.log('preloading')
    console.log(document.readyState)

    document.body.className = 'loading'

    // Create the shader

    const [vert, frag] = await Promise.all([
        promises.vertexShader,
        promises.fragmentShader,
        promises.three,
        promises.iWorkedHardOnThisLoadingScreen,
    ])

    playShader = new THREE.ShaderMaterial({
        lights: true,
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.lights,
            THREE.UniformsLib.fog,
            {
                resolution: { value: resolution },
                map: { value: null },
            },
        ]),
        defines: {
            // NO_DITHERING: 1,
        },
        glslVersion: THREE.GLSL3,
        vertexShader: vert,
        fragmentShader: frag,
    })

    gl = new THREE.WebGLRenderer({ antialias: false })
    gl.outputEncoding = THREE.sRGBEncoding
    gl.setSize(...resolution)
    // Ask the browser to upscale in a chunky fashion
    gl.domElement.style.imageRendering = 'pixelated'
    gl.domElement.imageSmoothingEnabled = false
    const app = document.getElementById('app')
    app.prepend(gl.domElement)
    app.classList.remove('hidden')

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
        const near = 1
        const far = 1000
        camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
        // camera.aspect
        camera.position.set(0, 9, 14)
        camera.lookAt(0, 3, 0)
    }

    // Wait on resources and then render
    const model = await promises.model
    const bar = document.getElementById('progressbar')
    bar.style.width = '100%'

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
            const newMaterial = playShader
            stockShaders.set(obj, oldMaterial.clone())

            obj.material = newMaterial.clone()
            obj.material.uniforms.map.value = oldMaterial.map.clone()

            oldMaterial.dispose()
        }
    })

    scene.add(model.scene)

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
            type: 'checkbox', label: 'Enable Shader',
            initial: true,
            onChange: setPlayShaderEnabled
        },
        // prettier-ignore
        {
            type: 'select', label: 'Resolution',
            initial: resolution.join('×'),
            options: [
                // Common resolutions and one very unlikely one
                '256×224', '320×240', '512×240', '640×480', '1440×1080'
            ],
            onChange: setResolution
        },
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

    // And, go

    lastTime = performance.now()
    requestAnimationFrame(render)
    document.body.style.backgroundColor = `#${SKY_COLOR.toString(16)}`
    document.body.className = 'loaded'
}

const lightMoveSpeed = 50
function render(time) {
    // We don't really need to do this every time the event fires
    if (needsResize) {
        if (shaderEnabled) {
            // We don't resize the canvas itself because we'd lose the low-res
            // appearance. Maybe there's a way to do that in glsl
            gl.setSize(resolution[0], resolution[1])
            gl.setPixelRatio(1)

            const h = window.innerHeight

            gl.domElement.style.width = `${h * aspect}px`
            gl.domElement.style.height = `${h}px`
        } else {
            gl.setSize(window.innerHeight * aspect, window.innerHeight)
            gl.setPixelRatio(window.devicePixelRatio)
        }

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

function setResolution(res) {
    const [w, h] = res.split('×').map((n) => Number.parseInt(n))
    console.log(w, h)

    resolution[0] = w
    resolution[1] = h
    playShader.uniforms.resolution.value = resolution // necessary?
    needsResize = true
}

function setPlayShaderEnabled(enable) {
    shaderEnabled = enable

    // Seems like there'd be a better way to do this
    house.traverse((obj) => {
        const stock = stockShaders.get(obj)

        if (stock) {
            const oldShader = obj.material
            const newShader = enable ? playShader.clone() : stock

            // leave the old texture in the stock shader
            if (enable) {
                const texture = stock.map.clone()
                newShader.uniforms.map.value = texture
                newShader.needsUpdate = true
            }

            if (oldShader !== stock) {
                oldShader.dispose()
            }

            obj.material = newShader
        }
    })

    // The normal shader is shown at full res
    needsResize = true
}
