/// <reference types="node" />
/// <reference types="dat-gui" />
/// <reference types="gsap" />
/// <reference types="stats" />
/// <reference path="./cannon.d.ts" />

import {filter} from "lodash";
import * as THREE from 'three';
import {CannonDebugRenderer} from './CannonDebugRenderer';
let OrbitControls = require('three-orbit-controls')(THREE);


let fillTextCircle = (context, text,x,y,radius,startRotation, maxAngle) => {
  let numRadsPerLetter = maxAngle / text.length;
  context.save();
  context.translate(x,y);
  context.rotate(startRotation);

  for(let i=0;i<text.length;i++) {
    context.save();
    context.rotate(i*numRadsPerLetter);

    context.fillText(text[i],0,-radius);
    context.restore();
  }
  context.restore();
};

function radianToDegree(val: number) {
  return val*180/Math.PI;
}

interface Developer {
  name: string,
  srcAvatar: string,
  image: HTMLImageElement,
  selected: boolean
};


let developers: Developer[] = [
  {name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true},
  {name: 'Stretcho', srcAvatar: './dist/img/john.png', image: null, selected: true},
  {name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true},
  {name: 'Stretcho', srcAvatar: './dist/img/john.png', image: null, selected: true},
  {name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true},
];

class Application {
  stats: Stats;
  gui: dat.GUI;
  //global stuff
  renderer: THREE.Renderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  lights: THREE.Light[];

  //Cfg
  cfg: any;

  //Mesh
  circle: THREE.Mesh;

  ball: THREE.Mesh;
  sphereBody: CANNON.Body;

  //Interactivity
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  onClickPosition: THREE.Vector2;
  mouseUVCoord: THREE.Vector2;

  controls: THREE.OrbitControls;

  loadingManager: THREE.LoadingManager;

  //fbo/texture and other material
  fbo: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  avatar: HTMLImageElement;
  uvTexture: HTMLImageElement;

  //physics
  lastTick: number;
  cannonWorld: CANNON.World;
  bars: CANNON.Body[];

  //tween
  wheelTween: TweenLite;

  //debug
  cannonDebugRenderer: CannonDebugRenderer;


  constructor() {
    this.free();
    this.init();
  }

  free(){
    this.lights = [];
    this.scene = null;
    this.renderer = null;
    this.camera = null;
  }

  refresh () {
    this.drawTexture();
  }

  init() {

    this.cfg = {
      container: {
        radius: 20,
        height: 10,
        nbBars: 120,
        markBarHeight: .99,
        currentRotation: 0
      },
      material : {
        friction: 0,
        restitution: 2
      },
      ball: {
        radius: 3,
        mass: 2
      }
    };

    this.stats = new Stats();
    this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    this.stats.domElement.className = 'stats';
    document.body.appendChild( this.stats.domElement );
    let cfgContainer = this.cfg.container;

    // alert('toto');
    this.mouse = new THREE.Vector2(0,0);
    this.mouseUVCoord = new THREE.Vector2(0,0);
    this.onClickPosition = new THREE.Vector2(0,0);
    this.raycaster = new THREE.Raycaster();

    this.scene = new THREE.Scene();
    this.fbo = document.createElement('canvas');
    // document.body.appendChild(this.fbo);
    this.fbo.width = 512;
    this.fbo.height = 512;

    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 1, 10000
    );

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    // this.renderer.setClearColor(0xffffff);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.addEventListener('change',this.animate.bind(this));

    let pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(0,20,0);
    this.scene.add(pointLight);

    let ambientLight = new THREE.AmbientLight(0x444444);
    this.scene.add(ambientLight);

    let directionalLight = new THREE.DirectionalLight( 0xffeedd );
    directionalLight.position.set( 0, 0, 1 ).normalize();
    this.scene.add(directionalLight);

    this.lights.push(pointLight);
    this.lights.push(ambientLight);
    this.lights.push(directionalLight);

    this.renderer.domElement.addEventListener( 'mousemove', this.mouseMove, false );
    document.body.appendChild( this.renderer.domElement );

    this.camera.position.set(100, 0, 0);
    this.camera.lookAt(new THREE.Vector3(0,0,0));

    this.setupMeshes();
    this.setupPhysicalWorld();
    this.loadAssets();

    this.wheelTween = TweenLite.to(cfgContainer, 10*Math.random(), {
      currentRotation: '+='+ 100*Math.PI,
      ease: TweenLite.defaultEase,
      onUpdate: this.tweenWheel
    });

    this.gui = new dat.GUI();

    developers.forEach((developer) => {
      this.gui.add(developer, 'selected').name(developer.name).onChange(this.refresh.bind(this));
    });

