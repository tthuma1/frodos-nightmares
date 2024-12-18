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
}

struct ModelUniforms {
    modelMatrix: mat4x4f,
    normalMatrix: mat3x3f,
}

struct MaterialUniforms {
    baseFactor: vec4f,
}

struct LightUniforms {
    color: vec3f, // rgb
    position: vec3f,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;

@group(1) @binding(0) var<uniform> model: ModelUniforms;

@group(2) @binding(0) var<uniform> material: MaterialUniforms;
@group(2) @binding(1) var baseTexture: texture_2d<f32>;
@group(2) @binding(2) var baseSampler: sampler;

@group(3) @binding(0) var<uniform> light: LightUniforms;

@vertex
fn vertex(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    output.clipPosition = camera.projectionMatrix * camera.viewMatrix * model.modelMatrix * vec4(input.position, 1);
    output.position = (model.modelMatrix * vec4(input.position, 1)).xyz; // zadnja komponenta je 1
    output.texcoords = input.texcoords;
    output.normal = model.normalMatrix * input.normal;

    return output;
}

@fragment
fn fragment(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;

    // let L = normalize(vec3f(1, 1, 0)); // luč je vedno nad našim 3D modelom
    let L = normalize(input.normal); // dobimo interpolirano normalo glede na normale na ogliščih modela
    let N = vec3f(light.position - input.position);
    let R = reflect(N, L);
    let illumination = max(dot(N, L), 0);
    let distance = length(light.position - input.position);
    let illumination2 = pow(illumination * 1 / (distance), 2);
    let ambient = vec3f(0.3);
    let materialColor = textureSample(baseTexture, baseSampler, input.texcoords) * material.baseFactor;
    // dodamo ambientno osvetlitev
    // rgb komponente se pomnozijo z `illumination`, alpha pa ostane nespremenjena
    // output.color = materialColor * vec4f(vec3f(illumination + ambient), 1);
    output.color = materialColor * vec4f(light.color * illumination2 + ambient, 1);

    return output;
}
