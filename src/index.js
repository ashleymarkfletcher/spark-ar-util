const Scene = require('Scene')
const Diagnostics = require('Diagnostics')
const TouchGestures = require('TouchGestures')
const Time = require('Time')
const FaceTracking = require('FaceTracking')
const Animation = require('Animation')
const Reactive = require('Reactive')
const Textures = require('Textures')
const Materials = require('Materials')
const CameraInfo = require('CameraInfo')

export const randomNumber = (lower, upper) => Math.floor(Math.random() * upper) + lower
export const randomElement = elements => elements[randomNum(0, elements.length)]
export const randomFloat = (lower, upper) => Math.random() * upper + lower
export const randomNegativePostiive = num => {
  num *= Math.floor(Math.random() * 2) == 1 ? 1 : -1
  return num
}

export const log = str => Diagnostics.log(str)
export const watch = (str, signal) => Diagnostics.watch(str, signal)

export const toggle = (element, hide) => (element.hidden = hide)
export const hide = element => toggle(element, true)
export const show = element => toggle(element, false)

export const showMultiple = elements => elements.forEach(show)
export const hideMultiple = elements => elements.forEach(hide)

export const updateText = (element, text) => {
  element.text = text
}

export const tapRegistrar = (element, fn) => TouchGestures.onTap(element).subscribe(fn)

//
// Get a set of duplicated elements as an array.
// parent should be the parent scene item containing the children
// childPrefix is the prefix for the element set: 
// e.g. for "plane0" the childPrefix is "plane".
//
export const getChildren = (parent, childPrefix) => {
  let children = [];
  let i = 0;
  let hasMatch = true;

  do {
    try {
      children.push(parent.child(childPrefix + i));
      i++;
    } catch(err) {
      hasMatch = false;
    }
  }
  while (hasMatch);

  return children;
}

// basic 2d distance collision
export const collision = function(x1, y1, x2, y2, distance) {
  return Math.hypot(x2 - x1, y2 - y1) <= distance
}

export const checkCollisions = (objects, colliderX, colliderY, onCollision) => {
  objects.forEach(o => {
    const oX = o.element.transform.x.pinLastValue()
    const oZ = o.element.transform.z.pinLastValue()

    if (collision(colliderX, colliderY, oX, oZ, maxXdistance, maxZdistance)) {
      onCollision(o)
    }
  })
}

// countdown from a number and trigger a function
export const countdown = (from, to, time, everyTime, onComplete, triggerOnStart) => {
  let count = from

  if (triggerOnStart) {
    everyTime(count)
    count--
  }

  const timer = () =>
    Time.setTimeout(() => {
      everyTime(count)

      if (count !== to) timer()
      else onComplete(count)
      count--
    }, time)

  return timer()
}

// use strings
export const swapMaterialTextureByName = (matName, textureName) => {
  var mat = Materials.get(matName)
  mat.diffuse = Textures.get(textureName)
}

// use mat/tex objects
export const swapMaterialTexture = (material, texture) => {
  material.diffuse = texture
}

export const swapSceneObjectTexture = (sceneObject, texture) => {
  const material = sceneObject.material
  material.diffuse = texture
}

// same as above but with an array of texures to choose from
export const randomTexture = (textures, material) => swapMaterialTexture(material, randomElement(textures))

export const randomizeTextures = (objArray, textures) =>
  objArray.forEach(obj => randomTexture(textures, obj.element.material))

export const tween = (sampler, from, to, driverParams, onComplete) => {
  const driverParamsDefault = {
    durationMilliseconds: 1000,
    loopCount: 1, // can be Infinity
    mirror: false
  }

  const driverParams = { ...driverParamsDefault, ...params }

  const driver = Animation.timeDriver(driverParams)
  const animSampler = Animation.samplers[sampler || 'linear'](from, to)
  const signal = Animation.animate(driver, animSampler)
  driver.start()

  if (onComplete) driver.onCompleted.subscribe(onComplete)

  return { signal: signal, driver: driver }
}

export const opacityTween = (material, from, to, params, onComplete) => {
  const anim = tween('linear', from, to, params, onComplete)
  material.opacity = anim.signal
  return anim
}

export const uvScroll = (material, offsetU, offsetV, driverParameters, onComplete) => {
  const driverParams = {
    ...{ durationMilliseconds: 2000, loopCount: Infinity, mirror: false },
    ...driverParameters
  }

  const anim = tween('linear', 0, 1, driverParams, onComplete)

  if (offsetU) material.diffuseTextureTransform.offsetU
  if (offsetV) material.diffuseTextureTransform.offsetV

  return anim
}

// scale all the axis by the animation signal
export const scaleTween = (element, driverParams, sampler, from, to, axisArray, onComplete) => {
  const anim = tween(sampler, from, to, driverParams, onComplete)
  axisArray.forEach(axis => (element.transform['scale' + axis.toUpperCase()] = anim.signal))
}

export const translateTween = (element, driverParams, from, to, sampler, axisArray) => {
  const anim = tween(driverParams, sampler, from, to)
  axisArray.forEach(axis => (element.transform[axis] = anim.signal))
}

export const axisRotation = (axis_x, axis_y, axis_z, angle_degrees) => {
  var norm = Math.sqrt(axis_x * axis_x + axis_y * axis_y + axis_z * axis_z)
  axis_x /= norm
  axis_y /= norm
  axis_z /= norm
  var angle_radians = (angle_degrees * Math.PI) / 180.0
  var cos = Math.cos(angle_radians / 2)
  var sin = Math.sin(angle_radians / 2)
  return Reactive.rotation(cos, axis_x * sin, axis_y * sin, axis_z * sin)
}

export const rotateTween = (element, driverParams, sampler, from, to, axisArray) => {
  const anim = tween(driverParams, sampler, from, to)

  axisArray.forEach(axis => (element.transform['rotation' + axis.toUpperCase()] = anim.signal))
}

export const bounce = (element, duration, from, to) => {
  const driverParameters = {
    durationMilliseconds: duration / 2,
    loopCount: 2,
    mirror: true
  }

  return scaleTween(element, driverParameters, 'easeInOutQuad', from, to, ['x', 'y'])
}

// eg 000123
export const padWithZeros = (num, length) => {
  const numString = num.toString()
  const strLength = numString.length
  let paddedStr = num.toString()

  for (let i = 0; i <= length; i++) {
    if (strLength > i) continue
    paddedStr = '0' + paddedStr
  }

  return paddedStr
}

//
// Creates a throttled function that only invokes the provided 
// function at most once per every wait milliseconds
// Inspired by: https://www.30secondsofcode.org/js/s/throttle 
//
export const throttle = (fn, wait) => {
  let inThrottle, lastFn, lastTime;
  return function() {
    const context = this,
      args = arguments;
    if (!inThrottle) {
      fn.apply(context, args);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      lastFn && Time.clearTimeout(lastFn);
      lastFn = Time.setTimeout(function() {
        if (Date.now() - lastTime >= wait) {
          fn.apply(context, args);
          lastTime = Date.now();
        }
      }, Math.max(wait - (Date.now() - lastTime), 0));
    }
  };
};
