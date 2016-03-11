/* jshint node: true */
/* jslint browser: true */
/* jslint asi: true */
'use strict'

var glClear = require('gl-clear')
var createContext = require('gl-context')
var fit = require('canvas-fit')
var Geom = require('gl-geometry')
var asyncImageLoad = require('async-image-loader')
var teapot = require('teapot')
var glslify = require('glslify')
var glShader = require('gl-shader')
var mat4 = require('gl-mat4')
var mat3 = require('gl-mat3')
var vec3 = require('gl-vec3')
var turntableCamera = require('turntable-camera')
var normals = require('normals')
var TextureCube = require('gl-texture-cube')
var createCubemap = require('gl-cubemap-placeholder')

// Find user widgets
var mixSlider = document.getElementById('mixSlider')
var useDebugMap = document.getElementById('useDebugMap')

// Start loading cube map images now
var images = [ 'assets/posx.jpg', 'assets/posy.jpg', 'assets/posz.jpg',
               'assets/negx.jpg', 'assets/negy.jpg', 'assets/negz.jpg' ]
asyncImageLoad(images, onImages)

// Canvas & WebGL setup
var canvas = document.body.appendChild(document.createElement('canvas'))
window.addEventListener('resize', fit(canvas), false)
var gl = createContext(canvas, render)
var clear = glClear({color: [ 0, 0, 0, 1 ], depth: true})
gl.enable(gl.DEPTH_TEST)

// Set up teapot model
var norms = normals.vertexNormals(teapot.cells, teapot.positions)
var model = Geom(gl).attr('MCVertex', teapot.positions).attr('MCNormal', norms).faces(teapot.cells)

// Environment mapping shader
var shader = glShader(gl, glslify('./cubemap.vs'), glslify('./cubemap.fs'))

// Projection and camera setup
var PMatrix = mat4.create()
var camera = turntableCamera()
camera.downwards = Math.PI * 0.2

// Cube map setup
var envMap, debugMap
function onImages (images) {
  var textures = {
    pos: {
      x: images[0], y: images[1], z: images[2]
    },
    neg: {
      x: images[3], y: images[4], z: images[5]
    }
  }
  envMap = TextureCube(gl, textures)
  debugMap = createCubemap(gl, 1024)
}

// Main loop
function render () {
  var width = canvas.width
  var height = canvas.height

  gl.viewport(0, 0, width, height)
  clear(gl)

  // Process user input
  var mixRatio = mixSlider.value / 100
  var cubemap = useDebugMap.checked ? debugMap : envMap

  if (!cubemap) {
    return
  }

  mat4.perspective(PMatrix, Math.PI / 4, width / height, 0.001, 1000)

  // Update camera rotation angle
  camera.rotation = Date.now() * 0.0002

  // Model matrix is ID here
  var VMatrix = camera.view()
  var MVMatrix = VMatrix // * ID
  var MVPMatrix = mat4.create()
  mat4.multiply(MVPMatrix, PMatrix, MVMatrix)

  model.bind(shader)
  shader.uniforms.MVMatrix = MVMatrix
  shader.uniforms.MVPMatrix = MVPMatrix
  shader.uniforms.NormalMatrix = computeNormalMatrix(MVMatrix)
  shader.uniforms.LightPosition = vec3.fromValues(0.0, 0.0, 4.0)
  shader.uniforms.BaseColor = vec3.fromValues(0.4, 0.4, 1.0)
  shader.uniforms.MixRatio = mixRatio
  shader.uniforms.envMap = cubemap.bind(0)
  model.draw()
}

function computeNormalMatrix (MVMatrix) {
  var topLeft = mat3.create()
  mat3.fromMat4(topLeft, MVMatrix)

  var inv = mat3.create()
  mat3.invert(inv, topLeft)

  var normalMatrix = mat3.create()
  mat3.transpose(normalMatrix, inv)
  return normalMatrix
}
