webpackJsonp([0],[
/* 0 */,
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ClearMaskPass = exports.MaskPass = exports.ShaderPass = exports.RenderPass = exports.CopyShader = undefined;

var _copyshader = __webpack_require__(16);

Object.defineProperty(exports, 'CopyShader', {
  enumerable: true,
  get: function get() {
    return _copyshader.CopyShader;
  }
});

var _renderpass = __webpack_require__(18);

Object.defineProperty(exports, 'RenderPass', {
  enumerable: true,
  get: function get() {
    return _renderpass.RenderPass;
  }
});

var _shaderpass = __webpack_require__(19);

Object.defineProperty(exports, 'ShaderPass', {
  enumerable: true,
  get: function get() {
    return _shaderpass.ShaderPass;
  }
});

var _maskpass = __webpack_require__(17);

Object.defineProperty(exports, 'MaskPass', {
  enumerable: true,
  get: function get() {
    return _maskpass.MaskPass;
  }
});

var _clearmaskpass = __webpack_require__(15);

Object.defineProperty(exports, 'ClearMaskPass', {
  enumerable: true,
  get: function get() {
    return _clearmaskpass.ClearMaskPass;
  }
});

var _three = __webpack_require__(0);

function EffectComposer(renderer, renderTarget) {
  this.renderer = renderer;

  if (renderTarget === undefined) {
    var width = window.innerWidth || 1;
    var height = window.innerHeight || 1;
    var parameters = { minFilter: _three.LinearFilter, magFilter: _three.LinearFilter, format: _three.RGBFormat, stencilBuffer: false };

    renderTarget = new _three.WebGLRenderTarget(width, height, parameters);
  }

  this.renderTarget1 = renderTarget;
  this.renderTarget2 = renderTarget.clone();

  this.writeBuffer = this.renderTarget1;
  this.readBuffer = this.renderTarget2;

  this.passes = [];

  this.copyPass = new _shaderpass.ShaderPass(_copyshader.CopyShader);
}

EffectComposer.prototype.swapBuffers = function () {
  var tmp = this.readBuffer;
  this.readBuffer = this.writeBuffer;
  this.writeBuffer = tmp;
};

EffectComposer.prototype.addPass = function (pass) {
  this.passes.push(pass);
};

EffectComposer.prototype.insertPass = function (pass, index) {
  this.passes.splice(index, 0, pass);
};

EffectComposer.prototype.render = function (delta) {
  this.writeBuffer = this.renderTarget1;
  this.readBuffer = this.renderTarget2;

  var maskActive = false;

  for (var i = 0; i < this.passes.length; i++) {
    var pass = this.passes[i];

    if (!pass.enabled) continue;

    pass.render(this.renderer, this.writeBuffer, this.readBuffer, delta, maskActive);

    if (pass.needsSwap) {
      if (maskActive) {
        var context = this.renderer.context;

        context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff);

        this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, delta);

        context.stencilFunc(context.EQUAL, 1, 0xffffffff);
      }

      this.swapBuffers();
    }

    if (pass instanceof _maskpass.MaskPass) {
      maskActive = true;
    } else if (pass instanceof _clearmaskpass.ClearMaskPass) {
      maskActive = false;
    }
  }
};

EffectComposer.prototype.reset = function (renderTarget) {
  if (renderTarget === undefined) {
    renderTarget = this.renderTarget1.clone();

    renderTarget.width = window.innerWidth;
    renderTarget.height = window.innerHeight;
  }

  this.renderTarget1 = renderTarget;
  this.renderTarget2 = renderTarget.clone();

  this.writeBuffer = this.renderTarget1;
  this.readBuffer = this.renderTarget2;
};

EffectComposer.prototype.setSize = function (width, height) {
  var renderTarget = this.renderTarget1.clone();

  renderTarget.width = width;
  renderTarget.height = height;

  this.reset(renderTarget);
};

// shared ortho camera

EffectComposer.camera = new _three.OrthographicCamera(-1, 1, 1, -1, 0, 1);

EffectComposer.quad = new _three.Mesh(new _three.PlaneGeometry(2, 2), null);

EffectComposer.scene = new _three.Scene();
EffectComposer.scene.add(EffectComposer.quad);

exports.default = EffectComposer;

