///<reference path="./cannon.d.ts" />
///<reference path="./extra.d.ts" />

import {TweenLite} from "gsap";
import * as dat from 'dat-gui';

import HDRCubeTextureLoader from './HDRCubeTextureLoader';
import PMREMGenerator from './PMREMGenerator';
import PMREMCubeUVPacker from './PMREMCubeUVPacker';
import EffectComposer, { RenderPass, ShaderPass, CopyShader } from 'three-effectcomposer-es6';
import UnrealBloomPass from './UnrealBloomPass';

declare var require;
declare class Stats {
  REVISION: number;
  domElement: HTMLDivElement;
  /**
   * @param value 0:fps, 1: ms, 2: mb, 3+: custom
   */
  showPanel(value: number): void;
  begin(): void;
  end(): number;
  update(): void;
}

import {filter} from "lodash";
import * as THREE from 'three';
import {CannonDebugRenderer} from './CannonDebugRenderer';
let OrbitControls = require('three-orbit-controls')(THREE);

interface Developer {
  name: string;
  srcAvatar: string;
  image: HTMLImageElement;
  selected: boolean;
}

let developers: Developer[] = [
  {name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true},
  {name: 'Stretcho', srcAvatar: './dist/img/john.png', image: null, selected: true},
  {name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true},
  {name: 'Stretcho', srcAvatar: './dist/img/john.png', image: null, selected: true},
  {name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true},
];

