# PlayShader One

![PlayShader logo](logo.svg)

![npm](https://img.shields.io/npm/v/playshader-one?style=for-the-badge)

A work-in-progress GLSL ES shader **(currently only set up to work with [Three.js])** that emulates the primitive graphical hardware used in an older game console

[three.js]: https://www.npmjs.com/package/three

## Goals

To render polygonal 3D graphics, the original PlayStation used custom hardware that traded accuracy for speed and cost. These limitations resulted in a janky-yet-distinctive visual style. This project aims to replicate that style as closely as possible, while allowing users to relax the limitations as they see fit.

Currently the shader is heavily tied to the Three.js and WebGL way of doing things (in particular, the #includes and #defines are resolved at runtime), but compatibility with desktop GLSL or even other shading languages would be nice.

### Key features of the hardware

* Low resolution (320x240 was commonly used)
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

The shader is being developed alongside a game project, so development is currently focused on the needs of that game. `TODO: Add a roadmap.` Please feel free to open an issue if you encounter any problems using the shader with Three.js.

## Usage

Install:

```shell
$ npm install playshader-one
```

In your rendering code:

```js
import * as THREE from "three";

import psxfrag from "playshader-one/playshader.frag";
import psxvert from "playshader-one/playshader.vert";

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
    //// Define to disable dithering (although colors will still be truncated to
    //// 16-bit):
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

## Alternatives

`TODO`

## Contributing

`TODO`

## References

* [PlayStation specs](https://psx-spx.consoledev.net)
  * [GPU](https://psx-spx.consoledev.net/graphicsprocessingunitgpu/)
  * [Geometry Transform Engine](https://psx-spx.consoledev.net/geometrytransformationenginegte/)

## License

```
This Source Code Form is subject to the terms of the Mozilla Public License,
v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain
one at http://mozilla.org/MPL/2.0/.
```

"PlayStation" is a registered trademark of Sony Interactive Entertainment Inc.