/***/ }),
/* 2 */,
/* 3 */,
/* 4 */,
/* 5 */,
/* 6 */,
/* 7 */
/***/ (function(module, exports) {

module.exports = function( THREE ) {
	/**
	 * @author qiao / https://github.com/qiao
	 * @author mrdoob / http://mrdoob.com
	 * @author alteredq / http://alteredqualia.com/
	 * @author WestLangley / http://github.com/WestLangley
	 * @author erich666 / http://erichaines.com
	 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

	function OrbitControls( object, domElement ) {

		this.object = object;

		this.domElement = ( domElement !== undefined ) ? domElement : document;

		// Set to false to disable this control
		this.enabled = true;

		// "target" sets the location of focus, where the object orbits around
		this.target = new THREE.Vector3();

		// How far you can dolly in and out ( PerspectiveCamera only )
		this.minDistance = 0;
		this.maxDistance = Infinity;

		// How far you can zoom in and out ( OrthographicCamera only )
		this.minZoom = 0;
		this.maxZoom = Infinity;

		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		// How far you can orbit horizontally, upper and lower limits.
		// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
		this.minAzimuthAngle = - Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians

		// Set to true to enable damping (inertia)
		// If damping is enabled, you must call controls.update() in your animation loop
		this.enableDamping = false;
		this.dampingFactor = 0.25;

		// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
		// Set to false to disable zooming
		this.enableZoom = true;
		this.zoomSpeed = 1.0;

		// Set to false to disable rotating
		this.enableRotate = true;
		this.rotateSpeed = 1.0;

		// Set to false to disable panning
		this.enablePan = true;
		this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

		// Set to true to automatically rotate around the target
		// If auto-rotate is enabled, you must call controls.update() in your animation loop
		this.autoRotate = false;
		this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

		// Set to false to disable use of the keys
		this.enableKeys = true;

		// The four arrow keys
		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

		// Mouse buttons
		this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

		// for reset
		this.target0 = this.target.clone();
		this.position0 = this.object.position.clone();
		this.zoom0 = this.object.zoom;

		//
		// public methods
		//

		this.getPolarAngle = function () {

			return spherical.phi;

		};

		this.getAzimuthalAngle = function () {

			return spherical.theta;

		};

		this.reset = function () {

			scope.target.copy( scope.target0 );
			scope.object.position.copy( scope.position0 );
			scope.object.zoom = scope.zoom0;

			scope.object.updateProjectionMatrix();
			scope.dispatchEvent( changeEvent );

			scope.update();

			state = STATE.NONE;

		};

		// this method is exposed, but perhaps it would be better if we can make it private...
		this.update = function() {

			var offset = new THREE.Vector3();

			// so camera.up is the orbit axis
			var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
			var quatInverse = quat.clone().inverse();

			var lastPosition = new THREE.Vector3();
			var lastQuaternion = new THREE.Quaternion();

			return function update () {

				var position = scope.object.position;

				offset.copy( position ).sub( scope.target );

				// rotate offset to "y-axis-is-up" space
				offset.applyQuaternion( quat );

				// angle from z-axis around y-axis
				spherical.setFromVector3( offset );

				if ( scope.autoRotate && state === STATE.NONE ) {

					rotateLeft( getAutoRotationAngle() );

				}

				spherical.theta += sphericalDelta.theta;
				spherical.phi += sphericalDelta.phi;

				// restrict theta to be between desired limits
				spherical.theta = Math.max( scope.minAzimuthAngle, Math.min( scope.maxAzimuthAngle, spherical.theta ) );

				// restrict phi to be between desired limits
				spherical.phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, spherical.phi ) );

				spherical.makeSafe();


				spherical.radius *= scale;

				// restrict radius to be between desired limits
				spherical.radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, spherical.radius ) );

				// move target to panned location
				scope.target.add( panOffset );

				offset.setFromSpherical( spherical );

				// rotate offset back to "camera-up-vector-is-up" space
				offset.applyQuaternion( quatInverse );

				position.copy( scope.target ).add( offset );

				scope.object.lookAt( scope.target );

				if ( scope.enableDamping === true ) {

					sphericalDelta.theta *= ( 1 - scope.dampingFactor );
					sphericalDelta.phi *= ( 1 - scope.dampingFactor );

				} else {

					sphericalDelta.set( 0, 0, 0 );

				}

				scale = 1;
				panOffset.set( 0, 0, 0 );

				// update condition is:
				// min(camera displacement, camera rotation in radians)^2 > EPS
				// using small-angle approximation cos(x/2) = 1 - x^2 / 8

				if ( zoomChanged ||
					lastPosition.distanceToSquared( scope.object.position ) > EPS ||
					8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

					scope.dispatchEvent( changeEvent );

					lastPosition.copy( scope.object.position );
					lastQuaternion.copy( scope.object.quaternion );
					zoomChanged = false;

					return true;

				}

				return false;

			};

		}();

		this.dispose = function() {

			scope.domElement.removeEventListener( 'contextmenu', onContextMenu, false );
			scope.domElement.removeEventListener( 'mousedown', onMouseDown, false );
			scope.domElement.removeEventListener( 'wheel', onMouseWheel, false );

			scope.domElement.removeEventListener( 'touchstart', onTouchStart, false );
			scope.domElement.removeEventListener( 'touchend', onTouchEnd, false );
			scope.domElement.removeEventListener( 'touchmove', onTouchMove, false );

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );

			window.removeEventListener( 'keydown', onKeyDown, false );

			//scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

		};

		//
		// internals
		//

		var scope = this;

		var changeEvent = { type: 'change' };
		var startEvent = { type: 'start' };
		var endEvent = { type: 'end' };

		var STATE = { NONE : - 1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

		var state = STATE.NONE;

		var EPS = 0.000001;

		// current position in spherical coordinates
		var spherical = new THREE.Spherical();
		var sphericalDelta = new THREE.Spherical();

		var scale = 1;
		var panOffset = new THREE.Vector3();
		var zoomChanged = false;

		var rotateStart = new THREE.Vector2();
		var rotateEnd = new THREE.Vector2();
		var rotateDelta = new THREE.Vector2();

		var panStart = new THREE.Vector2();
		var panEnd = new THREE.Vector2();
		var panDelta = new THREE.Vector2();

		var dollyStart = new THREE.Vector2();
		var dollyEnd = new THREE.Vector2();
		var dollyDelta = new THREE.Vector2();

		function getAutoRotationAngle() {

			return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

		}

		function getZoomScale() {

			return Math.pow( 0.95, scope.zoomSpeed );

		}

		function rotateLeft( angle ) {

			sphericalDelta.theta -= angle;

		}

		function rotateUp( angle ) {

			sphericalDelta.phi -= angle;

		}

		var panLeft = function() {

			var v = new THREE.Vector3();

			return function panLeft( distance, objectMatrix ) {

				v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix
				v.multiplyScalar( - distance );

				panOffset.add( v );

			};

		}();

		var panUp = function() {

			var v = new THREE.Vector3();

			return function panUp( distance, objectMatrix ) {

				v.setFromMatrixColumn( objectMatrix, 1 ); // get Y column of objectMatrix
				v.multiplyScalar( distance );

				panOffset.add( v );

			};

		}();

		// deltaX and deltaY are in pixels; right and down are positive
		var pan = function() {

			var offset = new THREE.Vector3();

			return function pan ( deltaX, deltaY ) {

				var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

				if ( scope.object instanceof THREE.PerspectiveCamera ) {

					// perspective
					var position = scope.object.position;
					offset.copy( position ).sub( scope.target );
					var targetDistance = offset.length();

					// half of the fov is center to top of screen
					targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

					// we actually don't use screenWidth, since perspective camera is fixed to screen height
					panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
					panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );

				} else if ( scope.object instanceof THREE.OrthographicCamera ) {

					// orthographic
					panLeft( deltaX * ( scope.object.right - scope.object.left ) / scope.object.zoom / element.clientWidth, scope.object.matrix );
					panUp( deltaY * ( scope.object.top - scope.object.bottom ) / scope.object.zoom / element.clientHeight, scope.object.matrix );

				} else {

					// camera neither orthographic nor perspective
					console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
					scope.enablePan = false;

				}

			};

		}();

		function dollyIn( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale /= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
				scope.enableZoom = false;

			}

		}

		function dollyOut( dollyScale ) {

			if ( scope.object instanceof THREE.PerspectiveCamera ) {

				scale *= dollyScale;

			} else if ( scope.object instanceof THREE.OrthographicCamera ) {

				scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
				scope.object.updateProjectionMatrix();
				zoomChanged = true;

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
				scope.enableZoom = false;

			}

		}

		//
		// event callbacks - update the object state
		//

		function handleMouseDownRotate( event ) {

			//console.log( 'handleMouseDownRotate' );

			rotateStart.set( event.clientX, event.clientY );

		}

		function handleMouseDownDolly( event ) {

			//console.log( 'handleMouseDownDolly' );

			dollyStart.set( event.clientX, event.clientY );

		}

		function handleMouseDownPan( event ) {

			//console.log( 'handleMouseDownPan' );

			panStart.set( event.clientX, event.clientY );

		}

		function handleMouseMoveRotate( event ) {

			//console.log( 'handleMouseMoveRotate' );

			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			// rotating across whole screen goes 360 degrees around
			rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

			scope.update();

		}

		function handleMouseMoveDolly( event ) {

			//console.log( 'handleMouseMoveDolly' );

			dollyEnd.set( event.clientX, event.clientY );

			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				dollyIn( getZoomScale() );

			} else if ( dollyDelta.y < 0 ) {

				dollyOut( getZoomScale() );

			}

			dollyStart.copy( dollyEnd );

			scope.update();

		}

		function handleMouseMovePan( event ) {

			//console.log( 'handleMouseMovePan' );

			panEnd.set( event.clientX, event.clientY );

			panDelta.subVectors( panEnd, panStart );

			pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

			scope.update();

		}

		function handleMouseUp( event ) {

			//console.log( 'handleMouseUp' );

		}

		function handleMouseWheel( event ) {

			//console.log( 'handleMouseWheel' );

			if ( event.deltaY < 0 ) {

				dollyOut( getZoomScale() );

			} else if ( event.deltaY > 0 ) {

				dollyIn( getZoomScale() );

			}

			scope.update();

		}

		function handleKeyDown( event ) {

			//console.log( 'handleKeyDown' );

			switch ( event.keyCode ) {

				case scope.keys.UP:
					pan( 0, scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.BOTTOM:
					pan( 0, - scope.keyPanSpeed );
					scope.update();
					break;

				case scope.keys.LEFT:
					pan( scope.keyPanSpeed, 0 );
					scope.update();
					break;

				case scope.keys.RIGHT:
					pan( - scope.keyPanSpeed, 0 );
					scope.update();
					break;

			}

		}

		function handleTouchStartRotate( event ) {

			//console.log( 'handleTouchStartRotate' );

			rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		}

		function handleTouchStartDolly( event ) {

			//console.log( 'handleTouchStartDolly' );

			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

			var distance = Math.sqrt( dx * dx + dy * dy );

			dollyStart.set( 0, distance );

		}

		function handleTouchStartPan( event ) {

			//console.log( 'handleTouchStartPan' );

			panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

		}

		function handleTouchMoveRotate( event ) {

			//console.log( 'handleTouchMoveRotate' );

			rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

			// rotating across whole screen goes 360 degrees around
			rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

			scope.update();

		}

		function handleTouchMoveDolly( event ) {

			//console.log( 'handleTouchMoveDolly' );

			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

			var distance = Math.sqrt( dx * dx + dy * dy );

			dollyEnd.set( 0, distance );

			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				dollyOut( getZoomScale() );

			} else if ( dollyDelta.y < 0 ) {

				dollyIn( getZoomScale() );

			}

			dollyStart.copy( dollyEnd );

			scope.update();

		}

		function handleTouchMovePan( event ) {

			//console.log( 'handleTouchMovePan' );

			panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

			panDelta.subVectors( panEnd, panStart );

			pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );

			scope.update();

		}

		function handleTouchEnd( event ) {

			//console.log( 'handleTouchEnd' );

		}

		//
		// event handlers - FSM: listen for events and reset state
		//

		function onMouseDown( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			if ( event.button === scope.mouseButtons.ORBIT ) {

				if ( scope.enableRotate === false ) return;

				handleMouseDownRotate( event );

				state = STATE.ROTATE;

			} else if ( event.button === scope.mouseButtons.ZOOM ) {

				if ( scope.enableZoom === false ) return;

				handleMouseDownDolly( event );

				state = STATE.DOLLY;

			} else if ( event.button === scope.mouseButtons.PAN ) {

				if ( scope.enablePan === false ) return;

				handleMouseDownPan( event );

				state = STATE.PAN;

			}

			if ( state !== STATE.NONE ) {

				document.addEventListener( 'mousemove', onMouseMove, false );
				document.addEventListener( 'mouseup', onMouseUp, false );

				scope.dispatchEvent( startEvent );

			}

		}

		function onMouseMove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();

			if ( state === STATE.ROTATE ) {

				if ( scope.enableRotate === false ) return;

				handleMouseMoveRotate( event );

			} else if ( state === STATE.DOLLY ) {

				if ( scope.enableZoom === false ) return;

				handleMouseMoveDolly( event );

			} else if ( state === STATE.PAN ) {

				if ( scope.enablePan === false ) return;

				handleMouseMovePan( event );

			}

		}

		function onMouseUp( event ) {

			if ( scope.enabled === false ) return;

			handleMouseUp( event );

			document.removeEventListener( 'mousemove', onMouseMove, false );
			document.removeEventListener( 'mouseup', onMouseUp, false );

			scope.dispatchEvent( endEvent );

			state = STATE.NONE;

		}

		function onMouseWheel( event ) {

			if ( scope.enabled === false || scope.enableZoom === false || ( state !== STATE.NONE && state !== STATE.ROTATE ) ) return;

			event.preventDefault();
			event.stopPropagation();

			handleMouseWheel( event );

			scope.dispatchEvent( startEvent ); // not sure why these are here...
			scope.dispatchEvent( endEvent );

		}

		function onKeyDown( event ) {

			if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

			handleKeyDown( event );

		}

		function onTouchStart( event ) {

			if ( scope.enabled === false ) return;

			switch ( event.touches.length ) {

				case 1:	// one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;

					handleTouchStartRotate( event );

					state = STATE.TOUCH_ROTATE;

					break;

				case 2:	// two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;

					handleTouchStartDolly( event );

					state = STATE.TOUCH_DOLLY;

					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;

					handleTouchStartPan( event );

					state = STATE.TOUCH_PAN;

					break;

				default:

					state = STATE.NONE;

			}

			if ( state !== STATE.NONE ) {

				scope.dispatchEvent( startEvent );

			}

		}

		function onTouchMove( event ) {

			if ( scope.enabled === false ) return;

			event.preventDefault();
			event.stopPropagation();

			switch ( event.touches.length ) {

				case 1: // one-fingered touch: rotate

					if ( scope.enableRotate === false ) return;
					if ( state !== STATE.TOUCH_ROTATE ) return; // is this needed?...

					handleTouchMoveRotate( event );

					break;

				case 2: // two-fingered touch: dolly

					if ( scope.enableZoom === false ) return;
					if ( state !== STATE.TOUCH_DOLLY ) return; // is this needed?...

					handleTouchMoveDolly( event );

					break;

				case 3: // three-fingered touch: pan

					if ( scope.enablePan === false ) return;
					if ( state !== STATE.TOUCH_PAN ) return; // is this needed?...

					handleTouchMovePan( event );

					break;

				default:

					state = STATE.NONE;

			}

		}

		function onTouchEnd( event ) {

			if ( scope.enabled === false ) return;

			handleTouchEnd( event );

			scope.dispatchEvent( endEvent );

			state = STATE.NONE;

		}

		function onContextMenu( event ) {

			event.preventDefault();

		}

		//

		scope.domElement.addEventListener( 'contextmenu', onContextMenu, false );

		scope.domElement.addEventListener( 'mousedown', onMouseDown, false );
		scope.domElement.addEventListener( 'wheel', onMouseWheel, false );

		scope.domElement.addEventListener( 'touchstart', onTouchStart, false );
		scope.domElement.addEventListener( 'touchend', onTouchEnd, false );
		scope.domElement.addEventListener( 'touchmove', onTouchMove, false );

		window.addEventListener( 'keydown', onKeyDown, false );

		// force an update at start

		this.update();

	};

	OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
	OrbitControls.prototype.constructor = OrbitControls;

	Object.defineProperties( OrbitControls.prototype, {

		center: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .center has been renamed to .target' );
				return this.target;

			}

		},

		// backward compatibility

		noZoom: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				return ! this.enableZoom;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
				this.enableZoom = ! value;

			}

		},

		noRotate: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				return ! this.enableRotate;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
				this.enableRotate = ! value;

			}

		},

		noPan: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				return ! this.enablePan;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
				this.enablePan = ! value;

			}

		},

		noKeys: {

			get: function () {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				return ! this.enableKeys;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
				this.enableKeys = ! value;

			}

		},

		staticMoving : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				return ! this.enableDamping;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
				this.enableDamping = ! value;

			}

		},

		dynamicDampingFactor : {

			get: function () {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				return this.dampingFactor;

			},

			set: function ( value ) {

				console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
				this.dampingFactor = value;

			}

		}

	} );

	return OrbitControls;
};


/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_three__ = __webpack_require__(0);

class CannonDebugRenderer {
    constructor(scene, world, options = {}) {
        options = options || {};
        this.tmpVec0 = new CANNON.Vec3();
        this.tmpVec1 = new CANNON.Vec3();
        this.tmpVec2 = new CANNON.Vec3();
        this.tmpQuat0 = new CANNON.Vec3();
        this.scene = scene;
        this.world = world;
        this._meshes = [];
        this._material = new __WEBPACK_IMPORTED_MODULE_0_three__["MeshBasicMaterial"]({ color: 0x00ff00, wireframe: true });
        this._sphereGeometry = new __WEBPACK_IMPORTED_MODULE_0_three__["SphereGeometry"](1);
        this._boxGeometry = new __WEBPACK_IMPORTED_MODULE_0_three__["BoxGeometry"](1, 1, 1);
        this._planeGeometry = new __WEBPACK_IMPORTED_MODULE_0_three__["PlaneGeometry"](40, 40, 10, 10);
        this._cylinderGeometry = new __WEBPACK_IMPORTED_MODULE_0_three__["CylinderGeometry"](1, 1, 10, 10);
    }
    update() {
        let bodies = this.world.bodies;
        let meshes = this._meshes;
        let shapeWorldPosition = this.tmpVec0;
        let shapeWorldQuaternion = this.tmpQuat0;
        let meshIndex = 0;
        for (let i = 0; i !== bodies.length; i++) {
            let body = bodies[i];
            for (let j = 0; j !== body.shapes.length; j++) {
                let shape = body.shapes[j];
                this._updateMesh(meshIndex, body, shape);
                let mesh = meshes[meshIndex];
                if (mesh) {
                    body.quaternion.vmult(body.shapeOffsets[j], shapeWorldPosition);
                    body.position.vadd(shapeWorldPosition, shapeWorldPosition);
                    body.quaternion.mult(body.shapeOrientations[j], shapeWorldQuaternion);
                    mesh.position.copy(shapeWorldPosition);
                    mesh.quaternion.copy(shapeWorldQuaternion);
                }
                meshIndex++;
            }
        }
        for (let i = meshIndex; i < meshes.length; i++) {
            let mesh = meshes[i];
            if (mesh) {
                this.scene.remove(mesh);
            }
        }
        meshes.length = meshIndex;
    }
    _updateMesh(index, body, shape) {
        let mesh = this._meshes[index];
        if (!this._typeMatch(mesh, shape)) {
            if (mesh) {
                this.scene.remove(mesh);
            }
            mesh = this._meshes[index] = this._createMesh(shape);
        }
        this._scaleMesh(mesh, shape);
    }
    _typeMatch(mesh, shape) {
        if (!mesh) {
            return false;
        }
        let geo = mesh.geometry;
        return ((geo instanceof __WEBPACK_IMPORTED_MODULE_0_three__["SphereGeometry"] && shape instanceof CANNON.Sphere) ||
            (geo instanceof __WEBPACK_IMPORTED_MODULE_0_three__["BoxGeometry"] && shape instanceof CANNON.Box) ||
            (geo instanceof __WEBPACK_IMPORTED_MODULE_0_three__["PlaneGeometry"] && shape instanceof CANNON.Plane) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.ConvexPolyhedron) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.Trimesh) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.Heightfield));
    }
    _createMesh(shape) {
        let mesh;
        let material = this._material;
        let geometry;
        let v0, v1, v2;
        switch (shape.type) {
            case CANNON.Shape.types.SPHERE:
                mesh = new __WEBPACK_IMPORTED_MODULE_0_three__["Mesh"](this._sphereGeometry, material);
                break;
            case CANNON.Shape.types.BOX:
                mesh = new __WEBPACK_IMPORTED_MODULE_0_three__["Mesh"](this._boxGeometry, material);
                break;
            case CANNON.Shape.types.PLANE:
                mesh = new __WEBPACK_IMPORTED_MODULE_0_three__["Mesh"](this._planeGeometry, material);
                break;
            case CANNON.Shape.types.CONVEXPOLYHEDRON:
                let geo = new __WEBPACK_IMPORTED_MODULE_0_three__["Geometry"]();
                for (let i = 0; i < shape.vertices.length; i++) {
                    let v = shape.vertices[i];
                    geo.vertices.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](v.x, v.y, v.z));
                }
                for (let i = 0; i < shape.faces.length; i++) {
                    let face = shape.faces[i];
                    let a = face[0];
                    for (let j = 1; j < face.length - 1; j++) {
                        let b = face[j];
                        let c = face[j + 1];
                        geo.faces.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Face3"](a, b, c));
                    }
                }
                geo.computeBoundingSphere();
                geo.computeFaceNormals();
                mesh = new __WEBPACK_IMPORTED_MODULE_0_three__["Mesh"](geo, material);
                shape.geometryId = geo.id;
                break;
            case CANNON.Shape.types.TRIMESH:
                geometry = new __WEBPACK_IMPORTED_MODULE_0_three__["Geometry"]();
                v0 = this.tmpVec0;
                v1 = this.tmpVec1;
                v2 = this.tmpVec2;
                for (let i = 0; i < shape.indices.length / 3; i++) {
                    shape.getTriangleVertices(i, v0, v1, v2);
                    geometry.vertices.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](v0.x, v0.y, v0.z), new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](v1.x, v1.y, v1.z), new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](v2.x, v2.y, v2.z));
                    let j = geometry.vertices.length - 3;
                    geometry.faces.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Face3"](j, j + 1, j + 2));
                }
                geometry.computeBoundingSphere();
                geometry.computeFaceNormals();
                mesh = new __WEBPACK_IMPORTED_MODULE_0_three__["Mesh"](geometry, material);
                shape.geometryId = geometry.id;
                break;
            case CANNON.Shape.types.HEIGHTFIELD:
                geometry = new __WEBPACK_IMPORTED_MODULE_0_three__["Geometry"]();
                v0 = this.tmpVec0;
                v1 = this.tmpVec1;
                v2 = this.tmpVec2;
                for (var xi = 0; xi < shape.data.length - 1; xi++) {
                    for (var yi = 0; yi < shape.data[xi].length - 1; yi++) {
                        for (var k = 0; k < 2; k++) {
                            shape.getConvexTrianglePillar(xi, yi, k === 0);
                            v0.copy(shape.pillarConvex.vertices[0]);
                            v1.copy(shape.pillarConvex.vertices[1]);
                            v2.copy(shape.pillarConvex.vertices[2]);
                            v0.vadd(shape.pillarOffset, v0);
                            v1.vadd(shape.pillarOffset, v1);
                            v2.vadd(shape.pillarOffset, v2);
                            geometry.vertices.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](v0.x, v0.y, v0.z), new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](v1.x, v1.y, v1.z), new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](v2.x, v2.y, v2.z));
                            let i = geometry.vertices.length - 3;
                            geometry.faces.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Face3"](i, i + 1, i + 2));
                        }
                    }
                }
                geometry.computeBoundingSphere();
                geometry.computeFaceNormals();
                mesh = new __WEBPACK_IMPORTED_MODULE_0_three__["Mesh"](geometry, material);
                shape.geometryId = geometry.id;
                break;
        }
        if (mesh) {
            this.scene.add(mesh);
        }
        return mesh;
    }
    _scaleMesh(mesh, shape) {
        switch (shape.type) {
            case CANNON.Shape.types.SPHERE:
                let radius = shape.radius;
                mesh.scale.set(radius, radius, radius);
                break;
            case CANNON.Shape.types.BOX:
                mesh.scale.copy(shape.halfExtents);
                mesh.scale.multiplyScalar(2);
                break;
            case CANNON.Shape.types.CONVEXPOLYHEDRON:
                mesh.scale.set(1, 1, 1);
                break;
            case CANNON.Shape.types.TRIMESH:
                mesh.scale.copy(shape.scale);
                break;
            case CANNON.Shape.types.HEIGHTFIELD:
                mesh.scale.set(1, 1, 1);
                break;
        }
    }
}
/* harmony export (immutable) */ __webpack_exports__["a"] = CannonDebugRenderer;



/***/ }),
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_three__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__RGBELoader__ = __webpack_require__(22);


class HDRCubeTextureLoader {
    constructor(manager = undefined) {
        this.manager = __WEBPACK_IMPORTED_MODULE_0_three__["DefaultLoadingManager"];
        this.hdrLoader = new __WEBPACK_IMPORTED_MODULE_1__RGBELoader__["a" /* default */]();
    }
    load(type, urls, onLoad, onProgress = undefined, onError = undefined) {
        let RGBEByteToRGBFloat = function (sourceArray, sourceOffset, destArray, destOffset) {
            let e = sourceArray[sourceOffset + 3];
            let scale = Math.pow(2.0, e - 128.0) / 255.0;
            destArray[destOffset + 0] = sourceArray[sourceOffset + 0] * scale;
            destArray[destOffset + 1] = sourceArray[sourceOffset + 1] * scale;
            destArray[destOffset + 2] = sourceArray[sourceOffset + 2] * scale;
        };
        let RGBEByteToRGBHalf = (function () {
            let floatView = new Float32Array(1);
            let int32View = new Int32Array(floatView.buffer);
            function toHalf(val) {
                floatView[0] = val;
                let x = int32View[0];
                let bits = (x >> 16) & 0x8000;
                let m = (x >> 12) & 0x07ff;
                let e = (x >> 23) & 0xff;
                if (e < 103)
                    return bits;
                if (e > 142) {
                    bits |= 0x7c00;
                    bits |= ((e == 255) ? 0 : 1) && (x & 0x007fffff);
                    return bits;
                }
                if (e < 113) {
                    m |= 0x0800;
                    bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1);
                    return bits;
                }
                bits |= ((e - 112) << 10) | (m >> 1);
                bits += m & 1;
                return bits;
            }
            return function (sourceArray, sourceOffset, destArray, destOffset) {
                let e = sourceArray[sourceOffset + 3];
                let scale = Math.pow(2.0, e - 128.0) / 255.0;
                destArray[destOffset + 0] = toHalf(sourceArray[sourceOffset + 0] * scale);
                destArray[destOffset + 1] = toHalf(sourceArray[sourceOffset + 1] * scale);
                destArray[destOffset + 2] = toHalf(sourceArray[sourceOffset + 2] * scale);
            };
        })();
        let texture = new __WEBPACK_IMPORTED_MODULE_0_three__["CubeTexture"]();
        texture.type = type;
        texture.encoding = (type === __WEBPACK_IMPORTED_MODULE_0_three__["UnsignedByteType"]) ? __WEBPACK_IMPORTED_MODULE_0_three__["RGBEEncoding"] : __WEBPACK_IMPORTED_MODULE_0_three__["LinearEncoding"];
        texture.format = (type === __WEBPACK_IMPORTED_MODULE_0_three__["UnsignedByteType"]) ? __WEBPACK_IMPORTED_MODULE_0_three__["RGBAFormat"] : __WEBPACK_IMPORTED_MODULE_0_three__["RGBFormat"];
        texture.minFilter = (texture.encoding === __WEBPACK_IMPORTED_MODULE_0_three__["RGBEEncoding"]) ? __WEBPACK_IMPORTED_MODULE_0_three__["NearestFilter"] : __WEBPACK_IMPORTED_MODULE_0_three__["LinearFilter"];
        texture.magFilter = (texture.encoding === __WEBPACK_IMPORTED_MODULE_0_three__["RGBEEncoding"]) ? __WEBPACK_IMPORTED_MODULE_0_three__["NearestFilter"] : __WEBPACK_IMPORTED_MODULE_0_three__["LinearFilter"];
        texture.generateMipmaps = (texture.encoding !== __WEBPACK_IMPORTED_MODULE_0_three__["RGBEEncoding"]);
        texture.anisotropy = 0;
        let scope = this.hdrLoader;
        let loaded = 0;
        let loadHDRData = (i, onLoad, onProgress, onError) => {
            let loader = new __WEBPACK_IMPORTED_MODULE_0_three__["FileLoader"](this.manager);
            loader.setResponseType('arraybuffer');
            loader.load(urls[i], (buffer) => {
                loaded++;
                let texData = this.hdrLoader._parser(buffer);
                if (!texData)
                    return;
                if (type === __WEBPACK_IMPORTED_MODULE_0_three__["FloatType"]) {
                    let numElements = (texData.data.length / 4) * 3;
                    let floatdata = new Float32Array(numElements);
                    for (let j = 0; j < numElements; j++) {
                        RGBEByteToRGBFloat(texData.data, j * 4, floatdata, j * 3);
                    }
                    texData.data = floatdata;
                }
                else if (type === __WEBPACK_IMPORTED_MODULE_0_three__["HalfFloatType"]) {
                    let numElements = (texData.data.length / 4) * 3;
                    let halfdata = new Uint16Array(numElements);
                    for (let j = 0; j < numElements; j++) {
                        RGBEByteToRGBHalf(texData.data, j * 4, halfdata, j * 3);
                    }
                    texData.data = halfdata;
                }
                if (undefined !== texData.image) {
                    texture[i].images = texData.image;
                }
                else if (undefined !== texData.data) {
                    let dataTexture = new __WEBPACK_IMPORTED_MODULE_0_three__["DataTexture"](texData.data, texData.width, texData.height);
                    dataTexture.format = texture.format;
                    dataTexture.type = texture.type;
                    dataTexture.encoding = texture.encoding;
                    dataTexture.minFilter = texture.minFilter;
                    dataTexture.magFilter = texture.magFilter;
                    dataTexture.generateMipmaps = texture.generateMipmaps;
                    texture.images[i] = dataTexture;
                }
                if (loaded === 6) {
                    texture.needsUpdate = true;
                    if (onLoad)
                        onLoad(texture);
                }
            }, onProgress, onError);
        };
        for (let i = 0; i < urls.length; i++) {
            loadHDRData(i, onLoad, onProgress, onError);
        }
        return texture;
    }
    ;
}
/* harmony default export */ __webpack_exports__["a"] = HDRCubeTextureLoader;


