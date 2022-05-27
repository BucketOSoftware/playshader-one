precision mediump float;

#ifndef GL_ES
#error TODO: non-ES compatibility
#endif

// TODO: verify/fix compatibility with __VERSION__ == 100

#if __VERSION__ >= 300
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#endif

// Color map, i.e. "the texture"
uniform sampler2D map;

uniform vec3 ambientLightColor;

varying vec2 v_uv;
varying vec3 v_diffuse;

#include <fog_pars_fragment>

const mat4 psx_dither_matrix = transpose(mat4(
    // This is the PSX dithering matrix in row major order, but the mat4
    // constructor takes column major, so it's transposed above
    -4, +0, -3, +1,
    +2, -2, +3, -1,
    -3, +1, -4, +0,
    +3, -1, +2, -2
));

// Apply dithering to the fragment according to the PSX GPU,
// which operates in 24 bit color but truncates to 15 for display
// TODO: "POLYGONs (triangles/quads) are dithered ONLY if they do use gouraud shading or texture blending.", etc. See https://psx-spx.consoledev.net/graphicsprocessingunitgpu/#24bit-rgb-to-15bit-rgb-dithering-enabled-in-texpage-attribute
vec4 psx_dither(in vec4 color) {
    // Get the current pixel's offset into the dither pattern
    ivec2 pattern_idx = ivec2(mod(gl_FragCoord.xy, vec2(4.0, 4.0)));
#ifdef NO_DITHERING
    float offset = 0.;
#else
    float offset = float(psx_dither_matrix[pattern_idx.x][pattern_idx.y]);
#endif 

    // Convert to 0..255
    vec3 color_24bpp = vec3(round(color.rgb * 255.0));

    // Apply dither offset and clamp
    color_24bpp = clamp(color_24bpp + offset, 0.0, 255.0);

    // Truncate to 0..31
    // TODO: might be fun to specify the color depth with a param
    vec3 color_trunc = trunc(color_24bpp / 8.0);

    // Normalize to 0..1 and return
    return vec4(color_trunc.rgb / 31.0, color.a);
}

void main(void) {
    // Sample the texture
    // TODO: emulate original hardware's texture transparency
    vec4 texel = texture2D(map, v_uv);

    // Apply lighting
    gl_FragColor = vec4(texel.rgb * (ambientLightColor + v_diffuse), texel.a);

    #include <fog_fragment>

    if(gl_FragColor.a <= 0.01) {
        discard;
        return; // TODO: does discard implicitly return, or ignore later code?
    }

    // Dither
    gl_FragColor = psx_dither(gl_FragColor);
}
