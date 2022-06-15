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

// Returns the amount of light hitting the vertex, 0..1
// TODO: support point lights (and other types?)
#if NUM_DIR_LIGHTS > 0
float gouraud(DirectionalLight light, vec3 geomNormal) {
    // Calculate the vert's normal in eye space
    vec3 eyeSpaceNormal = normalize((modelViewMatrix * vec4(geomNormal, 0.0)).xyz);

    // Light direction is already in world space
    vec3 lightNormal = normalize((viewMatrix * vec4(light.direction, 0.0)).xyz);

    // Dot product of the two gives us the amount of lighting to apply, 0..1
    return dot(eyeSpaceNormal, lightNormal);
}
#endif

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

    // TODO: we don't use BRDF here, on the purpose, because it seems beyond
    // what the hardware could do. But we should confirm.

    // TODO: This gives directional lights (and others?) comparable 
    // brightness to the stock shaders (but not the same!). The fact that it 
    // seems to be exactly one-half is real weird and makes me think I'm
    // missing a factor somewhere.
    const float mysteriousMultiplier = 0.5;

    // TODO: flat shading. Currently doable via the three.js normals but maybe
    // it would be convenient to be able to force it here
    v_diffuse = vec3(0.0);

#if (NUM_DIR_LIGHTS > 0)
    #pragma unroll_loop_start
    for(int i = 0; i < NUM_DIR_LIGHTS; i++) {
        v_diffuse += gouraud(directionalLights[i], normal) * directionalLights[i].color * mysteriousMultiplier;
    }
	#pragma unroll_loop_end
#endif
    

    #include <fog_vertex>

    vec4 screenSpacePos = gte_round(projectionMatrix * mvPosition);

    screenSpacePos /= abs(screenSpacePos.w);

    gl_Position = screenSpacePos;
}