/***/ }),
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_three__ = __webpack_require__(0);

class PMREMCubeUVPacker {
    constructor(cubeTextureLods, numLods = undefined) {
        this.cubeLods = cubeTextureLods;
        this.numLods = numLods;
        let size = cubeTextureLods[0].width * 4;
        let sourceTexture = cubeTextureLods[0].texture;
        let params = {
            format: sourceTexture.format,
            magFilter: sourceTexture.magFilter,
            minFilter: sourceTexture.minFilter,
            type: sourceTexture.type,
            generateMipmaps: sourceTexture.generateMipmaps,
            anisotropy: sourceTexture.anisotropy,
            encoding: sourceTexture.encoding
        };
        if (sourceTexture.encoding === __WEBPACK_IMPORTED_MODULE_0_three__["RGBM16Encoding"]) {
            params.magFilter = __WEBPACK_IMPORTED_MODULE_0_three__["LinearFilter"];
            params.minFilter = __WEBPACK_IMPORTED_MODULE_0_three__["LinearFilter"];
        }
        this.CubeUVRenderTarget = new __WEBPACK_IMPORTED_MODULE_0_three__["WebGLRenderTarget"](size, size, params);
        this.CubeUVRenderTarget.texture.name = "PMREMCubeUVPacker.cubeUv";
        this.CubeUVRenderTarget.texture.mapping = __WEBPACK_IMPORTED_MODULE_0_three__["CubeUVReflectionMapping"];
        this.camera = new __WEBPACK_IMPORTED_MODULE_0_three__["OrthographicCamera"](-size * 0.5, size * 0.5, -size * 0.5, size * 0.5, 0.0, 1000);
        this.scene = new __WEBPACK_IMPORTED_MODULE_0_three__["Scene"]();
        this.scene.add(this.camera);
        this.objects = [];
        let xOffset = 0;
        let faceOffsets = [];
        faceOffsets.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](0, 0));
        faceOffsets.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](1, 0));
        faceOffsets.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](2, 0));
        faceOffsets.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](0, 1));
        faceOffsets.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](1, 1));
        faceOffsets.push(new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](2, 1));
        let yOffset = 0;
        let textureResolution = size;
        size = cubeTextureLods[0].width;
        let offset2 = 0;
        let c = 4.0;
        this.numLods = Math.log(cubeTextureLods[0].width) / Math.log(2) - 2;
        for (let i = 0; i < this.numLods; i++) {
            let offset1 = (textureResolution - textureResolution / c) * 0.5;
            if (size > 16)
                c *= 2;
            let nMips = size > 16 ? 6 : 1;
            let mipOffsetX = 0;
            let mipOffsetY = 0;
            let mipSize = size;
            for (let j = 0; j < nMips; j++) {
                for (let k = 0; k < 6; k++) {
                    let material = this.getShader();
                    material.uniforms['envMap'].value = this.cubeLods[i].texture;
                    material.envMap = this.cubeLods[i].texture;
                    material.uniforms['faceIndex'].value = k;
                    material.uniforms['mapSize'].value = mipSize;
                    let color = material.uniforms['testColor'].value;
                    let planeMesh = new __WEBPACK_IMPORTED_MODULE_0_three__["Mesh"](new __WEBPACK_IMPORTED_MODULE_0_three__["PlaneGeometry"](mipSize, mipSize, 0), material);
                    planeMesh.position.x = faceOffsets[k].x * mipSize - offset1 + mipOffsetX;
                    planeMesh.position.y = faceOffsets[k].y * mipSize - offset1 + offset2 + mipOffsetY;
                    planeMesh.material.side = __WEBPACK_IMPORTED_MODULE_0_three__["DoubleSide"];
                    this.scene.add(planeMesh);
                    this.objects.push(planeMesh);
                }
                mipOffsetY += 1.75 * mipSize;
                mipOffsetX += 1.25 * mipSize;
                mipSize /= 2;
            }
            offset2 += 2 * size;
            if (size > 16)
                size /= 2;
        }
    }
    update(renderer) {
        let gammaInput = renderer.gammaInput;
        let gammaOutput = renderer.gammaOutput;
        let toneMapping = renderer.toneMapping;
        let toneMappingExposure = renderer.toneMappingExposure;
        renderer.gammaInput = false;
        renderer.gammaOutput = false;
        renderer.toneMapping = __WEBPACK_IMPORTED_MODULE_0_three__["LinearToneMapping"];
        renderer.toneMappingExposure = 1.0;
        renderer.render(this.scene, this.camera, this.CubeUVRenderTarget, false);
        renderer.toneMapping = toneMapping;
        renderer.toneMappingExposure = toneMappingExposure;
        renderer.gammaInput = gammaInput;
        renderer.gammaOutput = gammaOutput;
    }
    getShader() {
        let shaderMaterial = new __WEBPACK_IMPORTED_MODULE_0_three__["ShaderMaterial"]({
            uniforms: {
                "faceIndex": { value: 0 },
                "mapSize": { value: 0 },
                "envMap": { value: null },
                "testColor": { value: new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](1, 1, 1) }
            },
            vertexShader: "precision highp float;\
        letying vec2 vUv;\
        void main() {\
          vUv = uv;\
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\
        }",
            fragmentShader: "precision highp float;\
        letying vec2 vUv;\
        uniform samplerCube envMap;\
        uniform float mapSize;\
        uniform vec3 testColor;\
        uniform int faceIndex;\
        \
        void main() {\
          vec3 sampleDirection;\
          vec2 uv = vUv;\
          uv = uv * 2.0 - 1.0;\
          uv.y *= -1.0;\
          if(faceIndex == 0) {\
            sampleDirection = normalize(vec3(1.0, uv.y, -uv.x));\
          } else if(faceIndex == 1) {\
            sampleDirection = normalize(vec3(uv.x, 1.0, uv.y));\
          } else if(faceIndex == 2) {\
            sampleDirection = normalize(vec3(uv.x, uv.y, 1.0));\
          } else if(faceIndex == 3) {\
            sampleDirection = normalize(vec3(-1.0, uv.y, uv.x));\
          } else if(faceIndex == 4) {\
            sampleDirection = normalize(vec3(uv.x, -1.0, -uv.y));\
          } else {\
            sampleDirection = normalize(vec3(-uv.x, uv.y, -1.0));\
          }\
          vec4 color = envMapTexelToLinear( textureCube( envMap, sampleDirection ) );\
          gl_FragColor = linearToOutputTexel( color );\
        }",
            blending: __WEBPACK_IMPORTED_MODULE_0_three__["CustomBlending"],
            premultipliedAlpha: false,
            blendSrc: __WEBPACK_IMPORTED_MODULE_0_three__["OneFactor"],
            blendDst: __WEBPACK_IMPORTED_MODULE_0_three__["ZeroFactor"],
            blendSrcAlpha: __WEBPACK_IMPORTED_MODULE_0_three__["OneFactor"],
            blendDstAlpha: __WEBPACK_IMPORTED_MODULE_0_three__["ZeroFactor"],
            blendEquation: __WEBPACK_IMPORTED_MODULE_0_three__["AddEquation"]
        });
        return shaderMaterial;
    }
}
/* harmony default export */ __webpack_exports__["a"] = PMREMCubeUVPacker;


