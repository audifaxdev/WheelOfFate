/// <reference types="node" />
/// <reference types="dat-gui" />
/// <reference types="gsap" />
/// <reference path="./cannon.d.ts" />

import {filter} from "lodash";
import * as THREE from 'three';
let OrbitControls = require('three-orbit-controls')(THREE);

// import {CannonDebugRenderer} from './CannonDebugRenderer';

interface Developer {
  name: string,
  srcAvatar: string,
  image: HTMLImageElement,
  selected: boolean
};

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

let developers: Developer[] = [
  {name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true},
  {name: 'Stretcho', srcAvatar: './dist/img/john.png', image: null, selected: true},
  {name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true},
  {name: 'Stretcho', srcAvatar: './dist/img/john.png', image: null, selected: true},
  {name: 'Davo', srcAvatar: './dist/img/matthew.png', image: null, selected: true},
];

function radianToDegree(val: number) {
  return val*180/Math.PI;
}

class Application {
  gui: dat.GUI;
  //global stuff
  renderer: THREE.Renderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  lights: THREE.Light[];

  //Mesh
  circle: THREE.Mesh;

  ball: THREE.Mesh;
  sphereBody: CANNON.Body;

  cylinder: THREE.Object3D;
  physicalCylinder: CANNON.Cylinder;

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

  //debug
  // physicDebugRenderer: CannonDebugRenderer;


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
    this.camera.position.set(100, 100, 100);
    this.camera.lookAt(new THREE.Vector3(0,0,0));

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

    this.renderer.domElement.addEventListener( 'mousemove', this.mousemove.bind(this), false );
    document.body.appendChild( this.renderer.domElement );

    let geometry = new THREE.CircleGeometry( 20, 32, 0, 2*Math.PI );

    this.texture = new THREE.CanvasTexture(this.fbo, THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBFormat;
    // let material = new THREE.MeshBasicMaterial({ map: texture });

    let material = new THREE.MeshBasicMaterial({
      color: 0xffffff, map: this.texture, side: THREE.DoubleSide
    });

    this.circle = new THREE.Mesh( geometry, material );
    this.circle.position.set(0, 0, -5);
    this.scene.add( this.circle );

    this.gui = new dat.GUI();

    developers.forEach((developer) => {
      this.gui.add(developer, 'selected').name(developer.name).onChange(this.refresh.bind(this));
    });

    this.gui.add({spinWheel: () => {
      TweenLite.to(this.circle.rotation, 2, { z: '+=10'});
    }}, 'spinWheel');

    this.setupPhysicalWorld();

    this.loadAssets();
  }

