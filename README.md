# PlayShader One

<div style="text-align:center">
<img src="logo.svg" width="512" alt="PlayShader logo">

![npm version](https://flat.badgen.net/npm/v/playshader-one)
![milestone progress](https://flat.badgen.net/github/milestones/bucketosoftware/playshader-one/2)
![license](https://flat.badgen.net/github/license/bucketosoftware/playshader-one)
</div>

A work-in-progress GLSL ES shader **(currently only set up to work with [Three.js])** that emulates the primitive graphical hardware used in an older game console.

[three.js]: https://www.npmjs.com/package/three
## [Live Demo]

[Live Demo]: https://bucketosoftware.github.io/playshader-one/demo/

## Goals

To render polygonal 3D graphics, the original PlayStation used custom hardware that traded accuracy for speed and cost. These limitations resulted in a janky-yet-distinctive visual style. This project aims to replicate that style as closely as possible, while allowing users to relax the limitations as they see fit.

Currently the shader is heavily tied to the Three.js and WebGL way of doing things (in particular, the #includes and #defines are resolved at runtime), but compatibility with desktop GLSL or even other shading languages would be nice.

### Key features of the hardware

* Low resolution (320x240 was commonly used)
* All geometry calculations are done with fixed-point math
* Integer vertex coordinates (polygon wobble)
* Per-vertex (Gouraud) shading
* 16 bit color (processed at 24bpp internally and truncated with optional dithering)
* Affine (non-perpsective-correct) texture mapping
* Fog
* No depth buffer
* Limited texture memory and size

(This is based on my understanding; see [References](#references) for more authoritative sources.)

## Project Status

**EARLY: Expect breaking changes!**

The shader is being developed alongside a game project, so development is currently focused on the needs of that game. Check [the roadmap on GitHub] for the current status. Please feel free to open an issue if you encounter any problems using the shader with Three.js.

[the roadmap on GitHub]: https://github.com/BucketOSoftware/playshader-one/milestone/2

## Usage

Install:

```shell
$ npm install playshader-one
```

In your rendering code, pass the vertex and fragment shaders to a custom `ShaderMaterial`:

```js
import * as THREE from "three";

import psxvert from "playshader-one/playshader.vert";
import psxfrag from "playshader-one/playshader.frag";

// TODO: avoid this boilerplate; subclass and export in the package, perhaps
const psx = new THREE.ShaderMaterial({
  lights: true,
  fog: true,
  uniforms: UniformsUtils.merge([
    UniformsLib.lights,
    UniformsLib.fog,
    {
      // Commonly used resolution for the hardware
      resolution: { value: [320, 240] },
      map: { value: null },
    },
  ]),
  defines: {
    //// Define to disable dithering and color downsampling
    // NO_DITHERING: 1,
  },
  glslVersion: THREE.GLSL3,
  vertexShader: psxvert,
  fragmentShader: psxfrag,
});

const texture = new THREE.TextureLoader().load("blocky.png");
psx.uniforms.map.value = texture;

// You probably want to apply the material to everything in your scene, but
// maybe it would be interesting if you didn't
const geometry = new THREE.BoxGeometry();
const cube = new THREE.Mesh(geometry, psx);
scene.add(cube);
```

### Other considerations

Some aspects of the PSX look are outside the scope of a shader; the models and textures you use will make a big difference in the authenticity of the rendered image. Take a look at [the specs] for accurate information, but to summarize what I've learned so far, **polygon counts and texture resolutions are quite a bit lower than you might expect!** In particular:

  * The hardware supports texture sizes up to 256×256 with 16-bit color, but the console only has 1 MB of video RAM, so in a typical configuration[^1] you'd only have room for about 5 of those. If you want an authentic look, consider heavily downsampling your textures, or using untextured or flat shaded polygons[^2]. Games also seemed to use flat shaded polygons when they could get away with it for performance reasons; they supposedly render twice as fast.

  * The GPU also supports 4- and 8-bit palletized textures, and I imagine they were more commonly used than RGBA. Consider quantizing your textures with a tool like pngquant.

  * Character models had polygon counts in the hundreds; Lara Croft was around 300, and Crash Bandicoot was around 500.

  * Also, not all animated models used fully connected geometry; sometimes they'd just stick an arm in a torso and nobody complained. Low poly counts and screen resolutions can cover up a lot of shading issues!

[^1]: A 256×256×16b texture like that would use 128 KB of VRAM, and assuming a screen resolution of 320×240 and two 16-bit buffers, you've only got 724 KB left for textures. Plus, the texture is taller than the buffer!
[^2]: While [this issue](https://github.com/BucketOSoftware/playshader-one/issues/15) is pending, you can flat shade a model by ensuring that each face's vertex normals are perpendicular to the face. 

[the spec]: #references

## Alternatives

`TODO`

## Contributing

`TODO`

## References

* [PlayStation specs](https://psx-spx.consoledev.net)
  * [GPU](https://psx-spx.consoledev.net/graphicsprocessingunitgpu/)
  * [Geometry Transform Engine](https://psx-spx.consoledev.net/geometrytransformationenginegte/)
* [http://psx.rules.org/gpu.txt](https://web.archive.org/web/20170915232213/http://psx.rules.org/gpu.txt)
* [The PS1 GPU texture pipeline and how to emulate it.](https://www.reddit.com/r/EmuDev/comments/fmhtcn/article_the_ps1_gpu_texture_pipeline_and_how_to/)

## Legal

©2022 Bucket o' Software, licensed under the <a href="http://mozilla.org/MPL/2.0/">Mozilla Public License v. 2.0</a>.

"PlayStation" is a registered trademark of Sony Interactive Entertainment Inc.
