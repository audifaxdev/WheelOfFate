///<reference path="./cannon.d.ts" />
///<reference path="./extra.d.ts" />

import {TweenLite} from "gsap";
import {filter} from "lodash";
import * as THREE from 'three';
import EffectComposer, { RenderPass, ShaderPass, CopyShader } from 'three-effectcomposer-es6';
import HDRCubeTextureLoader from './HDRCubeTextureLoader';
import PMREMGenerator from './PMREMGenerator';
import PMREMCubeUVPacker from './PMREMCubeUVPacker';
import UnrealBloomPass from './UnrealBloomPass';
import * as dat from 'dat-gui';
import {CannonDebugRenderer} from './CannonDebugRenderer';
let OrbitControls = require('three-orbit-controls')(THREE);

declare let require;

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
  name: string;
  srcAvatar: string;
  image: HTMLImageElement;
  selected: boolean;
}

let developers: Developer[] = [
  {name: 'Alpha', srcAvatar: './dist/img/alpha.png', image: null, selected: true},
  {name: 'Beta', srcAvatar: './dist/img/beta.png', image: null, selected: true},
  {name: 'Gamma', srcAvatar: './dist/img/gamma.png', image: null, selected: true},
  {name: 'Delta', srcAvatar: './dist/img/delta.gif', image: null, selected: true},
  {name: 'Zeta', srcAvatar: './dist/img/zeta.png', image: null, selected: true},
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
      x: .5, y: 1, z: 4
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
  //Cfg
  cfg: any;

  //THREE
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  renderPass: RenderPass;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  hdrCubeRenderTarget: any;
  controls: THREE.OrbitControls;
  loadingManager: THREE.LoadingManager;
  hdrMaterials: THREE.MeshStandardMaterial[];
  //fbo/texture and other material
  fbo: HTMLCanvasElement;
  texture: THREE.CanvasTexture;

  //Mesh
  circle: THREE.Mesh;
  ball: THREE.Mesh;
  wheel: THREE.Object3D;
  sphereBody: CANNON.Body;

  //Interactivity
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  onClickPosition: THREE.Vector2;
  mouseUVCoord: THREE.Vector2;

  //tween
  wheelTween: TweenLite;

  //physics
  lastTick: number;
  cannonWorld: CANNON.World;
  cannonDebugRenderer: CannonDebugRenderer;

  stats: Stats;
  gui: dat.GUI;
  currentWinner: Developer;
  bars: any[];

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
    this.updateTexture();
  }

  init() {
    this.cfg = defaultCfg;
    this.hdrMaterials = [];
    this.currentWinner = null;

    this.stats = new Stats();
    this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    if (this.stats.domElement) {
      this.stats.domElement.className = 'stats';
      document.body.appendChild( this.stats.domElement );
    }

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

    this.camera.position.set(0, 5, -50);
    this.camera.lookAt(new THREE.Vector3(0,0,0));

    this.setupMeshes();
    this.setupPhysicalWorld();
    this.loadAssets();

    this.gui = new dat.GUI();

    developers.forEach((developer) => {
      this.gui.add(developer, 'selected').name(developer.name).onChange(this.refresh.bind(this));
    });
    this.gui.add(this.cfg.container, 'currentRotation', -4*Math.PI, 4*Math.PI).onChange(this.tweenWheel);
    this.gui.add({spinWheel: this.spinWheel}, 'spinWheel');

  }

  loadAssets() {
    this.loadingManager = new THREE.LoadingManager(() => {
      this.updateTexture();
      this.render();
    });

    developers.forEach((element: Developer) => {
      element.image = new THREE.ImageLoader(this.loadingManager).load(element.srcAvatar);
    });
  }

  setupMeshes() {
    let cfgBall = this.cfg.ball;

    let geometry = new THREE.CircleGeometry( this.cfg.container.radius, 32, 0, 2*Math.PI );

    let cylinderGeometry = new THREE.CylinderGeometry(
      this.cfg.container.radius, this.cfg.container.radius.radius, this.cfg.container.height, 32, 4, true
    );

    this.texture = new THREE.CanvasTexture(this.fbo, THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBFormat;
    // let material = new THREE.MeshBasicMaterial({ map: texture });

    let cylMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, side: THREE.DoubleSide, metalness: .9
    });
    cylMaterial.roughness = 1.0;

    let diskmaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff, map: this.texture, side: THREE.DoubleSide
    });

    let cylinder = new THREE.Mesh(cylinderGeometry, cylMaterial);
    cylinder.position.set(0, 0, 0);
    cylinder.rotateX(Math.PI/2);

    this.wheel = new THREE.Object3D();
    this.wheel.add(cylinder);
    this.scene.add(this.wheel);

    this.circle = new THREE.Mesh( geometry, diskmaterial );
    this.circle.position.set(0, 0, this.cfg.container.height/2);
    this.wheel.add(this.circle);

    //Ball
    let sGeometry = new THREE.SphereGeometry( cfgBall.radius, 32, 32 );

    let sMaterial = new THREE.MeshStandardMaterial({
      map: null,
      color: 0xffffff,
      metalness: 1.0
    });
    sMaterial.roughness = 1.0;
    sMaterial.bumpScale = -0.05;

    this.hdrMaterials.push(sMaterial, cylMaterial);

    this.ball = new THREE.Mesh( sGeometry, sMaterial );
    this.scene.add( this.ball );

    let textureLoader = new THREE.TextureLoader();
    textureLoader.load( "/dist/img/BasketBallColor.jpg", ( map ) => {
      // map.wrapS = THREE.RepeatWrapping;
      // map.wrapT = THREE.RepeatWrapping;
      // map.repeat.set( 9, 2 );
      map.anisotropy = 4;
      for (let i=0;i<this.hdrMaterials.length; i++) {
        this.hdrMaterials[i].roughnessMap = map;
        this.hdrMaterials[i].bumpMap = map;
        this.hdrMaterials[i].needsUpdate = true;
      }
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

    this.scene.add( new THREE.AmbientLight( 0x222222 ) );
    let spotLight = new THREE.SpotLight( 0xffffff );
    spotLight.position.set( 50, 100, 50 );
    spotLight.angle = Math.PI / 7;
    spotLight.penumbra = 0.8;
    spotLight.castShadow = true;
    this.scene.add( spotLight );

    this.renderPass = new RenderPass(this.scene, this.camera);
    let copyShader = new ShaderPass(CopyShader);
    copyShader.renderToScreen = true;
    let bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, .4, 0.85);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(bloomPass);
    this.composer.addPass(copyShader);
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
  }

  setupPhysicalWorld() {
    let cfgContainer = this.cfg.container;
    let cfgBall = this.cfg.ball;

    this.cannonWorld = new CANNON.World();
    this.cannonWorld.quatNormalizeSkip = 0;
    this.cannonWorld.quatNormalizeFast = false;

    let solver = new CANNON.GSSolver();
    solver.iterations = 10;
    solver.tolerance = 0.2;
    this.cannonWorld.solver = solver;
    this.cannonWorld.gravity.set(0,-25,0);
    this.cannonWorld.broadphase = new CANNON.NaiveBroadphase();

    this.cannonWorld.defaultContactMaterial.contactEquationStiffness = 1e5;
    this.cannonWorld.defaultContactMaterial.contactEquationRegularizationTime = 4;

    let physicsMaterial = new CANNON.Material("slipperyMaterial");
    let boxPhysicsMaterial = new CANNON.Material("boxMaterial");
    let boxContactMaterial = new CANNON.ContactMaterial(physicsMaterial,
      boxPhysicsMaterial,
      {friction: 0, restitution: 0.9}
    );
    let bumpy_ground = new CANNON.ContactMaterial(physicsMaterial,
      physicsMaterial,
      {friction: 0.4, restitution: 0.9}
    );

    this.cannonWorld.addContactMaterial(boxContactMaterial);
    this.cannonWorld.addContactMaterial(bumpy_ground);

    let sphereShape = new CANNON.Sphere(cfgBall.radius);
    this.sphereBody = new CANNON.Body({mass: cfgBall.mass, shape: sphereShape, material: boxPhysicsMaterial.id});
    this.sphereBody.allowSleep = true;
    // this.sphereBody.sleepTimeLimit = cfgBall.sleepTimeLimit;
    // this.sphereBody.sleepSpeedLimit = cfgBall.sleepSpeedLimit;
    // this.sphereBody.linearDamping = cfgBall.linearDamping;

    this.moveBall(0,0,0);

    this.cannonWorld.addBody(this.sphereBody);

    //build container
    let planeShapeMinZ = new CANNON.Plane();
    let planeShapeMaxZ = new CANNON.Plane();
    let planeZMin = new CANNON.Body({mass: 0, material: physicsMaterial.id});
    let planeZMax = new CANNON.Body({mass: 0, material: physicsMaterial.id});

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
      let barRadius = i%2 ? cfgContainer.radius*1.02:cfgContainer.radius;
      let radius = cfgContainer.radius;
      let angularPos = i * angleFraction;

      let boxShape = new CANNON.Box(new CANNON.Vec3(cfgContainer.barSize.y, cfgContainer.barSize.x, cfgContainer.barSize.z));
      let cylinderBody = new CANNON.Body({mass: 0, material: physicsMaterial.id});
      cylinderBody.allowSleep = true;
      cylinderBody.addShape(boxShape);
      cylinderBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angularPos);
      cylinderBody.position.set((barRadius)*Math.cos(angularPos), (barRadius)*Math.sin(angularPos), 0);

      let bumpBoxGeometry = new THREE.BoxGeometry(2*cfgContainer.barSize.y, 2*cfgContainer.barSize.x, 2*cfgContainer.barSize.z);
      let bumpBoxMesh = new THREE.Mesh(bumpBoxGeometry, this.hdrMaterials[0]);

      this.syncMeshWithBody(bumpBoxMesh, cylinderBody);

      this.wheel.add(bumpBoxMesh);

      let wall = new CANNON.Plane();
      let wallBody = new CANNON.Body({mass: 0, material: physicsMaterial.id});
      wallBody.addShape(wall);
      wallBody.position.set((radius)*Math.cos(angularPos), (radius)*Math.sin(angularPos), 0);
      wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2);
      let rotation = new CANNON.Quaternion();
      rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), +3*Math.PI/2 - angularPos);
      wallBody.quaternion.copy(wallBody.quaternion.mult(rotation));

      this.cannonWorld.addBody(cylinderBody);
      this.cannonWorld.addBody(wallBody);
      this.bars.push({wall: wallBody, cylinder: cylinderBody, mesh: bumpBoxMesh});
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
    this.moveBall(3, 3, 0, new CANNON.Vec3(999, 999, 0));
  };

  tweenWheel = () => {

    let cfgContainer = this.cfg.container;
    let lastTweenTick = new Date().getTime();
    let angleFraction = 2*Math.PI / cfgContainer.nbBars;
    let lastAngle = 0;

    // this.circle.rotation.set(0, 0, cfgContainer.currentRotation);
    this.wheel.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -cfgContainer.currentRotation);
    this.bars.forEach((bar: any, i) => {

      let wall = bar.wall;
      let cylinder = bar.cylinder;

      let angularPos = i * angleFraction;
      let radius = i%2 ? cfgContainer.radius*1.02:cfgContainer.radius;

      // let radius = cfgContainer.radius;
      let newX = (cfgContainer.radius)*Math.cos(angularPos + -cfgContainer.currentRotation);
      let newY = (cfgContainer.radius)*Math.sin(angularPos + -cfgContainer.currentRotation);

      let now = new Date().getTime();
      let dt = (lastTweenTick - now);
      let angleDiff = cfgContainer.currentRotation - lastAngle;
      let tanSpeed = cfgContainer.radius * angleDiff / dt;

      let tanX = newX*Math.cos(Math.PI/2) - newY * Math.sin(Math.PI/2);
      let tanY = newX*Math.sin(Math.PI/2) + newY * Math.cos(Math.PI/2);

      let circularForce = new CANNON.Vec3( tanX, tanY, 0);
      circularForce.normalize();
      circularForce.scale(tanSpeed);

      let newX2 = (radius)*Math.cos(angularPos + -cfgContainer.currentRotation);
      let newY2 = (radius)*Math.sin(angularPos + -cfgContainer.currentRotation);

      cylinder.velocity = circularForce;
      cylinder.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), i*angleFraction + -cfgContainer.currentRotation);
      cylinder.position.set(newX2, newY2, 0);

      wall.position.set(newX, newY, 0);
      wall.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI/2);
      let rotation = new CANNON.Quaternion();
      rotation.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), +3*Math.PI/2 - (angularPos + -cfgContainer.currentRotation));
      wall.quaternion.copy(wall.quaternion.mult(rotation));


      lastTweenTick = now;
      lastAngle = cfgContainer.currentRotation;
    });
  };

  moveBall(x: number, y: number , z: number, vel: CANNON.Vec3 = new CANNON.Vec3(999, 999, 999)) {

    this.sphereBody.position.set(x, y, z);
    this.sphereBody.velocity = vel;
    this.syncMeshWithBody(this.ball, this.sphereBody);
    this.sphereBody.wakeUp();
  }

  syncMeshWithBody(mesh, body) {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }

  updateTexture() {
    let ctx: CanvasRenderingContext2D = this.fbo.getContext('2d');
    let xMax = Math.floor(this.fbo.width);
    let yMax = Math.floor(this.fbo.height);
    let centerX = xMax/2;
    let centerY = yMax/2;
    let border = 2;
    let selectedDevelopers: Developer[] = filter(developers, (el: Developer) => el.selected);
    let angle = 2*Math.PI/selectedDevelopers.length;
    let i: number = 0;
    let insideCircle = (this.ball.position.x * this.ball.position.x) - (this.ball.position.y * this.ball.position.y) <= (this.cfg.container.radius*this.cfg.container.radius);
    let extra = -this.cfg.container.currentRotation % (2*Math.PI);
    let mousePolarCoordinate: number = -Math.atan2(this.ball.position.y, this.ball.position.x) + extra;

    ctx.clearRect(0, 0, xMax, yMax);
    ctx.lineWidth = border;
    ctx.strokeStyle = '#003300';

    if (selectedDevelopers.length > 1) {
      selectedDevelopers.forEach((dev: Developer) => {
        let startAngle = i*angle;
        let endAngle = (i+1)*angle;
        let mouseInsideSector = (startAngle <= mousePolarCoordinate && mousePolarCoordinate <= endAngle);
        let fillStyle = (insideCircle && mouseInsideSector) ? 'red':'blue';
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
        // fillTextCircle(ctx, dev.name, centerX, centerY, -30 -border + centerX, i*angle - angle/2, angle);
        i++;
      });
    }
    this.texture.needsUpdate = true;
  }

  computeCurrentWinner() {
    // let selectedDevelopers: Developer[] = filter(developers, (el: Developer) => el.selected);
    // let angle = 2*Math.PI/selectedDevelopers.length;
    // let i: number = 0;
    //
    // //[a,b] circle's center coord
    // //[x,y] point to test
    // //Area of the disk (x-a)^2 - (y - b)^2 <= r^2
    // let insideCircle = (this.ball.position.x * this.ball.position.x) - (this.ball.position.y * this.ball.position.y)
    //   <= (this.cfg.container.radius*this.cfg.container.radius);
    //
    // if (!insideCircle) {
    //   console.warn('BALL IS NOT INSIDE CYLINDER?!?!?!?!');
    // }
    // let extra = this.cfg.container.currentRotation % 2*Math.PI;
    // let ballPolarCoord = -Math.atan2(this.ball.position.y, this.ball.position.x) - extra;
    //
    // if (selectedDevelopers.length > 1) {
    //   let found = false;
    //   selectedDevelopers.forEach((dev: Developer) => {
    //     let startAngle = (i*angle);
    //     let endAngle = ((i+1)*angle);
    //     if ((startAngle <= ballPolarCoord && ballPolarCoord <= endAngle)) {
    //       this.setCurrentWinner(dev);
    //       found = true;
    //     }
    //     i++;
    //   });
    //   if (!found) {
    //     console.warn('COULD NOT FIND WINNER/');
    //     console.log('ballPolarCoord', ballPolarCoord);
    //   }
    // }
  }

  setCurrentWinner(dev: Developer) {
    if (dev !== this.currentWinner) {
      this.currentWinner = dev;
      // console.log('NEW WINNDER IS ', dev.name);
      this.updateTexture();
    } else {
      // console.log('SKIPPING WINNER IS ALREADY ', dev.name);
    }
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
    //
    // let array = this.getMousePosition( this.renderer.domElement, evt.clientX, evt.clientY );
    // this.onClickPosition.fromArray( array );
    //
    // let intersects : any[] = this.getIntersects( this.onClickPosition, [this.circle] );
    //
    // //reset
    // this.mouseUVCoord.set(0, 0);
    // let mouseDiskIntersect = new THREE.Vector3();
    //
    // if (intersects.length) {
    //   intersects.forEach((intersection: any) => {
    //     mouseDiskIntersect = intersection.point;
    //     if (intersection.uv) {
    //       let uv = intersection.uv;
    //       intersection.object.material.map.transformUv( uv );
    //       this.mouseUVCoord.set(uv.x, uv.y);
    //       return;
    //     }
    //   });
    // }
  };

  updatePhysicalWorld = () => {

    let phxCfg = this.cfg.physicWorld;
    let now = new Date().getTime();
    let dt = (now - this.lastTick) / 1000;
    this.cannonWorld.step(phxCfg.step, dt, phxCfg.subStep);
    this.lastTick = now;

    //Mesh update
    this.syncMeshWithBody(this.ball, this.sphereBody);

    if (this.cannonDebugRenderer) {
      this.cannonDebugRenderer.update();
    }
  };

  render = (event: any = null) => {
    this.stats.begin();
    if (this.composer && this.scene && this.camera) {
      this.updatePhysicalWorld();
      for (let i=0;i<this.hdrMaterials.length; i++) {
        let newEnvMap = this.hdrCubeRenderTarget ? this.hdrCubeRenderTarget.texture : null;
        if( newEnvMap !== this.hdrMaterials[i].envMap ) {
          this.hdrMaterials[i].envMap = newEnvMap;
          this.hdrMaterials[i].needsUpdate = true;
        }
      }
      this.updateTexture();
      this.computeCurrentWinner();
      this.composer.render();
    }
    this.stats.end();
    requestAnimationFrame(this.render);
  }
}
declare let Wof;

document.addEventListener("DOMContentLoaded",  () => {
  Wof = new Application();
});

export default Wof;