    this.gui.add({spinWheel: this.spinWheel}, 'spinWheel');

    // this.moveBall(new THREE.Vector3(-cfgContainer.radius + cfgBall.radius/2, 0, 0));
  }

  tweenWheel = () => {

    let cfgContainer = this.cfg.container;
    let lastTweenTick = new Date().getTime();
    let angleFraction = 2*Math.PI / cfgContainer.nbBars;
    let lastAngle = 0;

    this.circle.rotation.set(0, 0, cfgContainer.currentRotation);
    this.bars.forEach((bar: CANNON.Body, i) => {
      let radius = i%2 ? cfgContainer.radius:cfgContainer.radius*cfgContainer.markBarHeight;
      let newX = radius*Math.cos(i*angleFraction + cfgContainer.currentRotation);
      let newY = radius*Math.sin(i*angleFraction + cfgContainer.currentRotation);

      let now = new Date().getTime();
      let dt = (lastTweenTick - now);
      let angleDiff = cfgContainer.currentRotation - lastAngle;
      let tanSpeed = cfgContainer.radius * angleDiff / dt;

      let tanX = newX*Math.cos(Math.PI/2) - newY * Math.sin(Math.PI/2);
      let tanY = newX*Math.sin(Math.PI/2) + newY * Math.cos(Math.PI/2);

      let circularForce = new CANNON.Vec3( tanX, tanY, 0);
      circularForce.normalize();
      circularForce.scale(tanSpeed);

      bar.velocity = circularForce;
      bar.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), i*angleFraction + cfgContainer.currentRotation+Math.PI/4);
      bar.position.set(newX, newY, 0);
      lastTweenTick = now;
      lastAngle = cfgContainer.currentRotation;
    });
  };

  loadAssets() {
    this.loadingManager = new THREE.LoadingManager(() => {
      //Finished loading assets
      setInterval(this.updatePhysicalWorld, 40);
      this.drawTexture();
      this.animate();
    });
    developers.forEach((element: Developer) => {
      element.image = new THREE.ImageLoader(this.loadingManager).load(element.srcAvatar);
    });
  }

  spinWheel = () => {
    let cfgContainer = this.cfg.container;
    let cfgBall = this.cfg.ball;
    this.moveBall(0, cfgContainer.radius - cfgBall.radius, 0, new CANNON.Vec3(100, 0, 0));
    this.wheelTween.restart();
  };

  moveBall(x: number, y: number , z: number, vel: CANNON.Vec3 = new CANNON.Vec3(0, 0, 0)) {
    this.sphereBody.position.set(x, y, z);
    this.sphereBody.velocity = vel;
    this.syncMeshWithBody(this.ball, this.sphereBody);
  }

  setupMeshes() {
    let cfgBall = this.cfg.ball;

    let geometry = new THREE.CircleGeometry( this.cfg.container.radius, 32, 0, 2*Math.PI );

    this.texture = new THREE.CanvasTexture(this.fbo, THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBFormat;
    // let material = new THREE.MeshBasicMaterial({ map: texture });

    let material = new THREE.MeshBasicMaterial({
      color: 0xffffff, map: this.texture, side: THREE.DoubleSide
    });

    this.circle = new THREE.Mesh( geometry, material );
    this.circle.position.set(0, 0, this.cfg.container.height/2);
    this.scene.add( this.circle );

    //Ball
    let sGeometry = new THREE.SphereGeometry( cfgBall.radius, 32, 32 );
    let sMaterial = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    this.ball = new THREE.Mesh( sGeometry, sMaterial );
    // this.scene.add( this.ball );
  }

  setupPhysicalWorld() {
    let cfgContainer = this.cfg.container;
    let cfgBall = this.cfg.ball;
    let cfgMat = this.cfg.material;

    this.cannonWorld = new CANNON.World();
    this.cannonWorld.broadphase = new CANNON.SAPBroadphase(this.cannonWorld);
    this.cannonWorld.gravity.set(0, -9.82, 0);
    this.cannonWorld.quatNormalizeFast = true;
    this.cannonWorld.quatNormalizeSkip = 8;
    // Tweak contact properties.
    // this.cannonWorld.defaultContactMaterial.contactEquationStiffness = 1e0; // Contact stiffness - use to make softer/harder contacts
    // this.cannonWorld.defaultContactMaterial.contactEquationRelaxation = 10; // Stabilization time in number of timesteps
    this.cannonWorld.defaultContactMaterial.friction = .3;
    this.cannonWorld.defaultContactMaterial.restitution = .3;

    let bumpyMaterial = new CANNON.Material('bumpy');
    let bumpy_bumpy = new CANNON.ContactMaterial(
      bumpyMaterial, bumpyMaterial, {
        friction: cfgMat.friction,
        restitution: cfgMat.restitution
      });
    this.cannonWorld.addContactMaterial(bumpy_bumpy);

    let sphereShape = new CANNON.Sphere(cfgBall.radius);
    this.sphereBody = new CANNON.Body({mass: cfgBall.mass, shape: sphereShape});
    // this.sphereBody.allowSleep = true;
    // this.sphereBody.sleepTimeLimit = 1;
    // this.sphereBody.sleepSpeedLimit = .5;
    // this.sphereBody.linearDamping = .01;

    this.moveBall(0,0,0);

    this.cannonWorld.addBody(this.sphereBody);

    //build container
    let planeShapeMinZ = new CANNON.Plane();
    let planeShapeMaxZ = new CANNON.Plane();
    let planeZMin = new CANNON.Body({mass: 0, material: bumpyMaterial});
    let planeZMax = new CANNON.Body({mass: 0, material: bumpyMaterial});

    // planeZMin.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI);
    planeZMax.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), Math.PI);
    planeZMin.position.set(0, 0 , -this.cfg.container.height/2);
    planeZMax.position.set(0, 0, this.cfg.container.height/2);

    planeZMin.addShape(planeShapeMinZ);
    planeZMax.addShape(planeShapeMaxZ);
    this.cannonWorld.addBody(planeZMin);
    this.cannonWorld.addBody(planeZMax);

    this.bars = [];

    let angleFraction = 2*Math.PI / this.cfg.container.nbBars;

    for(let i=0; i< this.cfg.container.nbBars; i++) {
      let radius = i%2 ? cfgContainer.radius:cfgContainer.radius*cfgContainer.markBarHeight;
      let angularPos = i * angleFraction;
      let cylinderShape = new CANNON.Cylinder(.5, .5, 10, 4);
      let cylinderBody = new CANNON.Body({mass: 0, material: bumpyMaterial});
      // cylinderBody.allowSleep = true;
      // cylinderBody.sleepTimeLimit = 1;
      cylinderBody.addShape(cylinderShape);
      cylinderBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angularPos+ Math.PI/4);
      cylinderBody.position.set(radius*Math.cos(angularPos), radius*Math.sin(angularPos), 0);
      this.cannonWorld.addBody(cylinderBody);
      this.bars.push(cylinderBody);
    }

    this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.cannonWorld);
  }

  createMesh(geom) {
    // assign two materials
    let meshMaterial = new THREE.MeshNormalMaterial();
    meshMaterial.side = THREE.DoubleSide;
    let wireFrameMat = new THREE.MeshBasicMaterial();
    wireFrameMat.wireframe = true;
    // create a multimaterial
    let mesh = THREE.SceneUtils.createMultiMaterialObject(geom, [wireFrameMat]);
    return mesh;
  }

  syncMeshWithBody(mesh: THREE.Object3D, body: CANNON.Body) {
    mesh.position.x = body.position.x;
    mesh.position.y = body.position.y;
    mesh.position.z = body.position.z;
    mesh.quaternion.x = body.quaternion.x;
    mesh.quaternion.y = body.quaternion.y;
    mesh.quaternion.z = body.quaternion.z;
    mesh.quaternion.w = body.quaternion.w;
  }

  drawTexture() {
    let ctx: CanvasRenderingContext2D = this.fbo.getContext('2d');

    let xMax = Math.floor(this.fbo.width);
    let yMax = Math.floor(this.fbo.height);
    let centerX = xMax/2;
    let centerY = yMax/2;

    let border = 2;
    let selectedDevelopers: Developer[] = filter(developers, (el: Developer) => el.selected);

    let angle = 2*Math.PI/selectedDevelopers.length;

    let colors = ['white', 'white'];
    let randomOffset = Math.floor(Math.random() * 5);

    ctx.clearRect(0, 0, xMax, yMax);

    ctx.lineWidth = border;
    ctx.strokeStyle = '#003300';

    let i: number = 0;

    //[a,b] circle's center coord
    //[x,y] point to test
    //Area of the disk (x-a)^2 - (y - b)^2 <= r^2
    let insideCircle = (((.5 - this.mouseUVCoord.x)*(.5 - this.mouseUVCoord.x) + (.5 - this.mouseUVCoord.y)*(.5 - this.mouseUVCoord.y)) <= (.5*.5));
    let mousePolarCoordinate: number = Math.atan2(this.mouseUVCoord.y - .5, this.mouseUVCoord.x - .5);

    //if neg, add 360 deg
    if (mousePolarCoordinate < 0) {
      mousePolarCoordinate = mousePolarCoordinate + 2*Math.PI;
    }

    if (selectedDevelopers.length > 1) {
      selectedDevelopers.forEach((dev: Developer) => {
        // let fillStyle = colors[(randomOffset + i) % (colors.length)];
        let mouseInsideSector = (i*angle <= mousePolarCoordinate && mousePolarCoordinate <=(i+1)*angle);
        let fillStyle = (insideCircle && mouseInsideSector) ? 'red':'blue';

        let startAngle = i*angle;
        let endAngle = (i+1)*angle;

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
        ctx.rotate(startAngle + angle/2 + Math.PI/2);
        ctx.drawImage(dev.image, -35, -centerY + 15, 70, 70);
        ctx.restore();
        fillTextCircle(ctx, dev.name, centerX, centerY, -30 -border + centerX, i*angle - angle/2, angle);
        i++;
      });
    }

    this.texture.needsUpdate = true;
  }

  drawTimeTexture() {
    let ctx: CanvasRenderingContext2D = this.fbo.getContext('2d');
    let xMax = Math.floor(this.fbo.width);
    let yMax = Math.floor(this.fbo.height);
    let centerX = xMax/2;
    let centerY = yMax/2;

    let border = 5;

    ctx.clearRect(0, 0, xMax, yMax);

    ctx.beginPath();
    ctx.arc(centerX, centerY, -border + this.fbo.width/2, 0, 2*Math.PI, false);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.lineWidth = border;
    ctx.strokeStyle = '#003300';
    ctx.stroke();

    ctx.font = '18pt Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(new Date().toUTCString(), this.fbo.width / 2, this.fbo.height / 2, this.fbo.width - 2*border);

    this.texture.needsUpdate = true;
  }

  drawUvTexture() {
    let xMax = Math.floor(this.fbo.width);
    let yMax = Math.floor(this.fbo.height);
    let centerX = xMax/2;
    let centerY = yMax/2;

    let ctx: CanvasRenderingContext2D = this.fbo.getContext('2d');
    ctx.save();
    ctx.drawImage(this.uvTexture, 0,0, xMax, yMax);
    ctx.restore();
  }

  drawCrossAir() {
    let xMax = Math.floor(this.fbo.width);
    let yMax = Math.floor(this.fbo.height);
    let centerX = xMax/2;
    let centerY = yMax/2;

    let ctx: CanvasRenderingContext2D = this.fbo.getContext('2d');
    ctx.save();
    let cursorSize = 5;
    ctx.fillStyle = 'red';
    ctx.beginPath();
    // console.log('mouseUVCoord', this.mouseUVCoord);
    // console.log('map x', xMax*this.mouseUVCoord.x);
    // console.log('map y', xMax*this.mouseUVCoord.y);
    ctx.rect(
      xMax*this.mouseUVCoord.x - cursorSize/2,
      yMax*this.mouseUVCoord.y - cursorSize/2,
      cursorSize, cursorSize
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }


  getMousePosition ( dom, x, y ) {
    let rect = dom.getBoundingClientRect();
    return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];
  }

  getIntersects ( point, objects ) {
    this.mouse.set( ( point.x * 2 ) - 1, - ( point.y * 2 ) + 1 );
    this.raycaster.setFromCamera( this.mouse,this. camera );
    return this.raycaster.intersectObjects( objects );
  }

  mouseMove = ( evt ) => {
    evt.preventDefault();

    let array = this.getMousePosition( this.renderer.domElement, evt.clientX, evt.clientY );
    this.onClickPosition.fromArray( array );

    let intersects : any[] = this.getIntersects( this.onClickPosition, [this.circle] );

    //reset
    this.mouseUVCoord.set(0, 0);

    if (intersects.length) {
      intersects.forEach((intersection: any) => {
        if (intersection.uv) {
          let uv = intersection.uv;
          intersection.object.material.map.transformUv( uv );
          this.mouseUVCoord.set(uv.x, uv.y);
          return;
        }
      });
    }

    let insideCircle = (((.5 - this.mouseUVCoord.x)*(.5 - this.mouseUVCoord.x) + (.5 - this.mouseUVCoord.y)*(.5 - this.mouseUVCoord.y)) <= (.5*.5));

    if (insideCircle) {
      this.drawTexture();
    }
  };

  updatePhysicalWorld = () => {
    let now = new Date().getTime();
    let dt = (now - this.lastTick) / 1000;
    this.cannonWorld.step(1/25, dt, 2);
    this.lastTick = now;

    this.syncMeshWithBody(this.ball, this.sphereBody);

    this.cannonDebugRenderer.update();
  };

  animate = () => {
    if (this.renderer && this.scene && this.camera) {
      this.stats.begin();
      this.renderer.render( this.scene, this.camera );
      this.stats.end();
    }
    requestAnimationFrame(this.animate);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  let Wof = new Application();
});