/***/ }),
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_three__ = __webpack_require__(0);

class PMREMGenerator {
    constructor(sourceTexture, samplesPerLevel = undefined, resolution = undefined) {
        this.sourceTexture = sourceTexture;
        this.resolution = (resolution !== undefined) ? resolution : 256;
        this.samplesPerLevel = (samplesPerLevel !== undefined) ? samplesPerLevel : 16;
        let monotonicEncoding = (sourceTexture.encoding === __WEBPACK_IMPORTED_MODULE_0_three__["LinearEncoding"]) ||
            (sourceTexture.encoding === __WEBPACK_IMPORTED_MODULE_0_three__["GammaEncoding"]) || (sourceTexture.encoding === __WEBPACK_IMPORTED_MODULE_0_three__["sRGBEncoding"]);
        this.sourceTexture.minFilter = (monotonicEncoding) ? __WEBPACK_IMPORTED_MODULE_0_three__["LinearFilter"] : __WEBPACK_IMPORTED_MODULE_0_three__["NearestFilter"];
        this.sourceTexture.magFilter = (monotonicEncoding) ? __WEBPACK_IMPORTED_MODULE_0_three__["LinearFilter"] : __WEBPACK_IMPORTED_MODULE_0_three__["NearestFilter"];
        this.sourceTexture.generateMipmaps = this.sourceTexture.generateMipmaps && monotonicEncoding;
        this.cubeLods = [];
        let size = this.resolution;
        let params = {
            format: this.sourceTexture.format,
            magFilter: this.sourceTexture.magFilter,
            minFilter: this.sourceTexture.minFilter,
            type: this.sourceTexture.type,
            generateMipmaps: this.sourceTexture.generateMipmaps,
            anisotropy: this.sourceTexture.anisotropy,
            encoding: this.sourceTexture.encoding
        };
        this.numLods = Math.log(size) / Math.log(2) - 2;
        for (let i = 0; i < this.numLods; i++) {
            let renderTarget = new __WEBPACK_IMPORTED_MODULE_0_three__["WebGLRenderTargetCube"](size, size, params);
            renderTarget.texture.name = "PMREMGenerator.cube" + i;
            this.cubeLods.push(renderTarget);
            size = Math.max(16, size / 2);
        }
        this.camera = new __WEBPACK_IMPORTED_MODULE_0_three__["OrthographicCamera"](-1, 1, 1, -1, 0.0, 1000);
        this.shader = this.getShader();
        this.shader.defines['SAMPLES_PER_LEVEL'] = this.samplesPerLevel;
        this.planeMesh = new __WEBPACK_IMPORTED_MODULE_0_three__["Mesh"](new __WEBPACK_IMPORTED_MODULE_0_three__["PlaneGeometry"](2, 2, 0), this.shader);
        this.planeMesh.material.side = __WEBPACK_IMPORTED_MODULE_0_three__["DoubleSide"];
        this.scene = new __WEBPACK_IMPORTED_MODULE_0_three__["Scene"]();
        this.scene.add(this.planeMesh);
        this.scene.add(this.camera);
        this.shader.uniforms['envMap'].value = this.sourceTexture;
        this.shader.envMap = this.sourceTexture;
    }
    update(renderer) {
        this.shader.uniforms['envMap'].value = this.sourceTexture;
        this.shader.envMap = this.sourceTexture;
        let gammaInput = renderer.gammaInput;
        let gammaOutput = renderer.gammaOutput;
        let toneMapping = renderer.toneMapping;
        let toneMappingExposure = renderer.toneMappingExposure;
        renderer.toneMapping = __WEBPACK_IMPORTED_MODULE_0_three__["LinearToneMapping"];
        renderer.toneMappingExposure = 1.0;
        renderer.gammaInput = false;
        renderer.gammaOutput = false;
        for (let i = 0; i < this.numLods; i++) {
            let r = i / (this.numLods - 1);
            this.shader.uniforms['roughness'].value = r * 0.9;
            this.shader.uniforms['queryScale'].value.x = (i == 0) ? -1 : 1;
            let size = this.cubeLods[i].width;
            this.shader.uniforms['mapSize'].value = size;
            this.renderToCubeMapTarget(renderer, this.cubeLods[i]);
            if (i < 5)
                this.shader.uniforms['envMap'].value = this.cubeLods[i].texture;
        }
        renderer.toneMapping = toneMapping;
        renderer.toneMappingExposure = toneMappingExposure;
        renderer.gammaInput = gammaInput;
        renderer.gammaOutput = gammaOutput;
    }
    renderToCubeMapTargetFace(renderer, renderTarget, faceIndex) {
        renderTarget.activeCubeFace = faceIndex;
        this.shader.uniforms['faceIndex'].value = faceIndex;
        renderer.render(this.scene, this.camera, renderTarget, true);
    }
    renderToCubeMapTarget(renderer, renderTarget) {
        for (let i = 0; i < 6; i++) {
            this.renderToCubeMapTargetFace(renderer, renderTarget, i);
        }
    }
    getShader() {
        return new __WEBPACK_IMPORTED_MODULE_0_three__["ShaderMaterial"]({
            defines: {
                "SAMPLES_PER_LEVEL": 20,
            },
            uniforms: {
                "faceIndex": { value: 0 },
                "roughness": { value: 0.5 },
                "mapSize": { value: 0.5 },
                "envMap": { value: null },
                "queryScale": { value: new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](1, 1, 1) },
                "testColor": { value: new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](1, 1, 1) },
            },
            vertexShader: "letying vec2 vUv;\n\
        void main() {\n\
          vUv = uv;\n\
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
        }",
            fragmentShader: "#include <common>\n\
        letying vec2 vUv;\n\
        uniform int faceIndex;\n\
        uniform float roughness;\n\
        uniform samplerCube envMap;\n\
        uniform float mapSize;\n\
        uniform vec3 testColor;\n\
        uniform vec3 queryScale;\n\
        \n\
        float GGXRoughnessToBlinnExponent( const in float ggxRoughness ) {\n\
          float a = ggxRoughness + 0.0001;\n\
          a *= a;\n\
          return ( 2.0 / a - 2.0 );\n\
        }\n\
        vec3 ImportanceSamplePhong(vec2 uv, mat3 vecSpace, float specPow) {\n\
          float phi = uv.y * 2.0 * PI;\n\
          float cosTheta = pow(1.0 - uv.x, 1.0 / (specPow + 1.0));\n\
          float sinTheta = sqrt(1.0 - cosTheta * cosTheta);\n\
          vec3 sampleDir = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);\n\
          return vecSpace * sampleDir;\n\
        }\n\
        vec3 ImportanceSampleGGX( vec2 uv, mat3 vecSpace, float Roughness )\n\
        {\n\
          float a = Roughness * Roughness;\n\
          float Phi = 2.0 * PI * uv.x;\n\
          float CosTheta = sqrt( (1.0 - uv.y) / ( 1.0 + (a*a - 1.0) * uv.y ) );\n\
          float SinTheta = sqrt( 1.0 - CosTheta * CosTheta );\n\
          return vecSpace * vec3(SinTheta * cos( Phi ), SinTheta * sin( Phi ), CosTheta);\n\
        }\n\
        mat3 matrixFromVector(vec3 n) {\n\
          float a = 1.0 / (1.0 + n.z);\n\
          float b = -n.x * n.y * a;\n\
          vec3 b1 = vec3(1.0 - n.x * n.x * a, b, -n.x);\n\
          vec3 b2 = vec3(b, 1.0 - n.y * n.y * a, -n.y);\n\
          return mat3(b1, b2, n);\n\
        }\n\
        \n\
        vec4 testColorMap(float Roughness) {\n\
          vec4 color;\n\
          if(faceIndex == 0)\n\
            color = vec4(1.0,0.0,0.0,1.0);\n\
          else if(faceIndex == 1)\n\
            color = vec4(0.0,1.0,0.0,1.0);\n\
          else if(faceIndex == 2)\n\
            color = vec4(0.0,0.0,1.0,1.0);\n\
          else if(faceIndex == 3)\n\
            color = vec4(1.0,1.0,0.0,1.0);\n\
          else if(faceIndex == 4)\n\
            color = vec4(0.0,1.0,1.0,1.0);\n\
          else\n\
            color = vec4(1.0,0.0,1.0,1.0);\n\
          color *= ( 1.0 - Roughness );\n\
          return color;\n\
        }\n\
        void main() {\n\
          vec3 sampleDirection;\n\
          vec2 uv = vUv*2.0 - 1.0;\n\
          float offset = -1.0/mapSize;\n\
          const float a = -1.0;\n\
          const float b = 1.0;\n\
          float c = -1.0 + offset;\n\
          float d = 1.0 - offset;\n\
          float bminusa = b - a;\n\
          uv.x = (uv.x - a)/bminusa * d - (uv.x - b)/bminusa * c;\n\
          uv.y = (uv.y - a)/bminusa * d - (uv.y - b)/bminusa * c;\n\
          if (faceIndex==0) {\n\
            sampleDirection = vec3(1.0, -uv.y, -uv.x);\n\
          } else if (faceIndex==1) {\n\
            sampleDirection = vec3(-1.0, -uv.y, uv.x);\n\
          } else if (faceIndex==2) {\n\
            sampleDirection = vec3(uv.x, 1.0, uv.y);\n\
          } else if (faceIndex==3) {\n\
            sampleDirection = vec3(uv.x, -1.0, -uv.y);\n\
          } else if (faceIndex==4) {\n\
            sampleDirection = vec3(uv.x, -uv.y, 1.0);\n\
          } else {\n\
            sampleDirection = vec3(-uv.x, -uv.y, -1.0);\n\
          }\n\
          mat3 vecSpace = matrixFromVector(normalize(sampleDirection * queryScale));\n\
          vec3 rgbColor = vec3(0.0);\n\
          const int NumSamples = SAMPLES_PER_LEVEL;\n\
          vec3 vect;\n\
          float weight = 0.0;\n\
          for( int i = 0; i < NumSamples; i ++ ) {\n\
            float sini = sin(float(i));\n\
            float cosi = cos(float(i));\n\
            float r = rand(vec2(sini, cosi));\n\
            vect = ImportanceSampleGGX(vec2(float(i) / float(NumSamples), r), vecSpace, roughness);\n\
            float dotProd = dot(vect, normalize(sampleDirection));\n\
            weight += dotProd;\n\
            vec3 color = envMapTexelToLinear(textureCube(envMap,vect)).rgb;\n\
            rgbColor.rgb += color;\n\
          }\n\
          rgbColor /= float(NumSamples);\n\
          //rgbColor = testColorMap( roughness ).rgb;\n\
          gl_FragColor = linearToOutputTexel( vec4( rgbColor, 1.0 ) );\n\
        }",
            blending: __WEBPACK_IMPORTED_MODULE_0_three__["CustomBlending"],
            blendSrc: __WEBPACK_IMPORTED_MODULE_0_three__["OneFactor"],
            blendDst: __WEBPACK_IMPORTED_MODULE_0_three__["ZeroFactor"],
            blendSrcAlpha: __WEBPACK_IMPORTED_MODULE_0_three__["OneFactor"],
            blendDstAlpha: __WEBPACK_IMPORTED_MODULE_0_three__["ZeroFactor"],
            blendEquation: __WEBPACK_IMPORTED_MODULE_0_three__["AddEquation"]
        });
    }
}
/* harmony default export */ __webpack_exports__["a"] = PMREMGenerator;


