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
}

struct LightUniforms {
    color: vec3f, // rgb
    position: vec3f,
    intensity: f32,
    range: f32
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
    //Lightning = ambient + diffuse + specular
    let materialColor = textureSample(baseTexture, baseSampler, input.texcoords) * material.baseFactor;
    let lightDirection = normalize(light.position - input.position);
    let distance = length(light.position - input.position);
    let attenuation = 1.0 / (1.0 + 0.09 * distance + 0.032 * distance * distance);

    //Ambient
    let ambient = vec3f(0.1);

    //Diffuse
    let normal = normalize(input.normal);
    let lightColor = light.color;
    let diffuseStrength = max(0.0, dot(lightDirection, normal));
    let diffuse = diffuseStrength * lightColor;

    //Specular
    let viewSource = normalize(camera.position - input.position);
    let reflectDirection = reflect(-lightDirection, normal);
    let specularStrength = pow(max(0.0, dot(reflectDirection, viewSource)), 32.0); //TODO: 32 replace z shininess v Light
    let specular = specularStrength * lightColor;

    let lightning = vec4f(ambient + (diffuse + specular) * attenuation, 1.0);
    output.color = materialColor * lightning;

    return output;
}
