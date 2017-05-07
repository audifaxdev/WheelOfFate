webpackJsonp([0],{

/***/ 10:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_gsap__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_gsap___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_gsap__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_dat_gui__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_dat_gui___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_dat_gui__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_lodash___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_lodash__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3_three__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__CannonDebugRenderer__ = __webpack_require__(7);





let OrbitControls = __webpack_require__(6)(__WEBPACK_IMPORTED_MODULE_3_three__);
;
let developers = [
    { name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true },
    { name: 'Stretcho', srcAvatar: './dist/img/john.png', image: null, selected: true },
    { name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true },
    { name: 'Stretcho', srcAvatar: './dist/img/john.png', image: null, selected: true },
    { name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true },
];
let defaultCfg = {
    physicWorld: {
        step: 1 / 60,
        subStep: 10,
        gravity: 9.82,
        solverIteration: 10,
        contactEquationRelaxation: 1,
        frictionEquationRelaxation: 1
    },
    container: {
        radius: 20,
        height: 10,
        nbBars: 16,
        barSize: {
            x: .5, y: 20, z: 10
        },
        markBarHeight: .99,
        currentRotation: 0
    },
    ball: {
        radius: 1,
        mass: 5,
        sleepTimeLimit: .5,
        sleepSpeedLimit: .3,
        linearDamping: .3
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
                    currentRotation: '+=' + 100 * Math.PI,
                    ease: Power0.easeOut,
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
                let angularPos = i * angleFraction;
                let radius = i % 2 ? cfgContainer.radius : cfgContainer.radius * cfgContainer.markBarHeight;
                let newX = (radius) * Math.cos(angularPos + cfgContainer.currentRotation);
                let newY = (radius) * Math.sin(angularPos + cfgContainer.currentRotation);
                let now = new Date().getTime();
                let angleDiff = cfgContainer.currentRotation - lastAngle;
                bar.position.set(newX, newY, 0);
                bar.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
                let rotation = new CANNON.Quaternion();
                rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), +3 * Math.PI / 2 - (angularPos + cfgContainer.currentRotation));
                bar.quaternion.copy(bar.quaternion.mult(rotation));
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
        this.lights = [];
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
        this.mouse = new __WEBPACK_IMPORTED_MODULE_3_three__["Vector2"](0, 0);
        this.mouseUVCoord = new __WEBPACK_IMPORTED_MODULE_3_three__["Vector2"](0, 0);
        this.onClickPosition = new __WEBPACK_IMPORTED_MODULE_3_three__["Vector2"](0, 0);
        this.raycaster = new __WEBPACK_IMPORTED_MODULE_3_three__["Raycaster"]();
        this.scene = new __WEBPACK_IMPORTED_MODULE_3_three__["Scene"]();
        this.fbo = document.createElement('canvas');
        this.fbo.width = 512;
        this.fbo.height = 512;
        this.camera = new __WEBPACK_IMPORTED_MODULE_3_three__["PerspectiveCamera"](75, window.innerWidth / window.innerHeight, 1, 10000);
        this.renderer = new __WEBPACK_IMPORTED_MODULE_3_three__["WebGLRenderer"]();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        let pointLight = new __WEBPACK_IMPORTED_MODULE_3_three__["PointLight"](0xffffff);
        pointLight.position.set(0, 20, 0);
        this.scene.add(pointLight);
        let ambientLight = new __WEBPACK_IMPORTED_MODULE_3_three__["AmbientLight"](0x444444);
        this.scene.add(ambientLight);
        let directionalLight = new __WEBPACK_IMPORTED_MODULE_3_three__["DirectionalLight"](0xffeedd);
        directionalLight.position.set(0, 0, 1).normalize();
        this.scene.add(directionalLight);
        this.lights.push(pointLight);
        this.lights.push(ambientLight);
        this.lights.push(directionalLight);
        this.renderer.domElement.addEventListener('mousemove', this.mouseMove, false);
        document.body.appendChild(this.renderer.domElement);
        this.camera.position.set(100, 0, 0);
        this.camera.lookAt(new __WEBPACK_IMPORTED_MODULE_3_three__["Vector3"](0, 0, 0));
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
        this.loadingManager = new __WEBPACK_IMPORTED_MODULE_3_three__["LoadingManager"](() => {
            setInterval(() => {
            }, 2000);
            this.drawTexture();
            this.animate();
        });
        developers.forEach((element) => {
            element.image = new __WEBPACK_IMPORTED_MODULE_3_three__["ImageLoader"](this.loadingManager).load(element.srcAvatar);
        });
    }
    setupMeshes() {
        let cfgBall = this.cfg.ball;
        let geometry = new __WEBPACK_IMPORTED_MODULE_3_three__["CircleGeometry"](this.cfg.container.radius, 32, 0, 2 * Math.PI);
        this.texture = new __WEBPACK_IMPORTED_MODULE_3_three__["CanvasTexture"](this.fbo, __WEBPACK_IMPORTED_MODULE_3_three__["UVMapping"], __WEBPACK_IMPORTED_MODULE_3_three__["RepeatWrapping"], __WEBPACK_IMPORTED_MODULE_3_three__["RepeatWrapping"]);
        this.texture.minFilter = __WEBPACK_IMPORTED_MODULE_3_three__["LinearFilter"];
        this.texture.magFilter = __WEBPACK_IMPORTED_MODULE_3_three__["LinearFilter"];
        this.texture.format = __WEBPACK_IMPORTED_MODULE_3_three__["RGBFormat"];
        let material = new __WEBPACK_IMPORTED_MODULE_3_three__["MeshBasicMaterial"]({
            color: 0xffffff, map: this.texture, side: __WEBPACK_IMPORTED_MODULE_3_three__["DoubleSide"]
        });
        this.circle = new __WEBPACK_IMPORTED_MODULE_3_three__["Mesh"](geometry, material);
        this.circle.position.set(0, 0, this.cfg.container.height / 2);
        this.scene.add(this.circle);
        let sGeometry = new __WEBPACK_IMPORTED_MODULE_3_three__["SphereGeometry"](cfgBall.radius, 32, 32);
        let sMaterial = new __WEBPACK_IMPORTED_MODULE_3_three__["MeshBasicMaterial"]({ color: 0xffff00 });
        this.ball = new __WEBPACK_IMPORTED_MODULE_3_three__["Mesh"](sGeometry, sMaterial);
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
        this.cannonWorld.defaultContactMaterial.contactEquationRelaxation = phxCfg.contactEquationRelaxation;
        this.cannonWorld.defaultContactMaterial.frictionEquationRelaxation = phxCfg.frictionEquationRelaxation;
        let groundMaterial = new CANNON.Material('ground');
        let bumpyMaterial = new CANNON.Material('bumpy');
        let bumpy_ground = new CANNON.ContactMaterial(groundMaterial, bumpyMaterial, {
            friction: .3,
            restitution: .7,
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
            let radius = i % 2 ? cfgContainer.radius : cfgContainer.radius * cfgContainer.markBarHeight;
            let angularPos = i * angleFraction;
            let wall = new CANNON.Plane();
            let wallBody = new CANNON.Body({ mass: 0, material: groundMaterial.id });
            wallBody.addShape(wall);
            wallBody.position.set((radius) * Math.cos(angularPos), (radius) * Math.sin(angularPos), 0);
            wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
            let rotation = new CANNON.Quaternion();
            rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), +3 * Math.PI / 2 - angularPos);
            wallBody.quaternion.copy(wallBody.quaternion.mult(rotation));
            this.cannonWorld.addBody(wallBody);
            this.bars.push(wallBody);
        }
        this.cannonDebugRenderer = new __WEBPACK_IMPORTED_MODULE_4__CannonDebugRenderer__["a" /* CannonDebugRenderer */](this.scene, this.cannonWorld);
    }
    moveBall(x, y, z, vel = new CANNON.Vec3(0, 0, 0)) {
        this.sphereBody.position.set(x, y, z);
        this.sphereBody.velocity = vel;
        this.syncMeshWithBody(this.ball, this.sphereBody);
        this.sphereBody.wakeUp();
    }
    createMesh(geom) {
        let meshMaterial = new __WEBPACK_IMPORTED_MODULE_3_three__["MeshNormalMaterial"]();
        meshMaterial.side = __WEBPACK_IMPORTED_MODULE_3_three__["DoubleSide"];
        let wireFrameMat = new __WEBPACK_IMPORTED_MODULE_3_three__["MeshBasicMaterial"]();
        wireFrameMat.wireframe = true;
        let mesh = __WEBPACK_IMPORTED_MODULE_3_three__["SceneUtils"].createMultiMaterialObject(geom, [wireFrameMat]);
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
        let selectedDevelopers = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_2_lodash__["filter"])(developers, (el) => el.selected);
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


/***/ }),

/***/ 6:
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

/***/ 7:
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



/***/ })

},[10]);