/***/ }),
/* 12 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_three__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__Pass__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__LuminosityHighPassShader__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_three_effectcomposer_es6__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_three_effectcomposer_es6___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_3_three_effectcomposer_es6__);




class UnrealBloomPass extends __WEBPACK_IMPORTED_MODULE_1__Pass__["a" /* default */] {
    constructor(resolution, strength, radius, threshold) {
        super();
        this.BlurDirectionX = new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](1.0, 0.0);
        this.BlurDirectionY = new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](0.0, 1.0);
        this.strength = (strength !== undefined) ? strength : 1;
        this.radius = radius;
        this.threshold = threshold;
        this.resolution = (resolution !== undefined) ? new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](resolution.x, resolution.y) : new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](256, 256);
        let pars = { minFilter: __WEBPACK_IMPORTED_MODULE_0_three__["LinearFilter"], magFilter: __WEBPACK_IMPORTED_MODULE_0_three__["LinearFilter"], format: __WEBPACK_IMPORTED_MODULE_0_three__["RGBAFormat"] };
        this.renderTargetsHorizontal = [];
        this.renderTargetsVertical = [];
        this.nMips = 5;
        var resx = Math.round(this.resolution.x / 2);
        var resy = Math.round(this.resolution.y / 2);
        this.renderTargetBright = new __WEBPACK_IMPORTED_MODULE_0_three__["WebGLRenderTarget"](resx, resy, pars);
        this.renderTargetBright.texture.generateMipmaps = false;
        for (let i = 0; i < this.nMips; i++) {
            var renderTarget = new __WEBPACK_IMPORTED_MODULE_0_three__["WebGLRenderTarget"](resx, resy, pars);
            renderTarget.texture.generateMipmaps = false;
            this.renderTargetsHorizontal.push(renderTarget);
            var renderTarget = new __WEBPACK_IMPORTED_MODULE_0_three__["WebGLRenderTarget"](resx, resy, pars);
            renderTarget.texture.generateMipmaps = false;
            this.renderTargetsVertical.push(renderTarget);
            resx = Math.round(resx / 2);
            resy = Math.round(resy / 2);
        }
        let highPassShader = __WEBPACK_IMPORTED_MODULE_2__LuminosityHighPassShader__["a" /* default */];
        this.highPassUniforms = __WEBPACK_IMPORTED_MODULE_0_three__["UniformsUtils"].clone(highPassShader.uniforms);
        this.highPassUniforms["luminosityThreshold"].value = threshold;
        this.highPassUniforms["smoothWidth"].value = 0.01;
        this.materialHighPassFilter = new __WEBPACK_IMPORTED_MODULE_0_three__["ShaderMaterial"]({
            uniforms: this.highPassUniforms,
            vertexShader: highPassShader.vertexShader,
            fragmentShader: highPassShader.fragmentShader,
            defines: {}
        });
        this.separableBlurMaterials = [];
        let kernelSizeArray = [3, 5, 7, 9, 11];
        var resx = Math.round(this.resolution.x / 2);
        var resy = Math.round(this.resolution.y / 2);
        for (let i = 0; i < this.nMips; i++) {
            this.separableBlurMaterials.push(this.getSeperableBlurMaterial(kernelSizeArray[i]));
            this.separableBlurMaterials[i].uniforms["texSize"].value = new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](resx, resy);
            resx = Math.round(resx / 2);
            resy = Math.round(resy / 2);
        }
        this.compositeMaterial = this.getCompositeMaterial(this.nMips);
        this.compositeMaterial.uniforms["blurTexture1"].value = this.renderTargetsVertical[0].texture;
        this.compositeMaterial.uniforms["blurTexture2"].value = this.renderTargetsVertical[1].texture;
        this.compositeMaterial.uniforms["blurTexture3"].value = this.renderTargetsVertical[2].texture;
        this.compositeMaterial.uniforms["blurTexture4"].value = this.renderTargetsVertical[3].texture;
        this.compositeMaterial.uniforms["blurTexture5"].value = this.renderTargetsVertical[4].texture;
        this.compositeMaterial.uniforms["bloomStrength"].value = strength;
        this.compositeMaterial.uniforms["bloomRadius"].value = 0.1;
        this.compositeMaterial.needsUpdate = true;
        let bloomFactors = [1.0, 0.8, 0.6, 0.4, 0.2];
        this.compositeMaterial.uniforms["bloomFactors"].value = bloomFactors;
        this.bloomTintColors = [new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](1, 1, 1), new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](1, 1, 1), new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](1, 1, 1),
            new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](1, 1, 1), new __WEBPACK_IMPORTED_MODULE_0_three__["Vector3"](1, 1, 1)];
        this.compositeMaterial.uniforms["bloomTintColors"].value = this.bloomTintColors;
        let copyShader = __WEBPACK_IMPORTED_MODULE_3_three_effectcomposer_es6__["CopyShader"];
        this.copyUniforms = __WEBPACK_IMPORTED_MODULE_0_three__["UniformsUtils"].clone(copyShader.uniforms);
        this.copyUniforms["opacity"].value = 1.0;
        this.materialCopy = new __WEBPACK_IMPORTED_MODULE_0_three__["ShaderMaterial"]({
            uniforms: this.copyUniforms,
            vertexShader: copyShader.vertexShader,
            fragmentShader: copyShader.fragmentShader,
            blending: __WEBPACK_IMPORTED_MODULE_0_three__["AdditiveBlending"],
            depthTest: false,
            depthWrite: false,
            transparent: true
        });
        this.enabled = true;
        this.needsSwap = false;
        this.oldClearColor = new __WEBPACK_IMPORTED_MODULE_0_three__["Color"]();
        this.oldClearAlpha = 1;
        this.camera = new __WEBPACK_IMPORTED_MODULE_0_three__["OrthographicCamera"](-1, 1, 1, -1, 0, 1);
        this.scene = new __WEBPACK_IMPORTED_MODULE_0_three__["Scene"]();
        this.quad = new __WEBPACK_IMPORTED_MODULE_0_three__["Mesh"](new __WEBPACK_IMPORTED_MODULE_0_three__["PlaneBufferGeometry"](2, 2), null);
        this.quad.frustumCulled = false;
        this.scene.add(this.quad);
    }
    dispose() {
        for (let i = 0; i < this.renderTargetsHorizontal.length(); i++) {
            this.renderTargetsHorizontal[i].dispose();
        }
        for (let i = 0; i < this.renderTargetsVertical.length(); i++) {
            this.renderTargetsVertical[i].dispose();
        }
        this.renderTargetBright.dispose();
    }
    setSize(width, height) {
        let resx = Math.round(width / 2);
        let resy = Math.round(height / 2);
        this.renderTargetBright.setSize(resx, resy);
        for (let i = 0; i < this.nMips; i++) {
            this.renderTargetsHorizontal[i].setSize(resx, resy);
            this.renderTargetsVertical[i].setSize(resx, resy);
            this.separableBlurMaterials[i].uniforms["texSize"].value = new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](resx, resy);
            resx = Math.round(resx / 2);
            resy = Math.round(resy / 2);
        }
    }
    render(renderer, writeBuffer, readBuffer, delta, maskActive) {
        this.oldClearColor.copy(renderer.getClearColor());
        this.oldClearAlpha = renderer.getClearAlpha();
        let oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.setClearColor(new __WEBPACK_IMPORTED_MODULE_0_three__["Color"](0, 0, 0), 0);
        if (maskActive)
            renderer.context.disable(renderer.context.STENCIL_TEST);
        this.highPassUniforms["tDiffuse"].value = readBuffer.texture;
        this.highPassUniforms["luminosityThreshold"].value = this.threshold;
        this.quad.material = this.materialHighPassFilter;
        renderer.render(this.scene, this.camera, this.renderTargetBright, true);
        let inputRenderTarget = this.renderTargetBright;
        for (let i = 0; i < this.nMips; i++) {
            this.quad.material = this.separableBlurMaterials[i];
            this.separableBlurMaterials[i].uniforms["colorTexture"].value = inputRenderTarget.texture;
            this.separableBlurMaterials[i].uniforms["direction"].value = this.BlurDirectionX;
            renderer.render(this.scene, this.camera, this.renderTargetsHorizontal[i], true);
            this.separableBlurMaterials[i].uniforms["colorTexture"].value = this.renderTargetsHorizontal[i].texture;
            this.separableBlurMaterials[i].uniforms["direction"].value = this.BlurDirectionY;
            renderer.render(this.scene, this.camera, this.renderTargetsVertical[i], true);
            inputRenderTarget = this.renderTargetsVertical[i];
        }
        this.quad.material = this.compositeMaterial;
        this.compositeMaterial.uniforms["bloomStrength"].value = this.strength;
        this.compositeMaterial.uniforms["bloomRadius"].value = this.radius;
        this.compositeMaterial.uniforms["bloomTintColors"].value = this.bloomTintColors;
        renderer.render(this.scene, this.camera, this.renderTargetsHorizontal[0], true);
        this.quad.material = this.materialCopy;
        this.copyUniforms["tDiffuse"].value = this.renderTargetsHorizontal[0].texture;
        if (maskActive)
            renderer.context.enable(renderer.context.STENCIL_TEST);
        renderer.render(this.scene, this.camera, readBuffer, false);
        renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
        renderer.autoClear = oldAutoClear;
    }
    getSeperableBlurMaterial(kernelRadius) {
        return new __WEBPACK_IMPORTED_MODULE_0_three__["ShaderMaterial"]({
            defines: {
                "KERNEL_RADIUS": kernelRadius,
                "SIGMA": kernelRadius
            },
            uniforms: {
                "colorTexture": { value: null },
                "texSize": { value: new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](0.5, 0.5) },
                "direction": { value: new __WEBPACK_IMPORTED_MODULE_0_three__["Vector2"](0.5, 0.5) }
            },
            vertexShader: "letying vec2 vUv;\n\
        void main() {\n\
          vUv = uv;\n\
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
        }",
            fragmentShader: "#include <common>\
        letying vec2 vUv;\n\
        uniform sampler2D colorTexture;\n\
        uniform vec2 texSize;\
        uniform vec2 direction;\
        \
        float gaussianPdf(in float x, in float sigma) {\
          return 0.39894 * exp( -0.5 * x * x/( sigma * sigma))/sigma;\
        }\
        void main() {\n\
          vec2 invSize = 1.0 / texSize;\
          float fSigma = float(SIGMA);\
          float weightSum = gaussianPdf(0.0, fSigma);\
          vec3 diffuseSum = texture2D( colorTexture, vUv).rgb * weightSum;\
          for( int i = 1; i < KERNEL_RADIUS; i ++ ) {\
            float x = float(i);\
            float w = gaussianPdf(x, fSigma);\
            vec2 uvOffset = direction * invSize * x;\
            vec3 sample1 = texture2D( colorTexture, vUv + uvOffset).rgb;\
            vec3 sample2 = texture2D( colorTexture, vUv - uvOffset).rgb;\
            diffuseSum += (sample1 + sample2) * w;\
            weightSum += 2.0 * w;\
          }\
          gl_FragColor = vec4(diffuseSum/weightSum, 1.0);\n\
        }"
        });
    }
    getCompositeMaterial(nMips) {
        return new __WEBPACK_IMPORTED_MODULE_0_three__["ShaderMaterial"]({
            defines: {
                "NUM_MIPS": nMips
            },
            uniforms: {
                "blurTexture1": { value: null },
                "blurTexture2": { value: null },
                "blurTexture3": { value: null },
                "blurTexture4": { value: null },
                "blurTexture5": { value: null },
                "dirtTexture": { value: null },
                "bloomStrength": { value: 1.0 },
                "bloomFactors": { value: null },
                "bloomTintColors": { value: null },
                "bloomRadius": { value: 0.0 }
            },
            vertexShader: "letying vec2 vUv;\n\
        void main() {\n\
          vUv = uv;\n\
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
        }",
            fragmentShader: "letying vec2 vUv;\
        uniform sampler2D blurTexture1;\
        uniform sampler2D blurTexture2;\
        uniform sampler2D blurTexture3;\
        uniform sampler2D blurTexture4;\
        uniform sampler2D blurTexture5;\
        uniform sampler2D dirtTexture;\
        uniform float bloomStrength;\
        uniform float bloomRadius;\
        uniform float bloomFactors[NUM_MIPS];\
        uniform vec3 bloomTintColors[NUM_MIPS];\
        \
        float lerpBloomFactor(const in float factor) { \
          float mirrorFactor = 1.2 - factor;\
          return mix(factor, mirrorFactor, bloomRadius);\
        }\
        \
        void main() {\
          gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) + \
                          lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) + \
                         lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) + \
                         lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) + \
                         lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );\
        }"
        });
    }
}
/* harmony default export */ __webpack_exports__["a"] = UnrealBloomPass;


