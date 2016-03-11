precision mediump float;

attribute vec4 MCVertex;
attribute vec3 MCNormal;

varying float LightIntensity;
varying vec3 ReflectDir;

uniform vec3 LightPosition;

uniform mat4 MVMatrix;
uniform mat4 MVPMatrix;
uniform mat3 NormalMatrix;

void main() {
    gl_Position = MVPMatrix * MCVertex;
    
    vec3 normal = normalize(NormalMatrix * MCNormal);
    vec4 pos = MVMatrix * MCVertex;
    vec3 eyeDir = pos.xyz;
    ReflectDir = reflect(eyeDir, normal);
    
    vec3 lightDir = normalize(LightPosition - eyeDir);
    LightIntensity = max(dot(lightDir, normal), 0.0);
}