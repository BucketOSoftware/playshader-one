/*
 * playshader-one demo
 *
 * IMPORTANT NOTE: this code is designed to be straightforward (no build
 * tooling, etc.), not to demonstrate best practices, whatever those are. Had
 * this been a real application, I would have written better organized code.
 */
const SKY_COLOR = 0x3c9f9c
const RESOLUTION = [320, 240]
let gl, scene, camera, light, ambient

let loading, house

let lastTime = 0
let totalTime = 0

const itemsToLoad = 7
function loadingProgress(url, itemsLoaded, itemsTotal) {
    // console.log("Loading:", url, itemsLoaded, itemsTotal);
    console.log('Progress: %.0f%%', (itemsLoaded / itemsToLoad) * 100)
}

async function fetchShader(type) {
    const file = await fetch(`playshader.${type}`)
    return file.text()
}

async function main() {
    document.body.style.backgroundColor = `#${SKY_COLOR.toString(16)}`

    // Start loading resources
    
    const loader = new THREE.GLTFLoader()
    loader.manager.onStart = loadingProgress
    loader.manager.onProgress = loadingProgress

    const resourcesPromise = Promise.all([
        loader.loadAsync('nekostop.gltf'),
        ['vert, frag'].map((t) => fetchShader(t)),
    ])

    // Create the shader

    const psx = new THREE.ShaderMaterial({
        lights: true,
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.lights,
            THREE.UniformsLib.fog,
            {
                // Commonly used resolution for the hardware
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

    gl = new THREE.WebGLRenderer({
        antialias: false,
        // alpha: true,
    })
    gl.outputEncoding = THREE.sRGBEncoding
    // gl.setPixelRatio(4)

    // gl.setSize(window.innerWidth, window.innerHeight)
    gl.setSize(...RESOLUTION)
    // gl.setPixelRatio(window.devicePixelRatio * 3);
    gl.domElement.style.width = '640px'
    gl.domElement.style.height = '480px'
    // Ask the browser to upscale in a chunky fashion
    gl.domElement.style.imageRendering = 'pixelated'
    document.body.appendChild(gl.domElement)

    // Scene

    scene = new THREE.Scene()
    scene.fog = new THREE.Fog(SKY_COLOR, 15, 40)
    scene.background = new THREE.Color(SKY_COLOR)

    // Lighting

    const ambient = new THREE.AmbientLight(0x404040)
    scene.add(ambient)

    light = new THREE.DirectionalLight(0xffffff, 5)
    light.position.set(0, 20, 5)
    light.target.position.set(0, 0, 0)
    scene.add(light)

    // Camera

    camera = new THREE.PerspectiveCamera(60, 4 / 3, 1, 1000)
    camera.position.set(0, 9, 14)
    camera.lookAt(0, 3, 0)

    // Render something while we wait for assets to load
    // TODO: display the logo and/or progress bar

    const geometry = new THREE.BoxGeometry()
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    const loadModel = new THREE.Mesh(geometry, material)
    scene.add(loadModel)

    requestAnimationFrame(render)



    const [model, vert, frag] = await resourcesPromise;
 
    psx.vertexShader = vert
    psx.fragmentShader = frag

    // console.dir(model)

    house = model.scene.getObjectByName('Scene')

    // Apply the PlayShader One material
    house.traverse((obj) => {
        if (obj.name === 'lantern') {
            // TODO: find a way to make it look like this is lighting up the lantern, perhaps?
            const ptLight = new THREE.PointLight(0x0033ff, 10, 2, 1);
            ptLight.position.copy(obj.position);
            obj.parent.add(ptLight);
        }
        if (obj.material && true) {
            const oldMaterial = obj.material
            obj.material = psx.clone()
            obj.material.uniforms.map.value = oldMaterial.map
            oldMaterial.dispose()
        }
    })

    scene.remove(cube)
    scene.add(model.scene)

    lastTime = performance.now()
    requestAnimationFrame(render)
}


const lightMoveSpeed = 50
function render(time) {
    let delta = (time - lastTime) / 1000
    if (delta > 1) {
        delta = 0.1
    }
    totalTime += delta
    lastTime = time

    if (house) {
        requestAnimationFrame(render)
        house.rotateY(Math.PI * 0.05 * delta)
        light.position.x = Math.sin(totalTime / lightMoveSpeed) * 30
        light.position.z = Math.cos(totalTime / lightMoveSpeed) * 5
    } else if (loadModel) {
        loadModel.rotateY(Math.PI * 2 * delta)
    }
    gl.render(scene, camera)
}

document.addEventListener('DOMContentLoaded', main)