/***/ }),
/* 13 */,
/* 14 */,
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * @author alteredq / http://alteredqualia.com/
 */

function ClearMaskPass(scene, camera) {
  if (!(this instanceof ClearMaskPass)) return new ClearMaskPass(scene, camera);
  this.enabled = true;
}

ClearMaskPass.prototype.render = function (renderer, writeBuffer, readBuffer, delta) {
  var context = renderer.context;
  context.disable(context.STENCIL_TEST);
};

exports.ClearMaskPass = ClearMaskPass;

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */

var CopyShader = {
  uniforms: {
    'tDiffuse': { type: 't', value: null },
    'opacity': { type: 'f', value: 1.0 }
  },
  vertexShader: ['varying vec2 vUv;', 'void main() {', 'vUv = uv;', 'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );', '}'].join('\n'),
  fragmentShader: ['uniform float opacity;', 'uniform sampler2D tDiffuse;', 'varying vec2 vUv;', 'void main() {', 'vec4 texel = texture2D( tDiffuse, vUv );', 'gl_FragColor = opacity * texel;', '}'].join('\n')
};

exports.CopyShader = CopyShader;

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * @author alteredq / http://alteredqualia.com/
 */

function MaskPass(scene, camera) {
  if (!(this instanceof MaskPass)) return new MaskPass(scene, camera);

  this.scene = scene;
  this.camera = camera;

  this.enabled = true;
  this.clear = true;
  this.needsSwap = false;

  this.inverse = false;
}

MaskPass.prototype.render = function (renderer, writeBuffer, readBuffer, delta) {
  var context = renderer.context;

  // don't update color or depth

  context.colorMask(false, false, false, false);
  context.depthMask(false);

  // set up stencil

  var writeValue, clearValue;

  if (this.inverse) {
    writeValue = 0;
    clearValue = 1;
  } else {
    writeValue = 1;
    clearValue = 0;
  }

  context.enable(context.STENCIL_TEST);
  context.stencilOp(context.REPLACE, context.REPLACE, context.REPLACE);
  context.stencilFunc(context.ALWAYS, writeValue, 0xffffffff);
  context.clearStencil(clearValue);

  // draw into the stencil buffer

  renderer.render(this.scene, this.camera, readBuffer, this.clear);
  renderer.render(this.scene, this.camera, writeBuffer, this.clear);

  // re-enable update of color and depth

  context.colorMask(true, true, true, true);
  context.depthMask(true);

  // only render where stencil is set to 1

  context.stencilFunc(context.EQUAL, 1, 0xffffffff); // draw if == 1
  context.stencilOp(context.KEEP, context.KEEP, context.KEEP);
};

exports.MaskPass = MaskPass;

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RenderPass = undefined;

var _three = __webpack_require__(0);

function RenderPass(scene, camera, overrideMaterial, clearColor, clearAlpha) {
  if (!(this instanceof RenderPass)) return new RenderPass(scene, camera, overrideMaterial, clearColor, clearAlpha);

  this.scene = scene;
  this.camera = camera;

  this.overrideMaterial = overrideMaterial;

  this.clearColor = clearColor;
  this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 1;

  this.oldClearColor = new _three.Color();
  this.oldClearAlpha = 1;

  this.enabled = true;
  this.clear = true;
  this.needsSwap = false;
} /**
   * @author alteredq / http://alteredqualia.com/
   */

RenderPass.prototype.render = function (renderer, writeBuffer, readBuffer, delta) {
  this.scene.overrideMaterial = this.overrideMaterial;

  if (this.clearColor) {
    this.oldClearColor.copy(renderer.getClearColor());
    this.oldClearAlpha = renderer.getClearAlpha();

    renderer.setClearColor(this.clearColor, this.clearAlpha);
  }

  renderer.render(this.scene, this.camera, readBuffer, this.clear);

  if (this.clearColor) {
    renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
  }

  this.scene.overrideMaterial = null;
};

exports.RenderPass = RenderPass;

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ShaderPass = undefined;

var _index = __webpack_require__(1);

var _index2 = _interopRequireDefault(_index);

var _three = __webpack_require__(0);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @author alteredq / http://alteredqualia.com/
 */

function ShaderPass(shader, textureID) {
  if (!(this instanceof ShaderPass)) return new ShaderPass(shader, textureID);

  this.textureID = textureID !== undefined ? textureID : 'tDiffuse';

  this.uniforms = _three.UniformsUtils.clone(shader.uniforms);

  this.material = new _three.ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader
  });

  this.renderToScreen = false;

  this.enabled = true;
  this.needsSwap = true;
  this.clear = false;
}

ShaderPass.prototype.render = function (renderer, writeBuffer, readBuffer, delta) {
  if (this.uniforms[this.textureID]) {
    this.uniforms[this.textureID].value = readBuffer.texture;
  }

  _index2.default.quad.material = this.material;

  if (this.renderToScreen) {
    renderer.render(_index2.default.scene, _index2.default.camera);
  } else {
    renderer.render(_index2.default.scene, _index2.default.camera, writeBuffer, this.clear);
  }
};

exports.ShaderPass = ShaderPass;

/***/ }),
/* 20 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_three__ = __webpack_require__(0);

/* harmony default export */ __webpack_exports__["a"] = {
    shaderID: "luminosityHighPass",
    uniforms: {
        "tDiffuse": { type: "t", value: null },
        "luminosityThreshold": { type: "f", value: 1.0 },
        "smoothWidth": { type: "f", value: 1.0 },
        "defaultColor": { type: "c", value: new __WEBPACK_IMPORTED_MODULE_0_three__["Color"](0x000000) },
        "defaultOpacity": { type: "f", value: 0.0 }
    },
    vertexShader: [
        "varying vec2 vUv;",
        "void main() {",
        "vUv = uv;",
        "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
        "}"
    ].join("\n"),
    fragmentShader: [
        "uniform sampler2D tDiffuse;",
        "uniform vec3 defaultColor;",
        "uniform float defaultOpacity;",
        "uniform float luminosityThreshold;",
        "uniform float smoothWidth;",
        "varying vec2 vUv;",
        "void main() {",
        "vec4 texel = texture2D( tDiffuse, vUv );",
        "vec3 luma = vec3( 0.299, 0.587, 0.114 );",
        "float v = dot( texel.xyz, luma );",
        "vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );",
        "float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );",
        "gl_FragColor = mix( outputColor, texel, alpha );",
        "}"
    ].join("\n")
};


/***/ }),
/* 21 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
class Pass {
    constructor() {
        this.enabled = true;
        this.needsSwap = true;
        this.clear = false;
        this.renderToScreen = false;
    }
    setSize(width, height) { }
    render(renderer, writeBuffer, readBuffer, delta, maskActive) {
        console.error("THREE.Pass: .render() must be implemented in derived pass.");
    }
}
/* harmony default export */ __webpack_exports__["a"] = Pass;


/***/ }),
/* 22 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_three__ = __webpack_require__(0);

class RGBELoader extends __WEBPACK_IMPORTED_MODULE_0_three__["DataTextureLoader"] {
    constructor(manager = undefined) {
        super(manager);
        this._parser = (buffer) => {
            let RGBE_RETURN_SUCCESS = 0, RGBE_RETURN_FAILURE = -1, rgbe_read_error = 1, rgbe_write_error = 2, rgbe_format_error = 3, rgbe_memory_error = 4, rgbe_error = function (rgbe_error_code, msg = '') {
                switch (rgbe_error_code) {
                    case rgbe_read_error:
                        console.error("THREE.RGBELoader Read Error: " + (msg || ''));
                        break;
                    case rgbe_write_error:
                        console.error("THREE.RGBELoader Write Error: " + (msg || ''));
                        break;
                    case rgbe_format_error:
                        console.error("THREE.RGBELoader Bad File Format: " + (msg || ''));
                        break;
                    default:
                    case rgbe_memory_error: console.error("THREE.RGBELoader: Error: " + (msg || ''));
                }
                return RGBE_RETURN_FAILURE;
            }, RGBE_DATA_RED = 0, RGBE_DATA_GREEN = 1, RGBE_DATA_BLUE = 2, RGBE_DATA_SIZE = 4, RGBE_VALID_PROGRAMTYPE = 1, RGBE_VALID_FORMAT = 2, RGBE_VALID_DIMENSIONS = 4, NEWLINE = "\n", fgets = function (buffer, lineLimit = 1024, consume = undefined) {
                lineLimit = !lineLimit ? 1024 : lineLimit;
                let p = buffer.pos, i = -1, len = 0, s = '', chunkSize = 128, chunk = String.fromCharCode.apply(null, new Uint16Array(buffer.subarray(p, p + chunkSize)));
                while ((0 > (i = chunk.indexOf(NEWLINE))) && (len < lineLimit) && (p < buffer.byteLength)) {
                    s += chunk;
                    len += chunk.length;
                    p += chunkSize;
                    chunk += String.fromCharCode.apply(null, new Uint16Array(buffer.subarray(p, p + chunkSize)));
                }
                if (-1 < i) {
                    if (false !== consume)
                        buffer.pos += len + i + 1;
                    return s + chunk.slice(0, i);
                }
                return false;
            }, RGBE_ReadHeader = function (buffer) {
                let line, match, magic_token_re = /^#\?(\S+)$/, gamma_re = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/, exposure_re = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/, format_re = /^\s*FORMAT=(\S+)\s*$/, dimensions_re = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/, header = {
                    valid: 0,
                    string: '',
                    comments: '',
                    programtype: 'RGBE',
                    format: '',
                    gamma: 1.0,
                    exposure: 1.0,
                    width: 0, height: 0
                };
                if (buffer.pos >= buffer.byteLength || !(line = fgets(buffer))) {
                    return rgbe_error(rgbe_read_error, "no header found");
                }
                if (!(match = line.match(magic_token_re))) {
                    return rgbe_error(rgbe_format_error, "bad initial token");
                }
                header.valid |= RGBE_VALID_PROGRAMTYPE;
                header.programtype = match[1];
                header.string += line + "\n";
                while (true) {
                    line = fgets(buffer);
                    if (false === line)
                        break;
                    header.string += line + "\n";
                    if ('#' === line.charAt(0)) {
                        header.comments += line + "\n";
                        continue;
                    }
                    if (match = line.match(gamma_re)) {
                        header.gamma = parseFloat(match[1]);
                    }
                    if (match = line.match(exposure_re)) {
                        header.exposure = parseFloat(match[1]);
                    }
                    if (match = line.match(format_re)) {
                        header.valid |= RGBE_VALID_FORMAT;
                        header.format = match[1];
                    }
                    if (match = line.match(dimensions_re)) {
                        header.valid |= RGBE_VALID_DIMENSIONS;
                        header.height = parseInt(match[1], 10);
                        header.width = parseInt(match[2], 10);
                    }
                    if ((header.valid & RGBE_VALID_FORMAT) && (header.valid & RGBE_VALID_DIMENSIONS))
                        break;
                }
                if (!(header.valid & RGBE_VALID_FORMAT)) {
                    return rgbe_error(rgbe_format_error, "missing format specifier");
                }
                if (!(header.valid & RGBE_VALID_DIMENSIONS)) {
                    return rgbe_error(rgbe_format_error, "missing image size specifier");
                }
                return header;
            }, RGBE_ReadPixels_RLE = function (buffer, w, h) {
                let data_rgba, offset, pos, count, byteValue, scanline_buffer, ptr, ptr_end, i, l, off, isEncodedRun, scanline_width = w, num_scanlines = h, rgbeStart;
                if (((scanline_width < 8) || (scanline_width > 0x7fff)) ||
                    ((2 !== buffer[0]) || (2 !== buffer[1]) || (buffer[2] & 0x80))) {
                    return new Uint8Array(buffer);
                }
                if (scanline_width !== ((buffer[2] << 8) | buffer[3])) {
                    return rgbe_error(rgbe_format_error, "wrong scanline width");
                }
                data_rgba = new Uint8Array(4 * w * h);
                if (!data_rgba || !data_rgba.length) {
                    return rgbe_error(rgbe_memory_error, "unable to allocate buffer space");
                }
                offset = 0;
                pos = 0;
                ptr_end = 4 * scanline_width;
                rgbeStart = new Uint8Array(4);
                scanline_buffer = new Uint8Array(ptr_end);
                while ((num_scanlines > 0) && (pos < buffer.byteLength)) {
                    if (pos + 4 > buffer.byteLength) {
                        return rgbe_error(rgbe_read_error);
                    }
                    rgbeStart[0] = buffer[pos++];
                    rgbeStart[1] = buffer[pos++];
                    rgbeStart[2] = buffer[pos++];
                    rgbeStart[3] = buffer[pos++];
                    if ((2 != rgbeStart[0]) || (2 != rgbeStart[1]) || (((rgbeStart[2] << 8) | rgbeStart[3]) != scanline_width)) {
                        return rgbe_error(rgbe_format_error, "bad rgbe scanline format");
                    }
                    ptr = 0;
                    while ((ptr < ptr_end) && (pos < buffer.byteLength)) {
                        count = buffer[pos++];
                        isEncodedRun = count > 128;
                        if (isEncodedRun)
                            count -= 128;
                        if ((0 === count) || (ptr + count > ptr_end)) {
                            return rgbe_error(rgbe_format_error, "bad scanline data");
                        }
                        if (isEncodedRun) {
                            byteValue = buffer[pos++];
                            for (i = 0; i < count; i++) {
                                scanline_buffer[ptr++] = byteValue;
                            }
                        }
                        else {
                            scanline_buffer.set(buffer.subarray(pos, pos + count), ptr);
                            ptr += count;
                            pos += count;
                        }
                    }
                    l = scanline_width;
                    for (i = 0; i < l; i++) {
                        off = 0;
                        data_rgba[offset] = scanline_buffer[i + off];
                        off += scanline_width;
                        data_rgba[offset + 1] = scanline_buffer[i + off];
                        off += scanline_width;
                        data_rgba[offset + 2] = scanline_buffer[i + off];
                        off += scanline_width;
                        data_rgba[offset + 3] = scanline_buffer[i + off];
                        offset += 4;
                    }
                    num_scanlines--;
                }
                return data_rgba;
            };
            let byteArray = new Uint8Array(buffer), byteLength = byteArray.byteLength;
            byteArray.pos = 0;
            let rgbe_header_info = RGBE_ReadHeader(byteArray);
            if (RGBE_RETURN_FAILURE !== rgbe_header_info) {
                let w = rgbe_header_info.width, h = rgbe_header_info.height, image_rgba_data = RGBE_ReadPixels_RLE(byteArray.subarray(byteArray.pos), w, h);
                if (RGBE_RETURN_FAILURE !== image_rgba_data) {
                    return {
                        width: w, height: h,
                        data: image_rgba_data,
                        header: rgbe_header_info.string,
                        gamma: rgbe_header_info.gamma,
                        exposure: rgbe_header_info.exposure,
                        format: __WEBPACK_IMPORTED_MODULE_0_three__["RGBEFormat"],
                        type: __WEBPACK_IMPORTED_MODULE_0_three__["UnsignedByteType"]
                    };
                }
            }
            return null;
        };
    }
}
/* harmony default export */ __webpack_exports__["a"] = RGBELoader;


