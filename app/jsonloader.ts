export default class ThreeJS_JsonLoader {
  loader: THREE.ObjectLoader;
  mesh: THREE.Object3D;
  constructor(path,callback) {
    let loader = new THREE.JSONLoader();
    loader.load( path, (geom, materials) => {
      this.mesh = new THREE.Mesh( geom, new THREE.MultiMaterial( materials ) );
      if (callback) callback(this.mesh);
    });
    // let loader = new THREE.ObjectLoader();
    // loader.load(
    //   './dist/cube.json',
    //   // './dist/gyrados-pokemon-go.json',
    //   (obj) => {
    //     this.mesh = obj;
    //     if (callback) callback();
    //   });
    // var loader = new THREE.TextureLoader
    // loader.load(
    //   './dist/cube.json',
    //   (obj) => {
    //     this.mesh = obj;
    //     if (callback) callback();
    //   }
    // );
  }
}