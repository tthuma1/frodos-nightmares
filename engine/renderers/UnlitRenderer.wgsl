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
    // type: u32,
    // isActive: u32,
}

@group(0) @binding(0) var<uniform> camera: CameraUniforms;

@group(1) @binding(0) var<uniform> model: ModelUniforms;

@group(2) @binding(0) var<uniform> material: MaterialUniforms;
@group(2) @binding(1) var baseTexture: texture_2d<f32>;
@group(2) @binding(2) var baseSampler: sampler;

@group(3) @binding(0) var<uniform> light: LightUniforms;
// @group(3) @binding(1) var<uniform> lightCount: u32;


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
    let specular : f32 = 1;
    let shininess : f32 = 50;
    let ambient : f32 = 1;
    let lightDirection = vec3f(0, 0, -1);
    let lightAngle : f32 = 1;
    let lightFocus : f32 = 1;

    let surfacePosition = input.position;
    let dist = distance(surfacePosition, light.position);
    let Ad = 1 / dot(vec2f(0.001, 0.03), vec2f(1, dist * dist));

    let N = normalize(input.normal);
    let L = normalize(light.position - surfacePosition);
    let V = normalize(camera.position - surfacePosition);
    let H = normalize(L + V); // half-way vektor za blinn
    let D = normalize(lightDirection);

    let spotFactor = dot(-L, D);
    let Af = smoothstep(cos(lightAngle), 1.0, spotFactor) * lightFocus;

    let lambert = max(dot(N, L), 0.0) * diffuse;
    // material.shininess je v bistvu vedno 50, kot piše v navodilih
    let blinn = pow(max(dot(H, N), 0.0), shininess) * specular;

    let Il = light.color * Ad * Af;
    let ambientLight = vec3f(0.008) * ambient;
    let diffuseLight = Il * lambert + ambientLight;
    let specularLight = Il * blinn;

    let baseColor = textureSample(baseTexture, baseSampler, input.texcoords) * material.baseFactor;
    let finalColor = baseColor.rgb * diffuseLight + specularLight;

    output.color = pow(vec4(finalColor, 1), vec4(1 / 2.2));

    // //Lightning = ambient + diffuse + specular
    // let materialColor = textureSample(baseTexture, baseSampler, input.texcoords) * material.baseFactor;
    // let distance = length(light.position - input.position);
    // let attenuation = 1 / (0.001 + 0.05 * distance * distance);

    // //Directions
    // let lightDirection = normalize(light.position - input.position);
    // let viewDirection = normalize(camera.position - input.position);
    // let halfwayDirection = normalize(lightDirection + viewDirection);

    // //Ambient
    // let ambient = vec3f(0.03);

    // //Diffuse
    // let normal = normalize(input.normal);
    // let lightColor = light.color;
    // let diffuseStrength = max(0.0, dot(lightDirection, normal));
    // let diffuse = diffuseStrength * lightColor;

    // //Specular
    // let specular = pow(max(dot(input.normal, halfwayDirection), 0.0), 8.0);

    // //Final lightning
    // let lightning = vec4f(ambient + (diffuse + specular) * attenuation, 1.0);
    // output.color = lightning * materialColor;

    return output;
}