  setupPhysicalWorld() {
    this.cannonWorld = new CANNON.World();
    this.cannonWorld.gravity.set(0, -9.82, 0);

    // Tweak contact properties.
    this.cannonWorld.defaultContactMaterial.contactEquationStiffness = 1e11; // Contact stiffness - use to make softer/harder contacts
    this.cannonWorld.defaultContactMaterial.contactEquationRelaxation = 2; // Stabilization time in number of timesteps

    //Ball
    let sGeometry = new THREE.SphereGeometry( 1, 32, 32 );
    let sMaterial = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    this.ball = new THREE.Mesh( sGeometry, sMaterial );

    let mass = 5, radius = 1;
    let sphereShape = new CANNON.Sphere(radius);
    this.sphereBody = new CANNON.Body({mass: mass, shape: sphereShape});

    this.ball.position.set(0, 0, 0);
    this.sphereBody.position.set(0, 0, 0);

    this.scene.add( this.ball );
    this.cannonWorld.addBody(this.sphereBody);

    //build container
    let stoneMaterial = new CANNON.Material('stone');
    let stone_stone = new CANNON.ContactMaterial(stoneMaterial, stoneMaterial, {
      friction: 0.3,
      restitution: 0.2
    });
    this.cannonWorld.addContactMaterial(stone_stone);

    let cylinderCfg = {
      height: 20,
      x: 0,
      y: 0,
      z: 0
    };

    let geometry = new THREE.PlaneGeometry(100, 100, 2, 2);
    let meshZMin = this.createMesh(geometry);
    let meshZMax = this.createMesh(geometry);

    let planeShapeMinZ = new CANNON.Plane();
    let planeShapeMaxZ = new CANNON.Plane();

    let planeZMin = new CANNON.Body({mass: 0, material: stoneMaterial});
    let planeZMax = new CANNON.Body({mass: 0, material: stoneMaterial});

    planeZMin.addShape(planeShapeMinZ);
    planeZMax.addShape(planeShapeMaxZ);

    planeZMin.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
    planeZMax.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0), -Math.PI/2);
    planeZMin.position.set(0, -10 , 0);
    // planeZMax.position.set(0, 10 , 50);

    this.syncMeshWithBody(meshZMin, planeZMin);
    this.syncMeshWithBody(meshZMax, planeZMax);

    this.cannonWorld.addBody(planeZMin);
    this.cannonWorld.addBody(planeZMax);

    this.scene.add(meshZMin);
    this.scene.add(meshZMax);

    // ground plane
    // let groundShape = new CANNON.Plane();
    // let groundBody = new CANNON.Body({ mass: 0, material: stoneMaterial });
    // groundBody.addShape(groundShape);
    // this.cannonWorld.addBody(groundBody);

    // this.cylinder = this.createMesh(new THREE.CylinderGeometry(20, 20, 5, 20, 20));
    // this.cylinder.rotation.set(Math.PI/2, 0, 0);
    //
    // let cylinderShape = new CANNON.Cylinder(20, 20, 5, 20);
    // let cylinderBody = new CANNON.Body(10);
    // cylinderBody.addShape(cylinderShape);
    //
    // //Cylinder position
    // this.cylinder.position.set(0, 0, 0);
    // cylinderBody.position.set(0, 0, 0);
    //
    // this.scene.add(this.cylinder);
    // this.cannonWorld.addBody(cylinderBody);

    // this.physicDebugRenderer = new CannonDebugRenderer(this.scene, this.cannonWorld);

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

  loadAssets() {
    this.loadingManager = new THREE.LoadingManager(() => {
      //loading finished
      console.log('loading finnished');
      this.drawTexture();
      this.animate();
    });

    developers.forEach((element: Developer) => {
      element.image = new THREE.ImageLoader(this.loadingManager).load(element.srcAvatar);
    });
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

  mousemove( evt ) {
    evt.preventDefault();

    let array = this.getMousePosition( this.renderer.domElement, evt.clientX, evt.clientY );

    this.onClickPosition.fromArray( array );

    let intersects : any[] = this.getIntersects( this.onClickPosition, this.scene.children );

    if ( intersects.length > 0 && intersects[ 0 ].uv ) {
      let uv = intersects[ 0 ].uv;
      intersects[ 0 ].object.material.map.transformUv( uv );

      this.mouseUVCoord.set(uv.x, uv.y);
      // console.log('mouseUVCoord changed to', this.mouseUVCoord);
    } else {
      this.mouseUVCoord.set(0, 0);
    }

    //let insideCircle = (((.5 - this.mouseUVCoord.x)*(.5 - this.mouseUVCoord.x) + (.5 - this.mouseUVCoord.y)*(.5 - this.mouseUVCoord.y)) <= (.5*.5));
    let mousePolarCoordinate = Math.atan2(this.mouseUVCoord.y - .5, this.mouseUVCoord.x - .5) ;

    if (mousePolarCoordinate < 0) {
      mousePolarCoordinate = mousePolarCoordinate + 2*Math.PI;
    }

    // console.log('mousePolarCoordinate', radianToDegree(mousePolarCoordinate));
    this.drawTexture();
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

  updatePhysicalWorld() {
    let now = new Date().getTime();
    let dt = (now - this.lastTick) / 1000;
    this.cannonWorld.step(1/600, dt, 3);
    this.ball.position.x = this.sphereBody.position.x;
    this.ball.position.y = this.sphereBody.position.y;
    this.ball.position.z = this.sphereBody.position.z;
    this.ball.quaternion.x = this.sphereBody.quaternion.x;
    this.ball.quaternion.y = this.sphereBody.quaternion.y;
    this.ball.quaternion.z = this.sphereBody.quaternion.z;
    this.ball.quaternion.w = this.sphereBody.quaternion.w;
    this.lastTick = now;
  }

  animate = () => {
    if (!this.renderer || !this.scene || !this.camera || !this.cannonWorld) return;

    this.controls.update();

    this.updatePhysicalWorld();

    requestAnimationFrame(this.animate);

    if (this.circle) {
      // this.circle.rotation.x += .003;
      // this.circle.rotation.y += .003;
    }

    // this.drawCrossAir();

    // this.physicDebugRenderer.update();
    this.renderer.render( this.scene, this.camera );
  }
}

//document.addEventListener("DOMContentLoaded", function () {
let app = new Application();
//});