/***/ }),
/* 23 */,
/* 24 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_gsap__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_gsap___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_gsap__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_dat_gui__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_dat_gui___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_dat_gui__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__HDRCubeTextureLoader__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__PMREMGenerator__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__PMREMCubeUVPacker__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_three_effectcomposer_es6__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_three_effectcomposer_es6___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_three_effectcomposer_es6__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__UnrealBloomPass__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_lodash__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_7_lodash__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8_three__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__CannonDebugRenderer__ = __webpack_require__(8);










let OrbitControls = __webpack_require__(7)(__WEBPACK_IMPORTED_MODULE_8_three__);
let developers = [
    { name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true },
    { name: 'Stretcho', srcAvatar: './dist/img/john.png', image: null, selected: true },
    { name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true },
    { name: 'Stretcho', srcAvatar: './dist/img/john.png', image: null, selected: true },
    { name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true },
];
let defaultCfg = {
    physicWorld: {
        step: 1 / 600,
        subStep: 10,
        gravity: 9.82,
        solverIteration: 10,
        contactEquationRelaxation: 1,
        frictionEquationRelaxation: 1
    },
    container: {
        radius: 20,
        height: 10,
        nbBars: 30,
        barSize: {
            x: .5, y: 20, z: 10
        },
        markBarHeight: .95,
        currentRotation: 0
    },
    ball: {
        radius: 3,
        mass: 5,
        sleepTimeLimit: .5,
        sleepSpeedLimit: .3,
        linearDamping: .01
    }
};
class Application {
    constructor() {
        this.spinWheel = () => {
            let cfgContainer = this.cfg.container;
            if (this.wheelTween) {
                this.wheelTween.restart();
            }
            else {
                this.wheelTween = __WEBPACK_IMPORTED_MODULE_0_gsap__["TweenLite"].to(cfgContainer, 10, {
                    currentRotation: '+=' + 100 * Math.PI * Math.random() * .5 + .5,
                    ease: Expo.easeOut,
                    onUpdate: this.tweenWheel
                });
            }
            this.moveBall(3, 3, 0, new CANNON.Vec3(40, 40, 0));
        };
        this.tweenWheel = () => {
            let cfgContainer = this.cfg.container;
            let lastTweenTick = new Date().getTime();
            let angleFraction = 2 * Math.PI / cfgContainer.nbBars;
            let lastAngle = 0;
            this.circle.rotation.set(0, 0, cfgContainer.currentRotation);
            this.bars.forEach((bar, i) => {
                let wall = bar.wall;
                let cylinder = bar.cylinder;
                let angularPos = i * angleFraction;
                let radius = i % 2 ? cfgContainer.radius * .98 : cfgContainer.radius * .95;
                let newX = (cfgContainer.radius) * Math.cos(angularPos + cfgContainer.currentRotation);
                let newY = (cfgContainer.radius) * Math.sin(angularPos + cfgContainer.currentRotation);
                let now = new Date().getTime();
                let dt = (lastTweenTick - now);
                let angleDiff = cfgContainer.currentRotation - lastAngle;
                let tanSpeed = cfgContainer.radius * angleDiff / dt;
                let tanX = newX * Math.cos(Math.PI / 2) - newY * Math.sin(Math.PI / 2);
                let tanY = newX * Math.sin(Math.PI / 2) + newY * Math.cos(Math.PI / 2);
                let circularForce = new CANNON.Vec3(tanX, tanY, 0);
                circularForce.normalize();
                circularForce.scale(tanSpeed);
                let newX2 = (cfgContainer.barSize.y + radius) * Math.cos(angularPos + cfgContainer.currentRotation);
                let newY2 = (cfgContainer.barSize.y + radius) * Math.sin(angularPos + cfgContainer.currentRotation);
                cylinder.velocity = circularForce;
                cylinder.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), i * angleFraction + cfgContainer.currentRotation);
                cylinder.position.set(newX2, newY2, 0);
                wall.position.set(newX, newY, 0);
                wall.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
                let rotation = new CANNON.Quaternion();
                rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), +3 * Math.PI / 2 - (angularPos + cfgContainer.currentRotation));
                wall.quaternion.copy(wall.quaternion.mult(rotation));
                lastTweenTick = now;
                lastAngle = cfgContainer.currentRotation;
            });
        };
        this.mouseMove = (evt) => {
            evt.preventDefault();
            let array = this.getMousePosition(this.renderer.domElement, evt.clientX, evt.clientY);
            this.onClickPosition.fromArray(array);
            let intersects = this.getIntersects(this.onClickPosition, [this.circle]);
            this.mouseUVCoord.set(0, 0);
            if (intersects.length) {
                intersects.forEach((intersection) => {
                    if (intersection.uv) {
                        let uv = intersection.uv;
                        intersection.object.material.map.transformUv(uv);
                        this.mouseUVCoord.set(uv.x, uv.y);
                        return;
                    }
                });
            }
            let insideCircle = (((.5 - this.mouseUVCoord.x) * (.5 - this.mouseUVCoord.x) + (.5 - this.mouseUVCoord.y) * (.5 - this.mouseUVCoord.y)) <= (.5 * .5));
            if (insideCircle) {
                this.drawTexture();
            }
        };
        this.updatePhysicalWorld = () => {
            let phxCfg = this.cfg.physicWorld;
            let now = new Date().getTime();
            let dt = (now - this.lastTick) / 1000;
            this.cannonWorld.step(phxCfg.step, dt, phxCfg.subStep);
            this.lastTick = now;
            this.syncMeshWithBody(this.ball, this.sphereBody);
            this.cannonDebugRenderer.update();
        };
        this.animate = (event = null) => {
            this.stats.begin();
            if (this.renderer && this.scene && this.camera) {
                this.updatePhysicalWorld();
                this.renderer.render(this.scene, this.camera);
            }
            this.stats.end();
            requestAnimationFrame(this.animate);
        };
        this.free();
        this.init();
    }
    free() {
        this.scene = null;
        this.renderer = null;
        this.camera = null;
    }
    refresh() {
        this.drawTexture();
    }
    init() {
        this.cfg = defaultCfg;
        this.stats = new Stats();
        console.log('this.stats', this.stats);
        this.stats.showPanel(0);
        if (this.stats.domElement) {
            this.stats.domElement.className = 'stats';
            document.body.appendChild(this.stats.domElement);
        }
        let cfgContainer = this.cfg.container;
        this.mouse = new __WEBPACK_IMPORTED_MODULE_8_three__["Vector2"](0, 0);
        this.mouseUVCoord = new __WEBPACK_IMPORTED_MODULE_8_three__["Vector2"](0, 0);
        this.onClickPosition = new __WEBPACK_IMPORTED_MODULE_8_three__["Vector2"](0, 0);
        this.raycaster = new __WEBPACK_IMPORTED_MODULE_8_three__["Raycaster"]();
        this.scene = new __WEBPACK_IMPORTED_MODULE_8_three__["Scene"]();
        this.fbo = document.createElement('canvas');
        this.fbo.width = 512;
        this.fbo.height = 512;
        this.camera = new __WEBPACK_IMPORTED_MODULE_8_three__["PerspectiveCamera"](75, window.innerWidth / window.innerHeight, 1, 10000);
        this.renderer = new __WEBPACK_IMPORTED_MODULE_8_three__["WebGLRenderer"]();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.renderer.shadowMap.enabled = true;
        this.renderer.domElement.addEventListener('mousemove', this.mouseMove, false);
        document.body.appendChild(this.renderer.domElement);
        this.camera.position.set(100, 0, 0);
        this.camera.lookAt(new __WEBPACK_IMPORTED_MODULE_8_three__["Vector3"](0, 0, 0));
        this.setupMeshes();
        this.setupPhysicalWorld();
        this.loadAssets();
        this.gui = new __WEBPACK_IMPORTED_MODULE_1_dat_gui__["GUI"]();
        developers.forEach((developer) => {
            this.gui.add(developer, 'selected').name(developer.name).onChange(this.refresh.bind(this));
        });
        this.gui.add({ spinWheel: this.spinWheel }, 'spinWheel');
    }
    loadAssets() {
        this.loadingManager = new __WEBPACK_IMPORTED_MODULE_8_three__["LoadingManager"](() => {
            setInterval(() => {
            }, 2000);
            this.drawTexture();
            this.animate();
        });
        developers.forEach((element) => {
            element.image = new __WEBPACK_IMPORTED_MODULE_8_three__["ImageLoader"](this.loadingManager).load(element.srcAvatar);
        });
    }
    setupMeshes() {
        let cfgBall = this.cfg.ball;
        let geometry = new __WEBPACK_IMPORTED_MODULE_8_three__["CircleGeometry"](this.cfg.container.radius, 32, 0, 2 * Math.PI);
        this.texture = new __WEBPACK_IMPORTED_MODULE_8_three__["CanvasTexture"](this.fbo, __WEBPACK_IMPORTED_MODULE_8_three__["UVMapping"], __WEBPACK_IMPORTED_MODULE_8_three__["RepeatWrapping"], __WEBPACK_IMPORTED_MODULE_8_three__["RepeatWrapping"]);
        this.texture.minFilter = __WEBPACK_IMPORTED_MODULE_8_three__["LinearFilter"];
        this.texture.magFilter = __WEBPACK_IMPORTED_MODULE_8_three__["LinearFilter"];
        this.texture.format = __WEBPACK_IMPORTED_MODULE_8_three__["RGBFormat"];
        let material = new __WEBPACK_IMPORTED_MODULE_8_three__["MeshBasicMaterial"]({
            color: 0xffffff, map: this.texture, side: __WEBPACK_IMPORTED_MODULE_8_three__["DoubleSide"]
        });
        this.circle = new __WEBPACK_IMPORTED_MODULE_8_three__["Mesh"](geometry, material);
        this.circle.position.set(0, 0, this.cfg.container.height / 2);
        this.scene.add(this.circle);
        let sGeometry = new __WEBPACK_IMPORTED_MODULE_8_three__["BoxGeometry"](cfgBall.radius, cfgBall.radius, cfgBall.radius);
        let sMaterial = new __WEBPACK_IMPORTED_MODULE_8_three__["MeshStandardMaterial"]({
            map: null,
            color: 0xffff00,
            metalness: 1.0
        });
        this.ball = new __WEBPACK_IMPORTED_MODULE_8_three__["Mesh"](sGeometry, sMaterial);
        this.scene.add(this.ball);
        let textureLoader = new __WEBPACK_IMPORTED_MODULE_8_three__["TextureLoader"]();
        textureLoader.load("/dist/textures/roughness_map.jpg", function (map) {
            sMaterial.roughnessMap = map;
            sMaterial.bumpMap = map;
            sMaterial.needsUpdate = true;
        });
        let genCubeUrls = function (prefix, postfix) {
            return [
                prefix + 'px' + postfix, prefix + 'nx' + postfix,
                prefix + 'py' + postfix, prefix + 'ny' + postfix,
                prefix + 'pz' + postfix, prefix + 'nz' + postfix
            ];
        };
        let hdrUrls = genCubeUrls("./dist/textures/pisaHDR/", ".hdr");
        let hdrCubeLoader = new __WEBPACK_IMPORTED_MODULE_2__HDRCubeTextureLoader__["a" /* default */]().load(__WEBPACK_IMPORTED_MODULE_8_three__["UnsignedByteType"], hdrUrls, (hdrCubeMap) => {
            let pmremGenerator = new __WEBPACK_IMPORTED_MODULE_3__PMREMGenerator__["a" /* default */](hdrCubeMap);
            pmremGenerator.update(this.renderer);
            let pmremCubeUVPacker = new __WEBPACK_IMPORTED_MODULE_4__PMREMCubeUVPacker__["a" /* default */](pmremGenerator.cubeLods);
            pmremCubeUVPacker.update(this.renderer);
            this.hdrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;
        });
        this.scene.add(new __WEBPACK_IMPORTED_MODULE_8_three__["AmbientLight"](0x222222));
        let spotLight = new __WEBPACK_IMPORTED_MODULE_8_three__["SpotLight"](0xffffff);
        spotLight.position.set(50, 100, 50);
        spotLight.angle = Math.PI / 7;
        spotLight.penumbra = 0.8;
        spotLight.castShadow = true;
        this.scene.add(spotLight);
        this.renderScene = new __WEBPACK_IMPORTED_MODULE_5_three_effectcomposer_es6__["RenderPass"](this.scene, this.camera);
        let bloomPass = new __WEBPACK_IMPORTED_MODULE_6__UnrealBloomPass__["a" /* default */](new __WEBPACK_IMPORTED_MODULE_8_three__["Vector2"](window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        this.composer = new __WEBPACK_IMPORTED_MODULE_5_three_effectcomposer_es6___default.a(this.renderer);
        this.composer.addPass(bloomPass);
        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true;
    }
    setupPhysicalWorld() {
        let cfgContainer = this.cfg.container;
        let cfgBall = this.cfg.ball;
        let phxCfg = this.cfg.physicWorld;
        this.cannonWorld = new CANNON.World();
        this.cannonWorld.broadphase = new CANNON.SAPBroadphase(this.cannonWorld);
        this.cannonWorld.gravity.set(0, -1 * phxCfg.gravity, 0);
        this.cannonWorld.allowSleep = true;
        this.cannonWorld.solver.iterations = phxCfg.solverIteration;
        this.cannonWorld.defaultContactMaterial.frictionEquationRelaxation = phxCfg.frictionEquationRelaxation;
        let groundMaterial = new CANNON.Material('ground');
        let bumpyMaterial = new CANNON.Material('bumpy');
        let bumpy_ground = new CANNON.ContactMaterial(groundMaterial, bumpyMaterial, {
            friction: 0,
            restitution: 1000,
        });
        this.cannonWorld.addContactMaterial(bumpy_ground);
        let sphereShape = new CANNON.Sphere(cfgBall.radius);
        this.sphereBody = new CANNON.Body({ mass: cfgBall.mass, shape: sphereShape, material: bumpyMaterial.id });
        this.sphereBody.allowSleep = true;
        this.sphereBody.sleepTimeLimit = cfgBall.sleepTimeLimit;
        this.sphereBody.sleepSpeedLimit = cfgBall.sleepSpeedLimit;
        this.sphereBody.linearDamping = cfgBall.linearDamping;
        this.moveBall(0, 0, 0);
        this.cannonWorld.addBody(this.sphereBody);
        let planeShapeMinZ = new CANNON.Plane();
        let planeShapeMaxZ = new CANNON.Plane();
        let planeZMin = new CANNON.Body({ mass: 0, material: groundMaterial.id });
        let planeZMax = new CANNON.Body({ mass: 0, material: groundMaterial.id });
        planeZMin.allowSleep = true;
        planeZMin.sleepTimeLimit = 1;
        planeZMin.sleepSpeedLimit = .5;
        planeZMin.linearDamping = .01;
        planeZMax.allowSleep = true;
        planeZMax.sleepTimeLimit = 1;
        planeZMax.sleepSpeedLimit = .5;
        planeZMax.linearDamping = .01;
        planeZMax.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI);
        planeZMin.position.set(0, 0, -this.cfg.container.height / 2);
        planeZMax.position.set(0, 0, this.cfg.container.height / 2);
        planeZMin.addShape(planeShapeMinZ);
        planeZMax.addShape(planeShapeMaxZ);
        this.cannonWorld.addBody(planeZMin);
        this.cannonWorld.addBody(planeZMax);
        this.bars = [];
        let angleFraction = 2 * Math.PI / this.cfg.container.nbBars;
        for (let i = 0; i < this.cfg.container.nbBars; i++) {
            let radius = i % 2 ? cfgContainer.radius * .98 : cfgContainer.radius * .90;
            let angularPos = i * angleFraction;
            let boxShape = new CANNON.Box(new CANNON.Vec3(cfgContainer.barSize.y, cfgContainer.barSize.x, cfgContainer.barSize.z));
            let cylinderBody = new CANNON.Body({ mass: 0, material: groundMaterial.id });
            cylinderBody.allowSleep = true;
            cylinderBody.addShape(boxShape);
            cylinderBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angularPos);
            cylinderBody.position.set((cfgContainer.barSize.y + radius) * Math.cos(angularPos), (cfgContainer.barSize.y + radius) * Math.sin(angularPos), 0);
            let wallRadius = cfgContainer.radius;
            let wall = new CANNON.Plane();
            let wallBody = new CANNON.Body({ mass: 0, material: groundMaterial.id });
            wallBody.addShape(wall);
            wallBody.position.set((wallRadius) * Math.cos(angularPos), (wallRadius) * Math.sin(angularPos), 0);
            wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            let rotation = new CANNON.Quaternion();
            rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), +3 * Math.PI / 2 - angularPos);
            wallBody.quaternion.copy(wallBody.quaternion.mult(rotation));
            this.cannonWorld.addBody(cylinderBody);
            this.cannonWorld.addBody(wallBody);
            this.bars.push({ wall: wallBody, cylinder: cylinderBody });
        }
        this.cannonDebugRenderer = new __WEBPACK_IMPORTED_MODULE_9__CannonDebugRenderer__["a" /* CannonDebugRenderer */](this.scene, this.cannonWorld);
    }
    moveBall(x, y, z, vel = new CANNON.Vec3(0, 0, 0)) {
        this.sphereBody.position.set(x, y, z);
        this.sphereBody.velocity = vel;
        this.syncMeshWithBody(this.ball, this.sphereBody);
        this.sphereBody.wakeUp();
    }
    createMesh(geom) {
        let meshMaterial = new __WEBPACK_IMPORTED_MODULE_8_three__["MeshNormalMaterial"]();
        meshMaterial.side = __WEBPACK_IMPORTED_MODULE_8_three__["DoubleSide"];
        let wireFrameMat = new __WEBPACK_IMPORTED_MODULE_8_three__["MeshBasicMaterial"]();
        wireFrameMat.wireframe = true;
        let mesh = __WEBPACK_IMPORTED_MODULE_8_three__["SceneUtils"].createMultiMaterialObject(geom, [wireFrameMat]);
        return mesh;
    }
    syncMeshWithBody(mesh, body) {
        mesh.position.x = body.position.x;
        mesh.position.y = body.position.y;
        mesh.position.z = body.position.z;
        mesh.quaternion.x = body.quaternion.x;
        mesh.quaternion.y = body.quaternion.y;
        mesh.quaternion.z = body.quaternion.z;
        mesh.quaternion.w = body.quaternion.w;
    }
    drawTexture() {
        let ctx = this.fbo.getContext('2d');
        let xMax = Math.floor(this.fbo.width);
        let yMax = Math.floor(this.fbo.height);
        let centerX = xMax / 2;
        let centerY = yMax / 2;
        let border = 2;
        let selectedDevelopers = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_7_lodash__["filter"])(developers, (el) => el.selected);
        let angle = 2 * Math.PI / selectedDevelopers.length;
        let colors = ['white', 'white'];
        let randomOffset = Math.floor(Math.random() * 5);
        ctx.clearRect(0, 0, xMax, yMax);
        ctx.lineWidth = border;
        ctx.strokeStyle = '#003300';
        let i = 0;
        let insideCircle = (((.5 - this.mouseUVCoord.x) * (.5 - this.mouseUVCoord.x) + (.5 - this.mouseUVCoord.y) * (.5 - this.mouseUVCoord.y)) <= (.5 * .5));
        let mousePolarCoordinate = Math.atan2(this.mouseUVCoord.y - .5, this.mouseUVCoord.x - .5);
        if (mousePolarCoordinate < 0) {
            mousePolarCoordinate = mousePolarCoordinate + 2 * Math.PI;
        }
        if (selectedDevelopers.length > 1) {
            selectedDevelopers.forEach((dev) => {
                let mouseInsideSector = (i * angle <= mousePolarCoordinate && mousePolarCoordinate <= (i + 1) * angle);
                let fillStyle = (insideCircle && mouseInsideSector) ? 'red' : 'blue';
                let startAngle = i * angle;
                let endAngle = (i + 1) * angle;
                ctx.save();
                ctx.fillStyle = fillStyle;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, -border + centerX, startAngle, endAngle);
                ctx.lineTo(centerX, centerY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(startAngle + angle / 2 + Math.PI / 2);
                ctx.drawImage(dev.image, -35, -centerY + 15, 70, 70);
                ctx.restore();
                fillTextCircle(ctx, dev.name, centerX, centerY, -30 - border + centerX, i * angle - angle / 2, angle);
                i++;
            });
        }
        this.texture.needsUpdate = true;
    }
    drawTimeTexture() {
        let ctx = this.fbo.getContext('2d');
        let xMax = Math.floor(this.fbo.width);
        let yMax = Math.floor(this.fbo.height);
        let centerX = xMax / 2;
        let centerY = yMax / 2;
        let border = 5;
        ctx.clearRect(0, 0, xMax, yMax);
        ctx.beginPath();
        ctx.arc(centerX, centerY, -border + this.fbo.width / 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'blue';
        ctx.fill();
        ctx.lineWidth = border;
        ctx.strokeStyle = '#003300';
        ctx.stroke();
        ctx.font = '18pt Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(new Date().toUTCString(), this.fbo.width / 2, this.fbo.height / 2, this.fbo.width - 2 * border);
        this.texture.needsUpdate = true;
    }
    drawUvTexture() {
        let xMax = Math.floor(this.fbo.width);
        let yMax = Math.floor(this.fbo.height);
        let centerX = xMax / 2;
        let centerY = yMax / 2;
        let ctx = this.fbo.getContext('2d');
        ctx.save();
        ctx.drawImage(this.uvTexture, 0, 0, xMax, yMax);
        ctx.restore();
    }
    drawCrossAir() {
        let xMax = Math.floor(this.fbo.width);
        let yMax = Math.floor(this.fbo.height);
        let centerX = xMax / 2;
        let centerY = yMax / 2;
        let ctx = this.fbo.getContext('2d');
        ctx.save();
        let cursorSize = 5;
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.rect(xMax * this.mouseUVCoord.x - cursorSize / 2, yMax * this.mouseUVCoord.y - cursorSize / 2, cursorSize, cursorSize);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    getMousePosition(dom, x, y) {
        let rect = dom.getBoundingClientRect();
        return [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
    }
    getIntersects(point, objects) {
        this.mouse.set((point.x * 2) - 1, -(point.y * 2) + 1);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(objects);
    }
}
let fillTextCircle = (context, text, x, y, radius, startRotation, maxAngle) => {
    let numRadsPerLetter = maxAngle / text.length;
    context.save();
    context.translate(x, y);
    context.rotate(startRotation);
    for (let i = 0; i < text.length; i++) {
        context.save();
        context.rotate(i * numRadsPerLetter);
        context.fillText(text[i], 0, -radius);
        context.restore();
    }
    context.restore();
};
function radianToDegree(val) {
    return val * 180 / Math.PI;
}
document.addEventListener("DOMContentLoaded", function () {
    let Wof = new Application();
});


/***/ })
],[24]);