let defaultCfg: any = {
  physicWorld: {
    step: 1/600,
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
  stats: Stats;
  gui: dat.GUI;
  //global stuff
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  renderScene: RenderPass;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  //Cfg
  cfg: any;

  hdrCubeRenderTarget: any;


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
  bars: any[];

  //tween
  wheelTween: TweenLite;

  //debug
  cannonDebugRenderer: CannonDebugRenderer;

  constructor() {
    this.free();
    this.init();
  }

  free(){
    this.scene = null;
    this.renderer = null;
    this.camera = null;
  }

  refresh () {
    this.drawTexture();
  }

  init() {

    this.cfg = defaultCfg;

    this.stats = new Stats();
    console.log('this.stats', this.stats);
    this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    if (this.stats.domElement) {
      this.stats.domElement.className = 'stats';
      document.body.appendChild( this.stats.domElement );
    }
    let cfgContainer = this.cfg.container;

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

    this.renderer.shadowMap.enabled = true;

    this.renderer.domElement.addEventListener( 'mousemove', this.mouseMove, false );
    document.body.appendChild( this.renderer.domElement );

    this.camera.position.set(100, 0, 0);
    this.camera.lookAt(new THREE.Vector3(0,0,0));

    this.setupMeshes();
    this.setupPhysicalWorld();
    this.loadAssets();

    this.gui = new dat.GUI();

    developers.forEach((developer) => {
      this.gui.add(developer, 'selected').name(developer.name).onChange(this.refresh.bind(this));
    });

    this.gui.add({spinWheel: this.spinWheel}, 'spinWheel');

    // this.moveBall(new THREE.Vector3(-cfgContainer.radius + cfgBall.radius/2, 0, 0));
  }

  loadAssets() {
    this.loadingManager = new THREE.LoadingManager(() => {
      //Finished loading assets

      setInterval(() => {
        // console.log('Sphere Speed', this.sphereBody.velocity.length());
        }, 2000);

      this.drawTexture();
      this.animate();
    });
    developers.forEach((element: Developer) => {
      element.image = new THREE.ImageLoader(this.loadingManager).load(element.srcAvatar);
    });
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
    // let sGeometry = new THREE.SphereGeometry( cfgBall.radius, 32, 32 );
    let sGeometry = new THREE.BoxGeometry(cfgBall.radius, cfgBall.radius, cfgBall.radius) ;
    let sMaterial = new THREE.MeshStandardMaterial({
      map: null,
      color: 0xffff00,
      metalness: 1.0
    });
    this.ball = new THREE.Mesh( sGeometry, sMaterial );
    this.scene.add( this.ball );

    let textureLoader = new THREE.TextureLoader();
    textureLoader.load( "/dist/textures/roughness_map.jpg", function( map ) {
      // map.wrapS = THREE.RepeatWrapping;
      // map.wrapT = THREE.RepeatWrapping;
      // map.anisotropy = 4;
      // map.repeat.set( 9, 2 );
      sMaterial.roughnessMap = map;
      sMaterial.bumpMap = map;
      sMaterial.needsUpdate = true;
    } );

    let genCubeUrls = function( prefix, postfix ) {
      return [
        prefix + 'px' + postfix, prefix + 'nx' + postfix,
        prefix + 'py' + postfix, prefix + 'ny' + postfix,
        prefix + 'pz' + postfix, prefix + 'nz' + postfix
      ];
    };

    let hdrUrls = genCubeUrls( "./dist/textures/pisaHDR/", ".hdr" );
    let hdrCubeLoader = new HDRCubeTextureLoader().load( THREE.UnsignedByteType, hdrUrls, ( hdrCubeMap ) => {

      let pmremGenerator = new PMREMGenerator( hdrCubeMap );
      pmremGenerator.update( this.renderer );

      let pmremCubeUVPacker = new PMREMCubeUVPacker( pmremGenerator.cubeLods );
      pmremCubeUVPacker.update( this.renderer );

      this.hdrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;

    } );
    // Lights

    this.scene.add( new THREE.AmbientLight( 0x222222 ) );
    let spotLight = new THREE.SpotLight( 0xffffff );
    spotLight.position.set( 50, 100, 50 );
    spotLight.angle = Math.PI / 7;
    spotLight.penumbra = 0.8;
    spotLight.castShadow = true;
    this.scene.add( spotLight );

    this.renderScene = new RenderPass(this.scene, this.camera);

    let bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);//1.0, 9, 0.5, 512);
    this.composer = new EffectComposer(this.renderer);
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
    // this.cannonWorld.quatNormalizeFast = true;
    // this.cannonWorld.quatNormalizeSkip = 8;
    this.cannonWorld.allowSleep = true;

    // // Max solver iterations: Use more for better force propagation, but keep in mind that it's not very computationally cheap!
    this.cannonWorld.solver.iterations = phxCfg.solverIteration;
    // this.cannonWorld.defaultContactMaterial.contactEquationRelaxation = phxCfg.contactEquationRelaxation; // Stabilization time in number of timesteps
    this.cannonWorld.defaultContactMaterial.frictionEquationRelaxation = phxCfg.frictionEquationRelaxation;

    let groundMaterial = new CANNON.Material('ground');
    let bumpyMaterial = new CANNON.Material('bumpy');

    let bumpy_ground = new CANNON.ContactMaterial(
      groundMaterial, bumpyMaterial, {
        friction: 0,
        restitution: 1000,
      });
    // this.cannonWorld.addContactMaterial(bumpy_bumpy);
    this.cannonWorld.addContactMaterial(bumpy_ground);

    let sphereShape = new CANNON.Sphere(cfgBall.radius);
    this.sphereBody = new CANNON.Body({mass: cfgBall.mass, shape: sphereShape, material: bumpyMaterial.id});
    this.sphereBody.allowSleep = true;
    this.sphereBody.sleepTimeLimit = cfgBall.sleepTimeLimit;
    this.sphereBody.sleepSpeedLimit = cfgBall.sleepSpeedLimit;
    this.sphereBody.linearDamping = cfgBall.linearDamping;

    this.moveBall(0,0,0);

    this.cannonWorld.addBody(this.sphereBody);

    //build container
    let planeShapeMinZ = new CANNON.Plane();
    let planeShapeMaxZ = new CANNON.Plane();
    let planeZMin = new CANNON.Body({mass: 0, material: groundMaterial.id});
    let planeZMax = new CANNON.Body({mass: 0, material: groundMaterial.id});

    planeZMin.allowSleep = true;
    planeZMin.sleepTimeLimit = 1;
    planeZMin.sleepSpeedLimit = .5;
    planeZMin.linearDamping = .01;
    planeZMax.allowSleep = true;
    planeZMax.sleepTimeLimit = 1;
    planeZMax.sleepSpeedLimit = .5;
    planeZMax.linearDamping = .01;

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
      let radius = i%2 ? cfgContainer.radius*.98:cfgContainer.radius*.90;
      // let radius = cfgContainer.radius;
      let angularPos = i * angleFraction;

      let boxShape = new CANNON.Box(new CANNON.Vec3(cfgContainer.barSize.y, cfgContainer.barSize.x, cfgContainer.barSize.z));
      let cylinderBody = new CANNON.Body({mass: 0, material: groundMaterial.id});
      cylinderBody.allowSleep = true;
      cylinderBody.addShape(boxShape);
      cylinderBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angularPos);
      cylinderBody.position.set((cfgContainer.barSize.y+radius)*Math.cos(angularPos), (cfgContainer.barSize.y+radius)*Math.sin(angularPos), 0);

      let wallRadius = cfgContainer.radius;
      let wall = new CANNON.Plane();
      let wallBody = new CANNON.Body({mass: 0, material: groundMaterial.id});
      wallBody.addShape(wall);
      wallBody.position.set((wallRadius)*Math.cos(angularPos), (wallRadius)*Math.sin(angularPos), 0);
      wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2);
      let rotation = new CANNON.Quaternion();
      rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), +3*Math.PI/2 - angularPos);
      wallBody.quaternion.copy(wallBody.quaternion.mult(rotation));

      this.cannonWorld.addBody(cylinderBody);
      this.cannonWorld.addBody(wallBody);
      this.bars.push({wall: wallBody, cylinder: cylinderBody});
    }

    this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.cannonWorld);
  }

  spinWheel = () => {

    let cfgContainer = this.cfg.container;

    if (this.wheelTween) {
      this.wheelTween.restart();
    } else {
      this.wheelTween = TweenLite.to(cfgContainer, 10, {
        currentRotation: '+='+ 100*Math.PI * Math.random() * .5 + .5,
        ease: Expo.easeOut,
        onUpdate: this.tweenWheel
      });
    }
    this.moveBall(3, 3, 0, new CANNON.Vec3(40, 40, 0));
  };

  tweenWheel = () => {

    let cfgContainer = this.cfg.container;
    let lastTweenTick = new Date().getTime();
    let angleFraction = 2*Math.PI / cfgContainer.nbBars;
    let lastAngle = 0;

    this.circle.rotation.set(0, 0, cfgContainer.currentRotation);
    this.bars.forEach((bar: any, i) => {

      let wall = bar.wall;
      let cylinder = bar.cylinder;

      let angularPos = i * angleFraction;
      let radius = i%2 ? cfgContainer.radius*.98:cfgContainer.radius*.95;

      // let radius = cfgContainer.radius;
      let newX = (cfgContainer.radius)*Math.cos(angularPos + cfgContainer.currentRotation);
      let newY = (cfgContainer.radius)*Math.sin(angularPos + cfgContainer.currentRotation);

      let now = new Date().getTime();
      let dt = (lastTweenTick - now);
      let angleDiff = cfgContainer.currentRotation - lastAngle;
      let tanSpeed = cfgContainer.radius * angleDiff / dt;

      let tanX = newX*Math.cos(Math.PI/2) - newY * Math.sin(Math.PI/2);
      let tanY = newX*Math.sin(Math.PI/2) + newY * Math.cos(Math.PI/2);

      let circularForce = new CANNON.Vec3( tanX, tanY, 0);
      circularForce.normalize();
      circularForce.scale(tanSpeed);

      let newX2 = (cfgContainer.barSize.y+radius)*Math.cos(angularPos + cfgContainer.currentRotation);
      let newY2 = (cfgContainer.barSize.y+radius)*Math.sin(angularPos + cfgContainer.currentRotation);

      cylinder.velocity = circularForce;
      cylinder.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), i*angleFraction + cfgContainer.currentRotation);
      cylinder.position.set(newX2, newY2, 0);

      wall.position.set(newX, newY, 0);
      wall.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2);
      let rotation = new CANNON.Quaternion();
      rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), +3*Math.PI/2 - (angularPos + cfgContainer.currentRotation));
      wall.quaternion.copy(wall.quaternion.mult(rotation));

      lastTweenTick = now;
      lastAngle = cfgContainer.currentRotation;
    });
  };

  moveBall(x: number, y: number , z: number, vel: CANNON.Vec3 = new CANNON.Vec3(0, 0, 0)) {
    this.sphereBody.position.set(x, y, z);
    this.sphereBody.velocity = vel;
    this.syncMeshWithBody(this.ball, this.sphereBody);
    this.sphereBody.wakeUp();
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

    let phxCfg = this.cfg.physicWorld;
    let now = new Date().getTime();
    let dt = (now - this.lastTick) / 1000;
    this.cannonWorld.step(phxCfg.step, dt, phxCfg.subStep);
    this.lastTick = now;

    //Mesh update
    this.syncMeshWithBody(this.ball, this.sphereBody);
    this.cannonDebugRenderer.update();
  };

  animate = (event: any = null) => {
    this.stats.begin();
    if (this.renderer && this.scene && this.camera) {
      this.updatePhysicalWorld();
      this.renderer.render( this.scene, this.camera );
    }
    this.stats.end();
    requestAnimationFrame(this.animate);
  }
}

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

document.addEventListener("DOMContentLoaded", function () {
  let Wof = new Application();
});