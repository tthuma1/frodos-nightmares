struct VertexInput {
    @location(0) position: vec3f,
    @location(1) texcoords: vec2f,
    @location(2) normal: vec3f,
}

struct VertexOutput {
    @builtin(position) clipPosition: vec4f,
    @location(0) position: vec3f,
    @location(1) texcoords: vec2f,
    @location(2) normal: vec3f,
}

struct FragmentInput {
    @location(0) position: vec3f,
    @location(1) texcoords: vec2f,
    @location(2) normal: vec3f,
}

struct FragmentOutput {
    @location(0) color: vec4f,
}

struct CameraUniforms {
    viewMatrix: mat4x4f, // 4x4x4 bytov
    projectionMatrix: mat4x4f,
    position: vec3f,
}

struct ModelUniforms {
    modelMatrix: mat4x4f,
    normalMatrix: mat3x3f,
}

struct MaterialUniforms {
    baseFactor: vec4f,
    metalnessFactor: f32,
    isMirror: f32,
}

struct LightUniforms {
    color: vec3f, // rgb
    position: vec3f,
    uType: u32,
    direction: vec3f,
    isActive: u32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var uEnvironmentTexture: texture_cube<f32>;
@group(0) @binding(2) var uEnvironmentSampler: sampler;

@group(1) @binding(0) var<uniform> model: ModelUniforms;

@group(2) @binding(0) var<uniform> material: MaterialUniforms;
@group(2) @binding(1) var baseTexture: texture_2d<f32>;
@group(2) @binding(2) var baseSampler: sampler;

@group(3) @binding(0) var<uniform> lights: array<LightUniforms, 3>;


@vertex
fn vertex(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let position = model.modelMatrix * vec4(input.position, 1);

    output.position = position.xyz;
    output.clipPosition = camera.projectionMatrix * camera.viewMatrix * position;
    output.texcoords = input.texcoords;
    output.normal = model.normalMatrix * input.normal;
 
    return output;
}

@fragment
fn fragment(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;

    let diffuse : f32 = 1;
    let shininess : f32 = 10;

    let surfacePosition = input.position;
    let N = normalize(input.normal);
    let V = normalize(camera.position - surfacePosition);
    let R = reflect(-V, N);
    let T = refract(-V, N, 0);

    // loop through all lights
    for (var i : u32 = 0; i < 3; i++) {
        let light = lights[i];
        if (light.isActive == 0) {
            continue;
        }

        let dist = distance(surfacePosition, light.position);
        let Ad = 1 / dot(vec2f(0.001, 0.1), vec2f(1, dist * dist));

        let L = normalize(light.position - surfacePosition);
        let H = normalize(L + V);

        let lambert = max(dot(N, L), 0.0) * diffuse;
        let blinn = pow(max(dot(H, N), 0.0), shininess) * material.metalnessFactor;

        var Il : vec3f;

        if (light.uType == 0) {
            // lantern
            Il = light.color * Ad;
        } else if (light.uType == 1) {
            // flashlight
            let lightAngle : f32 = 0.8;
            let lightFocus : f32 = 1;

            let D = normalize(light.direction);

            let spotFactor = dot(-L, D);
            let Af = smoothstep(cos(lightAngle), 1.0, spotFactor) * lightFocus;

            Il = light.color * Ad * Af;
        }

        let ambientLight = vec3f(0.008);
        let diffuseLight = Il * lambert + ambientLight;
        let specularLight = Il * blinn;

        let baseColor = textureSample(baseTexture, baseSampler, input.texcoords) * material.baseFactor;
        let reflectedColor = textureSample(uEnvironmentTexture, uEnvironmentSampler, R);
        let refractedColor = textureSample(uEnvironmentTexture, uEnvironmentSampler, T);

        let reflection = mix(baseColor, reflectedColor, 1);
        let refraction = mix(baseColor, refractedColor, 0);

        var finalColor : vec4f;
        if (material.isMirror == 1) {
            let colorPreLight = mix(reflection, refraction, 0);
            finalColor = vec4f(colorPreLight.rgb * diffuseLight + specularLight, colorPreLight.a);
        } else {
            finalColor = vec4f(baseColor.rgb * diffuseLight + specularLight, baseColor.a);
        }

        output.color += vec4(pow(finalColor.rgb, vec3(1 / 2.2)), finalColor.a);
    }

    return output;
}
