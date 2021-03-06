/*
 * playshader-one demo
 */

const SKY_COLOR = 0x87ceeb
const NIGHT_SKY_COLOR = 0x001133
// Hardcode a period-accurate aspect ratio
const aspect = 4 / 3

const scripts = {
    three: 'https://unpkg.com/three@0.141/build/three.min.js',
    gltfLoader:
        'https://unpkg.com/three@0.141/examples/js/loaders/GLTFLoader.js',
    guify: 'https://unpkg.com/guify@0.15.1/lib/guify.min.js',
}

// State


let gl, scene, camera, sun, ambient
let house
let sunColors = {}

let shaderEnabled = true
let playShader
let stockShaders = new Map()

let lastTime = 0
let totalTime = 0

let needsResize = true
window.addEventListener('resize', () => (needsResize = true))

// Interface for user parameters
let options = {
    dayCycle: true,

    // Commonly used resolution for the hardware
    _renderWidth: 320,
    _renderHeight: 240,
    
    get resolution() {
        return [this._renderWidth, this._renderHeight]
    },

    get resolutionString() {
        return this.resolution.join('×');
    },

    set resolutionString(str) {
        const [w, h] = str.split('×').map((n) => Number.parseInt(n))
    
        this._renderWidth = w
        this._renderHeight = h
        if (playShader) {
            playShader.uniforms.resolution.value = [w, h]
        }
        needsResize = true
    }
}


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
    await loadScript(scripts.gltfLoader)
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
    const file = await fetch(`playshader.${type}`)
    const text = await file.text()
    promises.resolved += 1
    return text
}

promises.ready = pageActive()
promises.three = loadScript(scripts.three)
promises.gltfLoader = loadGltfLoader()
promises.guify = loadScript(scripts.guify)

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
    resourcesLoaded = itemsLoaded
}

main()

async function main() {
    updateProgress()

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
                resolution: { value: options.resolution },
                map: { value: null },
            },
        ]),
        defines: {
            // NO_DITHERING: 1,
            PSX_QUANTIZE_TEXTURES: 1,
        },
        glslVersion: THREE.GLSL3,
        vertexShader: vert,
        fragmentShader: frag,
    })

    gl = new THREE.WebGLRenderer({ antialias: false })
    gl.outputEncoding = THREE.sRGBEncoding
    gl.setSize(options._renderWidth, options._renderHeight)
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

    ambient = new THREE.AmbientLight(0x7f7f7f, 0.5)
    scene.add(ambient)

    sun = new THREE.DirectionalLight(0xffffff, 0.5)
    sun.position.set(0, 10, 0)
    // sun.target.position.set(0, 0, 0)
    scene.add(sun)
    // scene.add(sun.target)

    sunColors.day = new THREE.Color(0xffe6e5) // sorta pinkish?
    sunColors.night = new THREE.Color(0x122fbc)
    sun.color.copy(sunColors.day)

    {
        // const helper = new THREE.DirectionalLightHelper(sun, 3)
        // scene.add(helper)
    }

    // Camera
    {
        const fov = 60
        const near = 1
        const far = 1000
        camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
        // camera.aspect
        camera.position.set(0, 9, 15)
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
            const ptLight = new THREE.PointLight(0xffff00, 10, 2, 1)
            ptLight.position.copy(obj.position)
            obj.parent.add(ptLight)
        }

        if (obj.material && obj.material.map) {
            const map = obj.material.map
            map.format = THREE.RGBAFormat
            map.encoding = THREE.sRGBEncoding

            const stockMaterial = new THREE.MeshLambertMaterial({
                map: obj.material.map,
                side: THREE.DoubleSide,
            })

            const newMaterial = playShader
            // Necessary for the flat objects in this scene
            newMaterial.side = THREE.DoubleSide
            stockShaders.set(obj, stockMaterial)

            obj.material = newMaterial.clone()
            obj.material.uniforms.map.value = map.clone()
        }
    })

    scene.add(model.scene)

    // Set up a UI for testing params

    await promises.guify
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
            // initial: options.resolutionString,
            // Common resolutions and one very unlikely one
            options:
                ['256×224', '320×240', '512×240', '640×480', '1440×1080'],
            object: options, property: 'resolutionString',
        },
        // prettier-ignore
        /*
        {
            type: 'range', label: 'Sunlight',
            min: 0, max: 3, step: 0.25,
            object: sun, property: 'intensity',
        },
        // prettier-ignore
        {
            type: 'range', label: 'Ambient',
            min: 0, max: 1, step: 0.125,
            object: ambient, property: 'intensity',
        },
        */
        {   type: 'checkbox', label: 'Day Cycle',
            object: options, property: 'dayCycle'
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
        // prettier-ignore
        { type: 'title', label: 'Credits' },
        // prettier-ignore
        {
            type: 'display', label: 'Model',
            initial: `<a href="https://skfb.ly/KDxV">\u201cThe Neko Stop-off\u201d by Art by Kidd</a>`
        },
    ])

    // And, go

    lastTime = performance.now()
    requestAnimationFrame(render)
    document.body.className = 'loaded'
}

const lightMoveSpeed = 1 / 3
function render(time) {
    // We don't really need to do this every time the event fires
    if (needsResize) {
        if (shaderEnabled) {
            // We don't resize the canvas itself because we'd lose the low-res
            // appearance. Maybe there's a way to do that in glsl
            gl.setSize(options._renderWidth, options._renderHeight)
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
        if (options.dayCycle) {
            sun.position.set(
                Math.sin(totalTime * (lightMoveSpeed * 0.5)) * -10,
                sun.position.y,
                Math.cos(totalTime * lightMoveSpeed) * 4
            )
        } else {
            sun.position.set(5, sun.position.y, 2)
        }

        const timeofday = sineCutoff(sun.position.z, 2)

        sun.color.lerpColors(sunColors.day, sunColors.night, timeofday)
        scene.background.lerpColors(
            new THREE.Color(SKY_COLOR),
            new THREE.Color(NIGHT_SKY_COLOR),
            timeofday
        )
        sun.intensity = THREE.MathUtils.lerp(0.5, 1, timeofday)
        ambient.intensity = THREE.MathUtils.lerp(1, 0.125, timeofday)
    } else if (loading) {
        requestAnimationFrame(render)
        loading.rotateY(Math.PI * 2 * delta)
    }
    gl.render(scene, camera)
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
                const texture = stock.map
                newShader.uniforms.map.value = texture
                // newShader.needsUpdate = true
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

function sineCutoff(val, limit) {
    return (
        (THREE.MathUtils.clamp(val * -1, -limit, limit) + limit) / (limit * 2)
    )
}
