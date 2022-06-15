precision mediump float;

#ifndef GL_ES
#error TODO: non-ES compatibility
#endif

#ifndef USE_MAP
#define USE_MAP // TODO: figure out why three.js isn't setting this
#endif

// TODO: verify/fix compatibility with __VERSION__ == 100

#if __VERSION__ >= 300
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#endif

uniform vec3 ambientLightColor;

varying vec2 v_uv;
varying vec3 v_diffuse;

#include <map_pars_fragment>
#include <fog_pars_fragment>

#if PSX_QUANTIZE_TEXTURES
// const int texture_depth = 2; // this actually looks pretty neat on flat textures
const int texture_depth = 5;
const float texture_bpc = pow(2.0, float(texture_depth));
#endif

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
#ifdef USE_MAP
    // Sample the texture
    // TODO: emulate original hardware's texture transparency
    #if __VERSION__ >= 300
        vec2 mapSize = vec2(textureSize(map, 0));
        vec4 texel = texelFetch(map, ivec2(v_uv * mapSize), 0);

        #if PSX_QUANTIZE_TEXTURES
            texel = round(texel * texture_bpc) / texture_bpc;
        #endif

    #else
        // TODO: nearest neighbor in a way that's compatible with 100. Round the UVs?
        vec4 texel = texture2D(map, v_uv);
    #endif
#else
    vec4 texel = vec4(1.0);
#endif

    // TODO: Round off the color depth of the texel if desired, but doing a
    // simple multiply-round-divide doesn't seem right. Maybe quantize ahead of
    // time.

    // Apply lighting
    // TODO: again, not sure why dividing the ambient light makes it look more
    // like the stock shaders
    vec4 lightColor = vec4(v_diffuse + max(ambientLightColor / 2.0, 0.0), 1.0);
    gl_FragColor = texel * lightColor;

    #include <fog_fragment>

    // Dither
    gl_FragColor = psx_dither(gl_FragColor);

    // convert to renderer's color space
    #include <encodings_fragment>
}
