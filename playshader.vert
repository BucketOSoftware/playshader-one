precision mediump float;

#ifndef GL_ES
#error TODO: non-ES compatibility
#endif

// TODO: verify/fix compatibility with __VERSION__ == 100

/*
// Unforms and attributes provided by ShaderMaterial
// See https://threejs.org/docs/#api/en/renderers/webgl/WebGLProgram for the complete list
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
*/


// TODO: does this do anything? Is it useful?
// #pragma debug(on)


// Begin shader-specific params

// Resolution of the imaginary PSX
// TODO: we only use the vertical measurement and trust the user's choice of
// aspect ratio; should there be other behaviors?
uniform vec2 resolution;

// Standard UV coords
varying vec2 v_uv;

// Amount of light to apply (?)
varying vec3 v_diffuse;

#include <common>
#include <fog_pars_vertex>
#include <lights_pars_begin>
#include <skinning_pars_vertex>

// Round vector xy coordinates to the PSX resolution
vec4 gte_round(in vec4 v) {
    vec4 pixel_space = v;
#if __VERSION__ >= 300
    pixel_space.xy = round(v.xy * resolution.y) / resolution.y;
#else
    // Not technically the same rounding
    pixel_space.xy = floor(v.xy * resolution.y + 0.5) / resolution.y;
#endif
    return pixel_space;
}

// Calculate per-vertex shading
// TODO: support point lights (and other types?)
float gouraud(DirectionalLight light) {
    // Calculate the vert's normal in eye space
    vec3 eyeSpaceNormal = (modelViewMatrix * vec4(normal, 0.0)).xyz;

    // Light vector in eye space: apparently already calculated
    // TODO: is this normalize even necessary?
    vec3 lightNormal = normalize(light.direction);

    // Dot product of the two gives us the amount of lighting to apply, 0..1
    return max(dot(eyeSpaceNormal, lightNormal), 0.1);
}

void main(void) {
    // TODO: affine texture mapping
    v_uv = uv;

    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>

    #include <begin_vertex>
    #include <skinning_vertex>
    
    // Transform the vertex into eye space ...the GTE way!
    // The GTE worked with integer vertices, so rounding after each matrix
    // multiplication (and doing model and view matrices separately) 
    // We round multiple times to capture a bit of the accumulating inaccuracy
    // TODO: perform actual fixed point math
    vec4 mvPosition = modelMatrix * vec4(transformed, 1.0);
    mvPosition = gte_round(mvPosition);
    mvPosition = viewMatrix * mvPosition;
    mvPosition = gte_round(mvPosition);

    // Lighting
    // TODO: flat shading. Currently doable via the three.js normals but maybe
    // it would be convenient to be able to force it here
    // TODO: unroll loop
    v_diffuse = vec3(0., 0., 0.);
    for (int i = 0; i < directionalLights.length(); i++) {
        v_diffuse += gouraud(directionalLights[i]) * directionalLights[i].color;
    }

    #include <fog_vertex>

    vec4 pos = gte_round(projectionMatrix * mvPosition);
    gl_Position = pos;
}
