import * as THREE from "three";
import * as tt from "three-tile";
import * as plugin from "three-tile/plugin";
//import Stats from "./three/examples/jsm/libs/stats.module.js";
import { BoxBufferGeometry } from "three";
//import { GUI } from "./three/examples/jsm/libs/dat.gui.module.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
// import { ColladaLoader } from "./three/examples/jsm/loaders/ColladaLoader.js";
// import { GLTFLoader } from "./three/examples/jsm/loaders/GLTFLoader.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import {
  Brush,
  Evaluator,
  ADDITION,
  SUBTRACTION,
  INTERSECTION,
} from "./BooleanUtils/index.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import $ from "jquery";
//import "./three/examples/main.css";
// import "./css/bootstrap.min.css";
//import 'bootstrap/dist/css/bootstrap.min.css'
//import 'bootstrap/dist/js/bootstrap.min.js'
import axios from "axios";

//import { from } from "core-js/core/array";
//import lay from "layui-layer"
//require("layui-layer");
// const axios = require('./node_modules/axios.js');
window.three = THREE;
console.log(THREE);
// (1) 基本数据
let container;
let scene, camera, cameraOrtho, renderer;
let controls;

let curModel; //当前添加的模型
let leanModel; //当前添加的倾斜摄影模型
let fillPlaneList = [];
let fillPlaneObjList = [];
let SCREEN_WIDTH = window.innerWidth;
let SCREEN_HEIGHT = window.innerHeight;
let aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
const frustumSize = 600;
let datajson;
const model = null;
const raycaster = new THREE.Raycaster();
const mouseVector = new THREE.Vector3();
let mouse = new THREE.Vector2(),
  INTERSECTED,
  SELECTED;
let selectedObject = null;
var modelWorldPs;
var worldPs;

//模型大小
let size;
let leanModelSize;

//倾斜摄影模型控制
//const leanModelLoader = new GLTFLoader();
let leanLoad = false;

//模型包围盒
var modelBox3 = new THREE.Box3();
var leanModelBox3 = new THREE.Box3();

var meshBox3 = new THREE.Box3();
var leanMeshBox3 = new THREE.Box3();

const params = {
  //开始剖面绘制
  isPlaneClip: false,
  //剖切辅助平面
  helpersVisible: false,
  //剖切距离
  planeConstantX: 0,
  planeConstantX1: 0,
  planeConstantY: 0,
  planeConstantY1: 0,
  planeConstantZ: 0,
  planeConstantZ1: 0,
  //爆炸距离
  distance: 0,
  //缩放大小
  scale: 1,
  //文本
  text: null,
  //搜索参数
  search: false,
  axisVisible: true, //坐标轴
  axisN: 7,
  isGlobalModel: false, //存在所有模型
};

//画线剖切基本数据
let lineGroup = null;
let lineList = [];
let pointList = [];
let tempLine = null;
let isCliping = false;
let clipLineList = [];
//模型url列表
let urlList = null;
let isPlaneClip = false;

//一体化剖切
let isGlobalClip = false; //一体化剖切
let isGlobalPlaneClip = false; //一体化平面剖切
let isGlobalLineCut = false; //一体化画线剖切
let intersectModel = null; //当前相交模型
let clipModel = null; //当前剖切模型
let globalLineGroup = null; //一体化剖切的线段组
let globalLineList = []; //一体化剖切的线段列表
let globalPointList = []; //一体化剖切的点列表
let globalTempLine = null; //一体化剖切的临时线段
let globalClipLineList = []; //一体化剖切的线段列表
let isGlobalCliping = false; //一体化剖切状态

// --------------布尔运算相关的参数------------------------------
let evaluator = new Evaluator();
let transformControls = null; // 变换控制器
let otherModel = null; // 基坑或隧道模型(参与布尔运算的模型)
const rate = 1; // 模型缩放比例
let isBooleanOperate = false; // 是否布尔运算
let needsUpdate = false; // 是否需要更新布尔运算
let firstReander = true; // 是否首次渲染
let meshArray = []; // 参与布尔运算的模型数组
let resultArray = []; // 布尔运算结果数组
let materialArray = []; // 参与布尔运算的模型材质数组

// 初始化默认材质
const blueMaterial = new THREE.MeshStandardMaterial({ roughness: 0.25 });
blueMaterial.color.set(0x1874cd).convertSRGBToLinear();
blueMaterial.flatShading = true;

let valueBoolOperationMode = false; //true为实时计算，false为延迟计算
let valueBoolOperationType = SUBTRACTION; //操作类型：ADDITION, SUBTRACTION, INTERSECTION
const paramsBool = {
  isBoolOperate: false, //是否布尔运算
  boolOperationType: "差集", //布尔运算类型
  boolOperationMode: "延迟", //布尔运算模式
  transformControlsModel: "平移", //变换控件模式
  showTransformControls: true, //显示变换控件

  // 显示变换控件X轴，Y轴，Z轴，全部坐标轴
  showTransformControlsX: true,
  showTransformControlsY: true,
  showTransformControlsZ: true,

  // 基坑挖掘相关参数：长，宽，高
  boxWidth: 1000,
  boxLength: 2000,
  boxHeight: 1000,

  // 隧道掘进相关参数：长，半径
  cylinderLength: 1000,
  cylinderRadius: 500,

  // 生成基坑模型
  createBox: function () {
    scene.remove(otherModel);
    otherModel = new Brush(
      new THREE.BoxGeometry(
        paramsBool.boxWidth * rate,
        paramsBool.boxHeight * rate,
        paramsBool.boxLength * rate
      ),
      blueMaterial
    );
    otherModel.updateMatrixWorld();
    scene.add(otherModel);
    //console.log("基坑模型", otherModel);
    //console.log('otherModel position:', otherModel.position); // 检查位置是否合理
    transformControls.detach();
    transformControls.attach(otherModel);
    needsUpdate = true;
  },

  // 生成隧道模型
  createCylinder: function () {
    scene.remove(otherModel);
    otherModel = new Brush(
      new THREE.CylinderGeometry(
        paramsBool.cylinderRadius * rate,
        paramsBool.cylinderRadius * rate,
        paramsBool.cylinderLength * rate,
        20
      ),
      blueMaterial
    );
    otherModel.updateMatrixWorld();
    scene.add(otherModel);
    transformControls.detach();
    transformControls.attach(otherModel);
    needsUpdate = true;
  },
};

//-----------加载3dtiles数据------
const tilesParams = {
  loadTiles: () => {
    console.log(2111);
    curModel.visible = false;
    // 创建地图
    const map = tt.TileMap.create({
      // 影像数据源
      imgSource: new plugin.ArcGisSource(),
      // 地形数据源
      demSource: new plugin.ArcGisDemSource(),
      lon0: 90,
    });
    // 地图旋转到xz平面
    map.rotateX(-Math.PI / 2);
    // // 初始化场景
    // const viewer = new plugin.GLViewer("#map");
    // // 地图添加到场景
    // viewer.scene.add(map);
    scene.add(map);
  }
}

// (2) 初始化
async function init() {
  initScene();
  initControls();
  $(document).keydown(function (event) {
    if (event.keyCode == 13) {
      // alert('你按下了Enter');
      clip();
    }
    if (event.keyCode == 49) {
      // alert('你按下了1');
      upFile();
    }
  });
  render();
}
init();

// (3) 初始化场景
function initScene() {
  // container = document.createElement('div');
  container = document.getElementById("three");
  container.style.width = "100%";
  container.style.height = "100%";

  container.style.position = "absolute";
  container.style.overflow = "hidden;";
  // document.body.appendChild(container);
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    100,
    10000000
  );

  const cameraDistance = 200;

  camera.position.set(
    -cameraDistance * 1,
    cameraDistance * 1,
    cameraDistance * 3
  );

  scene = new THREE.Scene();
  //scene.background = new THREE.Color(0x111111);

  const light00 = new THREE.HemisphereLight(0xffffff, 0x080808, 0.1);
  light00.position.set(-5000000, 1000000, 5000000);

  const light01 = new THREE.HemisphereLight(0xffffff, 0x080808, 0.1);
  light01.position.set(5000000, 1000000, -5000000);

  const light03 = new THREE.AmbientLight(0xffffff, 0.4);
  var PointLight = new THREE.PointLight(0xffffff, 0.5);
  //设置点光源位置，改变光源的位置
  PointLight.position.set(0, 2000, 0);

  var PointLight1 = new THREE.PointLight(0xffffff, 0.35);
  //设置点光源位置，改变光源的位置
  PointLight1.position.set(5300, 1000, 9110);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.castShadow = true;

  directionalLight.shadow.mapSize.height = 512 * 2;
  directionalLight.shadow.mapSize.width = 512 * 2;

  const sphereSize = 100;
  scene.add(directionalLight);
  scene.add(PointLight1);
  scene.add(PointLight);
  scene.add(light00);
  scene.add(light01);
  scene.add(light03);

  let manager = new THREE.LoadingManager();
  manager.onLoad = function () {
    console.log("Loading complete!");
  };
  manager.onProgress = function (url, itemsLoaded, itemsTotal) {};
  manager.onError = function (url) {
    console.log("There was an error loading --->" + url);
  };

  let lightGroup = new THREE.Group();
  let sizeLight = 5000000;
  let intensityLight = 0.1;
  let light1 = new THREE.PointLight(0xffffff, intensityLight, 0, 1);
  light1.position.set(sizeLight, sizeLight, sizeLight);
  lightGroup.add(light1);
  let light2 = new THREE.PointLight(0xffffff, intensityLight, 0, 1);
  light2.position.set(-sizeLight, sizeLight, -sizeLight);
  lightGroup.add(light2);
  let light3 = new THREE.PointLight(0xffffff, intensityLight, 0, 1);
  light3.position.set(0, -sizeLight, 0);
  lightGroup.add(light3);
  scene.add(lightGroup);
  renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.localClippingEnabled = true;
  renderer.autoClear = false;
  renderer.logarithmicDepthBuffer = true;
  container.appendChild(renderer.domElement);
  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener("mousemove", onDocumentMouseMove, false);
  loadObjOL1(manager, "./model/22");
}

// (4) 初始化控制器
function initControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 10;
  controls.maxDistance = 1000000;
}

//初始化用于布尔运算的变换控制器
function initTransformControls() {
  transformControls = new TransformControls(camera, renderer.domElement);
  //console.log(transformControls);
  
  transformControls.setSize(0.7);
  
  transformControls.addEventListener("dragging-changed", (e) => {
    //用户操作变换控件的时候 禁用 OrbitControls 的拖拽事件
    controls.enabled = !e.value;
  });
  transformControls.addEventListener("objectChange", () => {
    // 当变换控件的对象发生变化时，设置 needsUpdate 为 true
    console.log(needsUpdate);
    
    needsUpdate = true;
  });
  transformControls.attach(otherModel);
  //console.log("1111", transformControls.object);
  // console.log(TransformControls.prototype);
  // console.log(transformControls instanceof THREE.Object3D); // 应该是 true
  // console.log(transformControls.isObject3D); // 应该是 true
  scene.add(transformControls.getHelper());
}

// 初始化其他模型，默认情况下加载一个圆柱体
function initOtherModel() {
  otherModel = new Brush(
    // new THREE.BoxBufferGeometry(20, 20, 20),
    new THREE.BoxGeometry(1000, 1000, 1000),
    blueMaterial
  );

  otherModel.material.opacity = 0.3;
  otherModel.material.transparent = true;
  otherModel.rotation.x = Math.PI / 2;
  otherModel.updateMatrixWorld();
  scene.add(otherModel);
}

//初始化第一次布尔运算（点击布尔运算按钮后立即进行一次运算）
function initEvaluator() {
	//console.log(111);

	evaluator.useGroups = false; //在布尔运算的时候不考虑mesh的分组信息，通常用于简化运算

	// 由于模型不含有UV，则不需要包含UV
	evaluator.attributes = ["position", "normal"];

	for (let i = 0; i < meshArray.length; i++) {
		resultArray[i] = evaluator.evaluate(
			meshArray[i],
			otherModel,
			valueBoolOperationType
		);
		resultArray[i].material = materialArray[i];
		scene.add(resultArray[i]);
    //console.log(222);
    
	}
}


// (5) 渲染
function render() {
  renderer.clear();
  const bgColor = 0xffffff;
  renderer.setClearColor(bgColor, 1);
  if (isCliping) {
    console.log(isCliping);
    stencilTest1();
  } else {
    if (isPlaneClip == true || isGlobalPlaneClip == true) {
      //地质模型剖切
      if (fillPlaneObjList.length && fillPlaneList.length) {
        fillPlaneObjList.forEach((poList, i) => {
          const plane = planes[i];
          poList.forEach((po) => {
            plane.coplanarPoint(po.position);
            po.lookAt(
              po.position.x - plane.normal.x,
              po.position.y - plane.normal.y,
              po.position.z - plane.normal.z
            );
          });
        });
        // renderer.clear();
        //console.log("渲染地质模型");
        stencilTest(fillPlaneList);
      }
      // 倾斜摄影模型剖切
      if (leanLoad && leanFillPlaneObjList.length && leanFillPlaneList.length) {
        leanFillPlaneObjList.forEach((poList, i) => {
          const leanPlane = leanPlanes[i];
          poList.forEach((po) => {
            leanPlane.coplanarPoint(po.position);
            po.lookAt(
              po.position.x - leanPlane.normal.x,
              po.position.y - leanPlane.normal.y,
              po.position.z - leanPlane.normal.z
            );
          });
        });
        //console.log("渲染倾斜摄影模型");
        stencilTest(leanFillPlaneList);
      }
    }
  }
  if (needsUpdate && transformControls) {
    // console.log(needsUpdate);
    // console.log(transformControls);
  
    //将当前添加到场景中的模型隐藏不可见
    // if (curModel) {
    //   curModel.visible = false;
    // }
    // if (leanModel) {
    //   leanModel.visible = false;
    // }
    // 1.实时计算模式（true）：布尔运算会立即触发，无论控件是否在拖拽
    // 2.延迟计算模式（false）：布尔运算只会在控件停止拖拽后触发
    if (
      transformControls.dragging === valueBoolOperationMode ||
      valueBoolOperationMode
    ) {
      needsUpdate = false;
      for (let i = 0; i < meshArray.length; i++) {
        // 避免首次初始化场景时进行两次布尔运算
        if (firstReander === true) {
          firstReander = false;
          break;
        }
        if( resultArray[i]){
          scene.remove(resultArray[i]);
          //内存优化：每次布尔运算时销毁上次的结果
          resultArray[i].geometry.dispose();
          resultArray[i].material.dispose();
        }
        //console.log(meshArray);
        // evaluator.attributes = ["position", "normal"];
        resultArray[i] = evaluator.evaluate(
          meshArray[i],
          otherModel,
          valueBoolOperationType
        );
        resultArray[i].material = materialArray[i];
        //console.log(resultArray[i]);
        scene.add(resultArray[i]);
      }
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

// (6) 窗口大小变化事件处理
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

// 设置坐标轴
let group;
let initAxis = async function (size, n = 7) {
  return new Promise((resolve, reject) => {
    group = new THREE.Group();
    group.name = "axis";
    let mesh = new THREE.Object3D();
    let lineMaterial = new THREE.LineBasicMaterial({
      //color: 0xEEA2AD,
      color: 0xdddddd,
      //specular: 0xEEA2AD,
      //shininess: 30,
    });
    let points = [[], [], []];

    //console.log(objPos);
    //x
    points[0].push(new THREE.Vector3(0, 0, 0));
    points[0].push(new THREE.Vector3(-size.x, 0, 0));
    let xGeometry = new THREE.BufferGeometry().setFromPoints(points[0]); //setFromPoints是将上面分段的点设置为几何图形的顶点。
    let xLine = new THREE.Line(xGeometry, lineMaterial);
    mesh.add(xLine);
    //y
    points[1].push(new THREE.Vector3(0, 0, 0));
    points[1].push(new THREE.Vector3(0, size.y, 0));
    let yGeometry = new THREE.BufferGeometry().setFromPoints(points[1]);
    let yLine = new THREE.Line(yGeometry, lineMaterial);
    mesh.add(yLine);
    //z
    points[2].push(new THREE.Vector3(0, 0, 0));
    points[2].push(new THREE.Vector3(0, 0, size.z));
    let zGeometry = new THREE.BufferGeometry().setFromPoints(points[2]);
    let zLine = new THREE.Line(zGeometry, lineMaterial);
    mesh.add(zLine);

    group.add(mesh); //加入初始坐标轴

    //font
    const fontSize = size.max / 5 / n;
    const fontSize1 = size.max / 10 / n;
    const fontHeight = size.max / 1500;
    let textMaterial = new THREE.MeshPhongMaterial({
      // color: 0xeeeeee,
      color: 0xff0000,
      specular: 0xeea2ad,
      shininess: 30,
    });
    //  return scene.add(group);
    let loader = new FontLoader();
    loader.load("./fonts/SimHei_Regular.json", function (font) {
      for (let i = 0; i < n; i++) {
        let x = parseInt((size.x / n) * (i + 1));
        let y = parseInt((size.y / n) * (i + 1));
        let z = parseInt((size.z / n) * (i + 1));

        //x
        let xGeo = new TextGeometry(x.toString(), {
          font: font,
          size: fontSize1,
          height: fontHeight,
        });

        let xText = new THREE.Mesh(xGeo, textMaterial);
        xText.position.set(-x, 0, size.z);
        if (i != n - 1) {
          let xText = new THREE.Mesh(xGeo, textMaterial);
          xText.position.set(-x, 0, size.z);
          group.add(xText);
        }
        //grid 画线 xy xz平面的线
        let xLineXZ = xLine.clone();
        xLineXZ.position.set(0, 0, z);
        let xLineXY = xLine.clone();
        xLineXY.position.set(0, y, 0);

        //xLineXZ.position.set(0,0,size.z);
        //group.add(xText);
        group.add(xLineXZ);
        group.add(xLineXY);

        //y
        let yGeo = new TextGeometry(y.toString(), {
          font: font,
          size: fontSize1,
          height: fontHeight,
        });
        let yText = new THREE.Mesh(yGeo, textMaterial);
        yText.position.set(0, y, size.z);
        let yLine2 = yLine.clone();
        yLine2.position.set(-size.x, 0, 0);
        //grid
        let yLineXZ = yLine.clone();
        yLineXZ.position.set(-x, 0, 0);
        let yLineYZ = yLine.clone();
        yLineYZ.position.set(0, 0, z);
        group.add(yText);
        group.add(yLine2);
        group.add(yLineYZ);
        group.add(yLineXZ);
        //全部加载成功进度条消失++++++++++++++++++++++++++++++++++++++++++++++++
        yText.onAfterRender = () => {
          let progressDom = document.querySelector("#progress");
          layui.element.progress("demo", 100 + "%");
          progressDom.style.display = "none";
        };
        group.add(yLine);

        //z
        let zGeo = new TextGeometry(z.toString(), {
          font: font,
          size: fontSize1,
          height: fontHeight,
        });
        if (i == 0 || i == n - 1) {
          let zText = new THREE.Mesh(zGeo, textMaterial);
          //zText.position.set(-size.x * 1.06 + 10 * n, 0, z);
          zText.position.set(-size.x * 1.02, 0, z);
          group.add(zText);
        }
        // let zText = new THREE.Mesh(zGeo, textMaterial);
        // zText.position.set(-size.x * 1.1, 0, z);
        //grid
        let zLineYZ = zLine.clone();
        zLineYZ.position.set(0, y, 0);
        let zLineXY = zLine.clone();
        zLineXY.position.set(-x, 0, 0);
        // group.add(zText);
        group.add(zLineYZ);
        group.add(zLineXY);
      }

      let group1 = new THREE.Group();
      // let axesHelper = new THREE.AxesHelper( size.max );
      // group1.add(axesHelper);

      //Z轴
      let ZZhou = new TextGeometry("Y轴", {
        font: font,
        size: fontSize,
        height: fontHeight,
      });
      let ZZhouText = new THREE.Mesh(ZZhou, textMaterial);
      ZZhouText.position.set(0, 0, size.x);
      group1.add(ZZhouText);

      //X轴
      let XZhou = new TextGeometry("X轴", {
        font: font,
        size: fontSize,
        height: fontHeight,
      });
      let XZhouText = new THREE.Mesh(XZhou, textMaterial);
      XZhouText.position.set(size.z, 0, 0);
      group1.add(XZhouText);

      //Y轴
      let YZhou = new TextGeometry("Z轴", {
        font: font,
        size: fontSize,
        height: fontHeight,
      });
      let YZhouText = new THREE.Mesh(YZhou, textMaterial);
      YZhouText.position.set(0, size.y, 0);
      group1.add(YZhouText);

      group1.rotateY(-Math.PI / 2);
      group.add(group1);

      group.position.set(size.x / 2, -size.y / 2, -size.z / 2);
      resolve(group);
      scene.add(group);
    });
  });
};

// 删除重复坐标轴
async function updateAxis() {
  for (let item of scene.children) {
    if (item.name == "axis") {
      scene.remove(item);
    }
  }
}

// ------------------------模型相关--------------------------

// (1) 基本数据
const planes = [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
  new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
];

//模型一加载器
function loadObjOL1(manager, url) {
  const mtlLoader = new MTLLoader();

  const mtlUrl = url + ".mtl";
  //console.log(mtlUrl);

  let loader = new THREE.TextureLoader();
  let material;
  mtlLoader.load(
    mtlUrl,
    (materials) => {
      materials.preload();
      let aa = JSON.stringify(materials);
      const objLoader = new OBJLoader(manager);
      //console.log('loadObj:materials.', materials);
      var x = new Uint8Array(materials);
      objLoader.setMaterials(materials); //设置obj使用的材质贴图
      console.time("a");
      //const modelUrl = './model/'+'test0622.obj';
      const modelUrl = url + ".obj";
      //console.log(modelUrl);

      objLoader.load(
        modelUrl,
        async (obj) => {
          curModel = obj;
          let mesh;
          // console.log("当前场景中存在的模型", obj);
          curModel.traverse((child) => {
            if (child.isMesh) {
              materialArray.push(child.material);
              mesh = new Brush(child.geometry, child.material);
              mesh.updateMatrixWorld();
              meshArray.push(mesh);
            }
          });
          //console.log("当前场景中存在的模型", meshArray);

          size = await getModelSize(curModel);

          setModelGUI(size);
          const box = new THREE.Box3().setFromObject(curModel);
          const center = new THREE.Vector3();
          box.getCenter(center);

          curModel.position.sub(center);
          // curModel.translateY(size.y / 2);
          // curModel.rotateX(90);
          camera.position.set(-size.max / 3, size.max / 2, size.max);
          camera.lookAt(new THREE.Vector3(0, 0, 0));
          //scene.add(curModel);
          curModel.userData.oldPs = center;
          initAxis(size);
          //获取模型的包围盒
          modelBox3.expandByObject(obj);

          //计算模型的中心点坐标，这个为爆炸中心
          modelWorldPs = new THREE.Vector3()
            .addVectors(modelBox3.max, modelBox3.min)
            .multiplyScalar(0.5);

          obj.traverse(function (value) {
            //console.log(value)

            if (value.isMesh) {
              meshBox3.setFromObject(value);

              //计算两个父包围盒和子包围盒的距离
              let v_distance = new THREE.Vector3();
              let v_size = new THREE.Vector3();
              meshBox3.getCenter(v_distance);
              meshBox3.getSize(v_size);

              let distance = center.distanceTo(v_distance);
              value.userData.dis = v_size;
              //获取每个mesh的中心点，爆炸方向为爆炸中心点指向mesh中心点
              worldPs = new THREE.Vector3()
                .addVectors(meshBox3.max, meshBox3.min)
                .multiplyScalar(0.5);
              if (isNaN(worldPs.x)) return;
              //计算爆炸方向
              value.worldDir = new THREE.Vector3()
                .subVectors(worldPs, modelWorldPs)
                .normalize();
              //保存初始坐标
              value.userData.oldPs = value.getWorldPosition(
                new THREE.Vector3()
              );
            }
          });

          setClipping(curModel, planes);
          fillPlaneList = [];
          fillPlaneObjList = [];
          planes.forEach((plane) => {
            const { list, poList } = initFillPlaneList(curModel, plane);
            fillPlaneList.push(list);
            fillPlaneObjList.push(poList);
          });

          scene.add(curModel);
          console.timeEnd("a");
        },

        // 加载过程回调函数onProgress：加载过程不停地重复执行该函数中代码
        function (xhr) {
          // 控制台查看加载进度xhr
          // 通过加载进度xhr可以控制前端进度条进度   Math.floor:小数加载进度取整
          let element = layui.element;
          let progress = Math.floor((xhr.loaded / xhr.total) * 95);
          element.progress("demo", progress + "%");

          if (progress == 100) {
            let progressDom = document.querySelector("#progress");
          }
        },
        // 加载错误回调函数onError
        function (err) {
          layer.open({
            title: "异常信息",
            content: "加载发生错误！",
          });
        }
      );
    },
    function (xhr) {},
    function (err) {
      layer.open({
        title: "异常信息",
        content: "加载发生错误！",
      });
    }
  );
}

// (3) 获取模型大小
async function getModelSize(model) {
  return new Promise((resolve, reject) => {
    const box = new THREE.Box3().setFromObject(model); //用来计算一系列顶点集合的最小包围盒
    //	console.log("box", box);
    const sizeX = box.max.x - box.min.x;
    const sizeY = box.max.y - box.min.y;
    const sizeZ = box.max.z - box.min.z;
    const sizeMax = Math.max(sizeX, sizeY, sizeZ);
    const sizeMin = Math.min(sizeX, sizeY, sizeZ);
    let size = {
      x: sizeX,
      y: sizeY,
      z: sizeZ,
      max: sizeMax,
      min: sizeMin,
    };
    resolve(size);
  });
}

// (6) 设置模型的 GUI
function setModelGUI(size) {
  // (6-1) 添加剖切平面辅助
  const helpers = new THREE.Group();
  const helpersVisible = false;
  planes[0].constant = size.x;
  planes[1].constant = size.y;
  planes[2].constant = size.z;

  helpers.add(new THREE.PlaneHelper(planes[0], size.max / 4, 0xff0000));
  helpers.add(new THREE.PlaneHelper(planes[1], size.max / 4, 0x00ff00));
  helpers.add(new THREE.PlaneHelper(planes[2], size.max / 4, 0x0000ff));

  helpers.visible = helpersVisible;
  scene.add(helpers);

  // (6-2) 添加 GUI
  let section = null;
  const gui = new GUI();
  gui
    .add(params, "isPlaneClip")
    .name("实时剖切")
    .onChange((value) => {
      isPlaneClip = !isPlaneClip;
      if (isPlaneClip == true) {
        renderer.localClippingEnabled = true;
        section.show();
      } else {
        renderer.localClippingEnabled = false;
        section.hide();
      }
    });

  section = gui.addFolder("剖面分析");
  section.open();
  section
    .add(params, "helpersVisible")
    .name("剖切平面辅助")
    .onChange((value) => {
      helpers.visible = value;
    });
  section
    .add(params, "planeConstantX", -size.x / 2, size.x / 2)
    .step(1)
    .name("y轴")
    .onChange((value) => {
      // isPlaneClip = true;
      planes[0].constant = value;
    });
  section
    .add(params, "planeConstantY", -size.y, size.y)
    .step(1)
    .name("z轴")
    .onChange((value) => {
      //isPlaneClip = true;
      planes[1].constant = value;
    });
  section
    .add(params, "planeConstantZ", -size.z / 2, size.z / 2)
    .step(1)
    .name("x轴")
    .onChange((value) => {
      //isPlaneClip = true;
      planes[2].constant = value;
    });
  section.hide();

  let fdTrans = gui.addFolder("垂向分析");
  fdTrans
    .add(params, "distance", 0, size.max / 50)
    .step(1)
    .name("爆炸距离")
    .onFinishChange(async function (v) {
      updateAxis();

      let i = curModel.children.length;
      let originPositions = [];
      let newSize;
      const box = new THREE.Box3().setFromObject(curModel);
      const center = new THREE.Vector3();
      let as = box.getCenter(center);
      var v3 = new THREE.Vector3();
      // 获得包围盒长宽高尺寸，结果保存在参数三维向量对象v3中
      box.getSize(v3);
      //   console.log(v3)
      let count = 0;
      for (let item of curModel.children) {
        let originPosition = new THREE.Vector3(0, 0, 0);
        if (i < 0) break;
        //console.log(item.userData.dis)
        count += item.userData.dis.y * v * 0.1;
        item.position.copy(originPosition).add(new THREE.Vector3(0, count, 0));
        i++;
      }
      if (v != 0) {
        renderer.localClippingEnabled = false;
        const size = await getModelSize(curModel);
        // initAxis(size);
        const box = new THREE.Box3().setFromObject(curModel);
        const center = new THREE.Vector3();
        let a = box.getCenter(center);
        let b = curModel.position.sub(center); //将模型包围盒的中心位于坐标系的中心，偏移量是现阶段的包围盒中心
      } else {
        renderer.localClippingEnabled = true;
        const box = new THREE.Box3().setFromObject(curModel);
        const center = new THREE.Vector3();
        let a = box.getCenter(center);
        let b = curModel.position.sub(center); //将模型包围盒的中心位于坐标系的中心，偏移量是现阶段的包围盒中心
        const box1 = new THREE.Box3().setFromObject(curModel);
        const size1 = await getModelSize(curModel);
        initAxis(size1);
      }
    });

  let infoSearch = gui.addFolder("属性查询");
  // infoSearch.open();
  let search = infoSearch
    .add(params, "search")
    .name("开关")
    .onChange(function (value) {
      params.search = value;
      //render();
    });

  let axixN = gui.addFolder("轴向距离");
  axixN
    .add(params, "axisN", 7, 20)
    .step(1)
    .name("轴向距离")
    .onFinishChange(async function (v) {
      updateAxis();

      let newSize = await getModelSize(curModel);

      initAxis(newSize, v);
      //console.log(scene)
    });

  //画线剖切
  const params1 = {
    showAxesHelper: true,
    polyline: {
      draw: () => {
        ///	console.log('画线')
        open();
      },
      clip: () => {
        //console.log('剖切')
        clip();
      },
      clear: () => {
        //console.log('清除')
        close();
      },
    },
  };
  const folder = gui.addFolder("画线剖切");
  folder
    .add(params1.polyline, "draw")
    .name("画线")
    .onChange(function (value) {
      renderer.localClippingEnabled = true;
    });
  // folder.add(params1.polyline, 'clip').name('剖切');
  folder.add(params1.polyline, "clear").name("清除");

  //倾斜摄影实现
  // 1. 定义配置对象
  const guiParams = {
    loadModel: () => {
      // TODO: 实际加载模型代码
      const leanModelUrl = "./model/22";
      leanLoadModel(leanModelUrl);
    },
    removeModel: () => {
      // 这里写移除倾斜摄影模型的逻辑
      // TODO: 实际移除模型代码
      removeLeanModel();
    },
  };
  const leanPhFolder = gui.addFolder("加载倾斜摄影模型");
  leanPhFolder.add(guiParams, "loadModel").name("加载");
  leanPhFolder.add(guiParams, "removeModel").name("移除");
  // ----------------------一体化剖切相关-------------------------
  let globalCutSec = null;
  let globalLineCutSec = null;

  const glbalCutParams = {
    isGlobalClip: false,
    isGlobalPlaneClip: false,
    clipPlanesVisible: false,
    GlobalplaneX: 0,
    GlobalplaneY: 0,
    GlobalplaneZ: 0,
  };
  //一体化画线剖切操作
  const globalLineCutParams = {
    showAxesHelper: true,
    globalLineCut: {
      globalDraw: () => {
        ///	console.log('画线')
        openGlobalLineCut();
      },
      globalClip: () => {
        //console.log('剖切')
        clipGlobalLineCut();
      },
      globalClear: () => {
        //console.log('清除')
        closeGlobalLineCut();
      },
    },
  };

  gui
    .add(glbalCutParams, "isGlobalClip")
    .name("一体化剖切")
    .onChange((value) => {
      isGlobalClip = !isGlobalClip;
      isPlaneClip = !isPlaneClip;
      if (isGlobalClip == true) {
        renderer.localClippingEnabled = true;
        globalCutSec.show(); //显示一体化平面剖切
        globalLineCutSec.show(); //显示一体化画线剖切
      } else {
        renderer.localClippingEnabled = false;
        globalCutSec.hide();
        globalLineCutSec.hide();
      }
    });
  //一体化平面剖切
  globalCutSec = gui.addFolder("一体化平面剖切");
  globalCutSec.hide();
  globalCutSec
    .add(glbalCutParams, "clipPlanesVisible")
    .name("剖切平面辅助")
    .onChange((value) => {
      helpers.visible = value;
      leanHelpers.visible = value;
    });
  globalCutSec
    .add(glbalCutParams, "GlobalplaneZ", -size.z / 2, size.z / 2)
    .step(1)
    .name("x轴")
    .onChange((value) => {
      //isPlaneClip = true;
      planes[2].constant = value;
      leanPlanes[2].constant = value;
    });
  globalCutSec
    .add(glbalCutParams, "GlobalplaneX", -size.x / 2, size.x / 2)
    .step(1)
    .name("y轴")
    .onChange((value) => {
      // isPlaneClip = true;
      planes[0].constant = value;
      leanPlanes[0].constant = value;
    });
  // globalCutSec
  //   .add(glbalCutParams, "GlobalplaneY", -size.y, size.y)
  //   .step(1)
  //   .name("z轴")
  //   .onChange((value) => {
  //     //isPlaneClip = true;
  //     planes[1].constant = value;
  //     leanPlanes[1].constant = value;
  //   });
  globalCutSec.hide();
  //一体化画线剖切
  globalLineCutSec = gui.addFolder("一体化画线剖切");
  globalLineCutSec.hide();
  globalLineCutSec
    .add(globalLineCutParams.globalLineCut, "globalDraw")
    .name("一体画线")
    .onChange(function (value) {
      renderer.localClippingEnabled = true;
    });
  globalLineCutSec
    .add(globalLineCutParams.globalLineCut, "globalClip")
    .name("一体化剖切")
    .onChange(function (value) {
      renderer.localClippingEnabled = true;
    });
  globalLineCutSec
    .add(globalLineCutParams.globalLineCut, "globalClear")
    .name("一体化清除")
    .onChange(function (value) {});

  // ----------------------模型布尔运算相关-------------------------
  let boolOperationSec = null; // 布尔运算设置的GUI文件夹
  let transformControlsSec = null; // 变换控制器设置的GUI文件夹\
  let boxAnalysisSec = null; //基坑挖掘
  let cylinderAnalysisSec = null; //隧道掘进

  gui
    .add(paramsBool, "isBoolOperate")
    .name("布尔运算")
    .onChange((value) => {
      isBooleanOperate = !isBooleanOperate;  //当前是否在进行布尔运算操作
      if (isBooleanOperate == true) {
        //将当前添加到场景中的模型隐藏不可见
        if (curModel) {
          curModel.visible = false;
        }
        if (leanModel) {
          leanModel.visible = false;
        }
        initOtherModel(); //初始化其他模型
        initTransformControls(); //初始化变换控制器
        //console.log(transformControls.object);
        // console.log(needsUpdate);
        // console.log(curModel.visible);
          
        initEvaluator(); //初始化第一次布尔运算
        //console.log(resultArray);
        //console.log(needsUpdate);  //第一次点击布尔运算的开关时 false
        
        boolOperationSec.show(); //显示一体化布尔运算
        transformControlsSec.show(); //显示变换控制器
        boxAnalysisSec.show(); //显示基坑挖掘
        cylinderAnalysisSec.show(); //显示隧道掘进
      } else {
        if (otherModel) {
          transformControls.detach();
          scene.remove(otherModel);
        }
        if (transformControls) {
          scene.remove(transformControls.getHelper());
        }
        //将布尔运算生成的模型移除
        scene.remove(...resultArray);
        resultArray = [];
        // meshArray = [];
        // materialArray = [];
        if (curModel) {
          curModel.visible = true;
        }
        if (leanModel) {
          leanModel.visible = true;
        }

        boolOperationSec.hide();
        transformControlsSec.hide(); //隐藏变换控制器
        boxAnalysisSec.hide(); //隐藏基坑挖掘
        cylinderAnalysisSec.hide(); //隐藏隧道掘进
      }
    });
  boolOperationSec = gui.addFolder("操作设置");
  boolOperationSec.hide();
  boolOperationSec
    .add(paramsBool, "boolOperationType", ["差集", "交集", "并集"])
    .name("运算类型")
    .onChange((v) => {
      if (v === "差集") {
        valueBoolOperationType = SUBTRACTION;
      } else if (v === "交集") {
        valueBoolOperationType = INTERSECTION;
      }
      // 更换布尔运算类型后，需要在渲染循环中重新计算
      needsUpdate = true;
    });
  boolOperationSec
    .add(paramsBool, "boolOperationMode", ["实时", "延迟"])
    .name("布尔运算模式")
    .onChange((v) => {
      if (v === "实时") {
        valueBoolOperationMode = true;
      } else if (v === "延迟") {
        valueBoolOperationMode = false;
      }
    });

  transformControlsSec = gui.addFolder("变换控制器");
  transformControlsSec.hide();
  transformControlsSec
    .add(paramsBool, "transformControlsModel", ["平移", "旋转", "缩放"])
    .name("操作模式")
    .onChange((v) => {
      if (v === "平移") {
        transformControls.setMode("translate");
      } else if (v === "旋转") {
        transformControls.setMode("rotate");
      } else if (v === "缩放") {
        transformControls.setMode("scale");
      }
    });
  transformControlsSec
    .add(paramsBool, "showTransformControls")
    .name("显示变换控制器")
    .onChange((value) => {
      transformControls.visible = value;
      transformControls.enabled = value;
    });
  transformControlsSec
    .add(paramsBool, "showTransformControlsX")
    .name("显示X轴变换")
    .onChange((v) => {
      transformControls.showX = v;
    });
  transformControlsSec
    .add(paramsBool, "showTransformControlsY")
    .name("显示Y轴变换")
    .onChange((v) => {
      transformControls.showY = v;
    });
  transformControlsSec
    .add(paramsBool, "showTransformControlsZ")
    .name("显示Z轴变换")
    .onChange((v) => {
      transformControls.showZ = v;
    });

  boxAnalysisSec = gui.addFolder("基坑挖掘");
  boxAnalysisSec.hide();
  boxAnalysisSec.add(paramsBool, "boxWidth").name("基坑宽度 (m)");
  boxAnalysisSec.add(paramsBool, "boxLength").name("基坑长度 (m)");
  boxAnalysisSec.add(paramsBool, "boxHeight").name("基坑高度 (m)");
  boxAnalysisSec.add(paramsBool, "createBox").name("生成基坑模型");

  cylinderAnalysisSec = gui.addFolder("隧道掘进");
  cylinderAnalysisSec.hide();
  cylinderAnalysisSec.add(paramsBool, "cylinderRadius").name("隧道半径 (m)");
  cylinderAnalysisSec.add(paramsBool, "cylinderLength").name("隧道长度 (m)");
  cylinderAnalysisSec.add(paramsBool, "createCylinder").name("生成隧道模型");

  //------------------加载3dtiles-----------------------
  const tilesFolder = gui.addFolder("加载3dTiles数据");
  tilesFolder.add(tilesParams, "loadTiles").name("加载");

}

let colorList = []; //材质颜色数组
//     捕获鼠标移动

function onDocumentMouseMove(event) {
  if (params.search === true) {
    intersectModel = curModel; //设置当前模型为交互模型（开启属性查询的按钮）
    event.preventDefault();

    const intersects = getIntersects(event.layerX, event.layerY);

    let path = "./model/";
    //let name = curModel.materialLibraries[0].split(".")[0];

    if (intersects.length > 0) {
      if (SELECTED != intersects[0].object) {
        //当目标发生变化时
        //鼠标的变换

        if (SELECTED && !(SELECTED.material instanceof Array)) {
          SELECTED.material.color.setHex(SELECTED.currentHex);
        }
        if (SELECTED && SELECTED.material instanceof Array) {
          //console.log(colorList)
          SELECTED.material.map((item, index, array) => {
            //console.log("旧",item.color,index)
            item.color.setHex(colorList[index]);
            // console.log("新",item.color,index)
          });
        }

        SELECTED = intersects[0].object; //赋值新的目标
        if (SELECTED && SELECTED.material instanceof Array) {
          // console.log(SELECTED)
          colorList = [];
          //先统计原色后改变颜色！！
          for (let i = 0; i < SELECTED.material.length; i++) {
            //   SELECTED.material[i].colors = SELECTED.material[i].color
            colorList[i] = JSON.stringify(SELECTED.material[i].color); //记录当前选择的颜色
          }
          //console.log(colorList)
          for (let i = 0; i < SELECTED.material.length; i++) {
            SELECTED.material[i].color.set("#FF69B4");
          }
        }
        if (SELECTED && !(SELECTED.material instanceof Array)) {
          SELECTED.currentHex = SELECTED.material.color.getHex(); //记录当前选择的颜色
          SELECTED.material.color.set("#FF69B4");
        }

        layer.closeAll();
        let id = SELECTED.name;
        layerContent(id);
        //console.log(datajson);
        let data;

        function layerContent(data) {
          let oriId = SELECTED.name;
          //console.log("datajson11111111111111111111111111111111");
          //let layerId = res.layername_id;
          let xPos = event.layerX + "px";
          let yPos = event.layerY + "px";
          //console.log(layer);
          layer.open({
            type: 1,
            title: false,
            closeBtn: 0, //不显示关闭按钮
            shade: [0],
            // area: ['200px', '100px'],
            offset: [yPos, xPos], //右下角弹出
            time: 2000, //2秒后自动关闭
            anim: 0,
            skin: "myskin",
            content: data, //iframe的url，no代表不显示滚动条
          });
        }
        //console.log(layerId);
      }
    } else {
      if (SELECTED && SELECTED.material instanceof Array) {
        //console.log(colorList)
        SELECTED.material.map((item, index, array) => {
          item.color.setHex(colorList[index]);
        });
        //colorList = [];
      }
      if (SELECTED && !(SELECTED.material instanceof Array))
        SELECTED.material.color.setHex(SELECTED.currentHex); //移除到空白区域，恢复选择前的默认颜色
      SELECTED = null;
    }
  }
}

//     处理相交
function getIntersects(x, y) {
  x = (x / window.innerWidth) * 2 - 1;
  y = -(y / window.innerHeight) * 2 + 1;
  mouseVector.set(x, y, 0.5);
  raycaster.setFromCamera(mouseVector, camera);
  return raycaster.intersectObject(intersectModel, true);
}

// ----------------------模型填充面相关-------------------------

// (1) 基本数组

// (2) 初始化填充面
function initFillPlaneList(model, plane) {
  const list = [];
  const poList = [];
  //	console.log("model.children", model.children)
  model.children.forEach((item, i) => {
    if (!item.material.hasOwnProperty(0)) {
      //hasOwnProperty方法会返回一个布尔值，指示对象自身属性中是否具有指定的属性（也就是，是否有指定的键）。
      const fillPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1000000, 1000000),
        new THREE.MeshBasicMaterial({
          color: item.material.color,
          side: THREE.DoubleSide,
          //对模型设定对应的剖切平面
          clippingPlanes: planes.filter((p) => p !== plane), //此处用的是剖切平面数组planes
        })
      );
      item.material.transparent = false; //材质设置为不透明
      const fillPlaneScene = new THREE.Scene();
      fillPlaneScene.add(fillPlane);
      poList.push(fillPlane);
      //剖面背部填充模型
      const backModel = model.clone();
      const backMesh = backModel.children[i];
      backMesh.material = new THREE.MeshBasicMaterial({
        //暂停颜色和深度写入
        colorWrite: false,
        depthWrite: false,
        //采用背面材质
        side: THREE.BackSide,
        //导入上一步的剪切平面，确定位置
        clippingPlanes: [plane],
      });
      backModel.children = [backMesh];
      const backScene = new THREE.Scene();
      backScene.add(backModel);
      //剖面正面填充材质
      const frontModel = model.clone();
      const frontMesh = frontModel.children[i];
      frontMesh.material = new THREE.MeshBasicMaterial({
        //暂停颜色和深度写入
        colorWrite: false,
        depthWrite: false,
        //采用正面材质
        side: THREE.FrontSide,
        //导入上一步的剪切平面，确定位置
        clippingPlanes: [plane],
      });
      frontModel.children = [frontMesh];
      const frontScene = new THREE.Scene();
      frontScene.add(frontModel);

      list.push({
        fillPlaneScene,
        backScene,
        frontScene,
      });
    } else {
      for (let j = 0; j < item.material.length; j++) {
        if (item.material.hasOwnProperty(j)) {
          const fillPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(1000000, 1000000),
            new THREE.MeshBasicMaterial({
              color: item.material[j].color,
              side: THREE.DoubleSide,
              //对模型设定对应的剖切平面
              clippingPlanes: planes.filter((p) => p !== plane),
            })
          );
          const fillPlaneScene = new THREE.Scene();
          fillPlaneScene.add(fillPlane);
          poList.push(fillPlane);
          //剖面背部填充模型
          const backModel = model.clone();
          const backMesh = backModel.children[i];
          backMesh.material = new THREE.MeshBasicMaterial({
            //暂停颜色和深度写入
            colorWrite: false,
            depthWrite: false,
            //采用背面材质
            side: THREE.BackSide,
            //导入上一步的剪切平面，确定位置
            clippingPlanes: [plane],
          });
          backModel.children = [backMesh];
          const backScene = new THREE.Scene();
          backScene.add(backModel);
          //剖面正面填充材质
          const frontModel = model.clone();
          const frontMesh = frontModel.children[i];
          frontMesh.material = new THREE.MeshBasicMaterial({
            //暂停颜色和深度写入
            colorWrite: false,
            depthWrite: false,
            //采用正面材质
            side: THREE.FrontSide,
            //导入上一步的剪切平面，确定位置
            clippingPlanes: [plane],
          });
          frontModel.children = [frontMesh];
          const frontScene = new THREE.Scene();
          frontScene.add(frontModel);

          list.push({
            fillPlaneScene,
            backScene,
            frontScene,
          });
        }
      }
    }
  });
  //render();
  return {
    list,
    poList,
  };
}

/**(6) 模板测试，确定覆盖平面要显示的部分 */
function stencilTest(fillPlaneList) {
  const gl = renderer.getContext();
  //console.log('模型1场景渲染');
  //console.log(fillPlaneList);

  fillPlaneList.forEach((list) => {
    renderer.clearStencil(); // 清除模板缓存
    gl.enable(gl.STENCIL_TEST);
    list.forEach((item, index) => {
      // 初始化模板缓冲值，每层不一样
      gl.stencilFunc(gl.ALWAYS, index, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
      renderer.render(item.backScene, camera);

      // 背面加1
      gl.stencilFunc(gl.ALWAYS, 1, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      renderer.render(item.backScene, camera);

      // 正面减1
      gl.stencilFunc(gl.ALWAYS, 1, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);
      renderer.render(item.frontScene, camera);

      // 缓冲区为指定值，才显示覆盖盒
      gl.stencilFunc(gl.EQUAL, index + 1, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      renderer.render(item.fillPlaneScene, camera);
    });
    gl.disable(gl.STENCIL_TEST);
  });
}

function setClipping(object, planes) {
  if (!object || !planes || !Array.isArray(planes)) {
    console.warn("Invalid object or planes in setClipping");
    return;
  }

  for (let obj of object.children) {
    if (!obj.material) continue;

    if (!obj.material.hasOwnProperty(0)) {
      setClippingPlanes(obj.material);
    } else {
      for (let i = 0; i < obj.material.length; i++) {
        if (obj.material.hasOwnProperty(i)) {
          setClippingPlanes(obj.material[i]);
          // console.log(obj.material[i]);
        }
      }
    }

    function setClippingPlanes(material) {
      material.clippingPlanes = planes;
    }
    // searchColor(obj);
  }

  // console.log(controls);
}
/**(4) 开启画线剖切 */
function open() {
  clipModel = curModel; //设置当前模型为画线剖切的模型
  if (!lineGroup) {
    lineGroup = new THREE.Group();
    scene.add(lineGroup);
  }
  curModel.visible = true;
  eventHandler.contextmenu(); //初始化线段容器
  eventHandler.start();
}

/**(5) 关闭画线剖切 */
function close() {
  isCliping = false;
  clipLineList = [];
  scene.remove(lineGroup);
  lineGroup = null;
  lineList = []; //实际需要线
  pointList = [];
  curModel.visible = true;
  clipModel = null; //清除当前画线剖切的模型
  eventHandler.end();
}

/**(6) 获取点 */
function getPoint(event, model) {
  let point = null;
  const mouse = new THREE.Vector2();
  mouse.setX((event.clientX / window.innerWidth) * 2 - 1);
  mouse.setY(-(event.clientY / window.innerHeight) * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(mouse, camera);
  const meshs = model.children;
  const intersects = ray.intersectObjects(meshs);
  if (intersects.length > 0) {
    point = intersects[0].point;
  }
  return point;
}

/**(7) 绘制线段 */
function drawLine(from, to, type = "") {
  const segmentsGeometry = new LineGeometry();
  segmentsGeometry.setPositions([from.x, from.y, from.z, to.x, to.y, to.z]);
  let material = new LineMaterial({
    linewidth: 3,
    color: "White",
    depthTest: false,
  });
  material.resolution.set(window.innerWidth, window.innerHeight); // resolution of the viewport
  //  material2.resolution.set(window.innerWidth+100,window.innerHeight+100);//这句如果不加宽度仍然无效
  const line = new Line2(segmentsGeometry, material);
  //line.computeLineDistances();
  // line.scale.set( 1, 1, 1 );
  if (leanLoad) {
    globalLineGroup.add(line);
    if (type !== "globalTempLine") {
      lineList.push({
        from,
        to,
      });
    }
  } else {
    lineGroup.add(line);
    if (type !== "tempLine") {
      lineList.push({
        from,
        to,
      });
    }
  }
  return line;
}

/**(8) 进行剖切 */
function clip() {
  eventHandler.contextmenu();
  eventHandler.end();
  if (leanLoad) {
    leanModel.visible = true; //在倾斜摄影模型上画线，在地质模型上剖切
  }
  curModel.visible = false;
  const box3 = new THREE.Box3().setFromObject(curModel);
  const size = box3.getSize(new THREE.Vector3());
  const planeWidth = Math.max(size.x, size.y, size.z) * 3; //剖切平面宽度
  const list = lineList.map((line) => {
    //每条线段都初始化剖切
    return initClipLine(line.from, line.to, planeWidth);
  });
  clipLineList = list;
  isCliping = true; //设置剖切模式标志为 true，后续渲染循环会根据该标志执行剖切渲染逻辑
}

/**(3) 事件处理器，避免鼠标拖动时触发点击 */
const eventHandler = {
  isClick: true,
  mousedownPoint: [0, 0],
  mousemovePoint: [0, 0],
  start: () => {
    renderer.domElement.style.cursor = "crosshair"; //光标呈现为十字线。domElement 一个用来绘制输出的 Canvas 对象。
    renderer.domElement.addEventListener("pointerdown", eventHandler.mousedown); //pointerdown : 激活按钮状态 被赋值为非0值: 对于触摸或触控笔是指和屏幕产生接触的时候; 对于鼠标是指一个按键被按下的时候
    renderer.domElement.addEventListener("pointermove", eventHandler.mousemove); //pointermove : pointer 改变了所在坐标, 或者 按压, 倾斜时，或者触发了没有在规范中定义的其他类型事件
    renderer.domElement.addEventListener("click", eventHandler.click);
    renderer.domElement.addEventListener(
      "contextmenu",
      eventHandler.contextmenu
    ); //contextmenu 事件会在用户尝试打开上下文菜单时被触发。该事件通常在鼠标点击右键或者按下键盘上的菜单键时被触发
  },
  end: () => {
    renderer.domElement.style.cursor = "";
    renderer.domElement.removeEventListener(
      "pointerdown",
      eventHandler.mousedown
    );
    renderer.domElement.removeEventListener(
      "pointermove",
      eventHandler.mousemove
    );
    renderer.domElement.removeEventListener("click", eventHandler.click);
    renderer.domElement.removeEventListener(
      "contextmenu",
      eventHandler.contextmenu
    );
  },
  mousedown: (e) => {
    eventHandler.isClick = true;
    eventHandler.mousedownPoint = [e.pageX, e.pageY];
    if (e.button == 0) {
      console.log("左键");
    } else if (e.button == 1) {
      console.log("滚轮键"); //除了滚轮键，鼠标的右键都可以激活剖切功能
    } else {
      clip();
    }
  },
  mousemove: (e) => {
    console.log("pointermove");
    eventHandler.mousemovePoint = [e.pageX, e.pageY];
    const x1 = eventHandler.mousedownPoint[0];
    const y1 = eventHandler.mousedownPoint[1];
    const x2 = eventHandler.mousemovePoint[0];
    const y2 = eventHandler.mousemovePoint[1];
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    if (distance > 5) {
      // 计算鼠标按下点（mousedownPoint）与移动点（mousemovePoint）的欧几里得距离。
      // 如果距离超过 5 像素，设 isClick = false，表示拖动而非点击。
      eventHandler.isClick = false;
    }
    if (pointList.length >= 1 || globalPointList.length >= 1) {
      //当存在一个点的时候，会产生预产生的线段
      const point = getPoint(e, clipModel);
      if (point) {
        if (leanLoad) {
          if (globalLineGroup && globalTempLine) {
            globalLineGroup.remove(globalTempLine);
          }
          const from = globalPointList[globalPointList.length - 1];
          const to = point;
          globalTempLine = drawLine(from, to, "globalTempLine");
        } else {
          if (tempLine) lineGroup.remove(tempLine);
          const from = pointList[pointList.length - 1];
          const to = point;
          tempLine = drawLine(from, to, "tempLine");
        }
      }
    }
  },
  click: (e) => {
    console.log("click", eventHandler.isClick);
    if (eventHandler.isClick) {
      const point = getPoint(e, clipModel);
      if (point) {
        if (leanLoad) {
          globalPointList.push(point);
          const len = globalPointList.length;
          if (len >= 2) {
            const from = globalPointList[len - 2];
            const to = globalPointList[len - 1];
            drawLine(from, to);
          }
        } else {
          pointList.push(point);
          const len = pointList.length;
          if (len >= 2) {
            const from = pointList[len - 2];
            const to = pointList[len - 1];
            drawLine(from, to);
          }
        }
      }
    }
  },
  contextmenu: () => {
    console.log("contextmenu");
    //每次画线前先清除临时线段
    if (leanLoad) {
      if (globalLineGroup && globalTempLine)
        globalLineGroup.remove(globalTempLine);
      globalPointList = []; //清楚相关的线段列表
      pointList = [];
    } else {
      if (lineGroup && tempLine) lineGroup.remove(tempLine);
      pointList = [];
    }
  },
};
//裁剪掉前后左右两边，填充前后两面
/**(9) 初始化线段剖切信息 */
function initClipLine(from, to, planeWidth) {
  const a = from.clone();
  const b = to.clone();
  b.y = a.y; //???
  const c = new THREE.Vector3(b.x, b.y - 100, b.z);
  const frontPlane = new THREE.Plane().setFromCoplanarPoints(a, b, c); //执行平面对象方法。setFromCoplanarPoints(a,b,c)通过三个顶点坐标来设置一个平面对象Plane
  const backPlane = new THREE.Plane().setFromCoplanarPoints(c, b, a); //根据给定的三个点确定平面。通过右手螺旋规则确定（向量叉乘）法向量 normal。
  const leftNormal = b.clone().sub(a).normalize(); //将该向量转换为单位向量。
  const leftPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    leftNormal,
    a
  ); //通过平面上的一点以及法线确定平面。
  const rightNormal = a.clone().sub(b).normalize();
  const rightPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    rightNormal,
    b
  );
  const list = [];

  curModel.children.forEach((mesh, i) => {
    const origin = new THREE.Vector3(0, 0, 0);

    if (!mesh.material.hasOwnProperty(0)) {
      // 前景平面
      const frontPlaneMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(planeWidth, planeWidth),
        new THREE.MeshBasicMaterial({
          color: mesh.material.color,
          side: THREE.DoubleSide,
          clippingPlanes: [leftPlane, rightPlane],
        })
      );
      frontPlaneMesh.position.copy(
        frontPlane.projectPoint(origin, new THREE.Vector3())
      ); //将一个点point投射到该平面上。
      frontPlaneMesh.lookAt(origin);
      const frontPlaneScene = new THREE.Scene();
      frontPlaneScene.add(frontPlaneMesh);

      const frontPlaneBackModel = curModel.clone();
      frontPlaneBackModel.visible = true;
      const frontPlaneBackMesh = frontPlaneBackModel.children[i];
      frontPlaneBackMesh.material = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        side: THREE.BackSide,
        clippingPlanes: [frontPlane],
      });
      frontPlaneBackModel.children = [frontPlaneBackMesh];
      const frontPlaneBackScene = new THREE.Scene();
      frontPlaneBackScene.add(frontPlaneBackModel);

      const frontPlaneFrontModel = curModel.clone();
      frontPlaneFrontModel.visible = true;
      const frontPlaneFrontMesh = frontPlaneFrontModel.children[i];
      frontPlaneFrontMesh.material = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        side: THREE.FrontSide,
        clippingPlanes: [frontPlane],
      });
      frontPlaneFrontModel.children = [frontPlaneFrontMesh];
      const frontPlaneFrontScene = new THREE.Scene();
      frontPlaneFrontScene.add(frontPlaneFrontModel);

      // 背景平面
      const backPlaneMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(planeWidth, planeWidth),
        new THREE.MeshBasicMaterial({
          color: mesh.material.color,
          side: THREE.DoubleSide,
          clippingPlanes: [leftPlane, rightPlane],
        })
      );
      backPlaneMesh.position.copy(
        backPlane.projectPoint(origin, new THREE.Vector3())
      );
      backPlaneMesh.lookAt(origin);
      const backPlaneScene = new THREE.Scene();
      backPlaneScene.add(backPlaneMesh);

      const backPlaneBackModel = curModel.clone();
      backPlaneBackModel.visible = true;
      const backPlaneBackMesh = backPlaneBackModel.children[i];
      backPlaneBackMesh.material = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        side: THREE.BackSide,
        clippingPlanes: [backPlane],
      });
      backPlaneBackModel.children = [backPlaneBackMesh];
      const backPlaneBackScene = new THREE.Scene();
      backPlaneBackScene.add(backPlaneBackModel);

      const backPlaneFrontModel = curModel.clone();
      backPlaneFrontModel.visible = true;
      const backPlaneFrontMesh = backPlaneFrontModel.children[i];
      backPlaneFrontMesh.material = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        side: THREE.FrontSide,
        clippingPlanes: [backPlane],
      });
      backPlaneFrontModel.children = [backPlaneFrontMesh];
      const backPlaneFrontScene = new THREE.Scene();
      backPlaneFrontScene.add(backPlaneFrontModel);

      list.push({
        frontPlaneScene,
        frontPlaneBackScene,
        frontPlaneFrontScene,
        backPlaneScene,
        backPlaneBackScene,
        backPlaneFrontScene,
      });
    } else {
      for (let j = 0; j < mesh.material.length; j++) {
        // 前景平面
        const frontPlaneMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(planeWidth, planeWidth),
          new THREE.MeshBasicMaterial({
            color: mesh.material[j].color,
            side: THREE.DoubleSide,
            clippingPlanes: [leftPlane, rightPlane],
          })
        );
        frontPlaneMesh.position.copy(
          frontPlane.projectPoint(origin, new THREE.Vector3())
        );
        frontPlaneMesh.lookAt(origin);
        const frontPlaneScene = new THREE.Scene();
        frontPlaneScene.add(frontPlaneMesh);

        const frontPlaneBackModel = curModel.clone();
        frontPlaneBackModel.visible = true;
        const frontPlaneBackMesh = frontPlaneBackModel.children[i];
        frontPlaneBackMesh.material = new THREE.MeshBasicMaterial({
          colorWrite: false,
          depthWrite: false,
          side: THREE.BackSide,
          clippingPlanes: [frontPlane],
        });
        frontPlaneBackModel.children = [frontPlaneBackMesh];
        const frontPlaneBackScene = new THREE.Scene();
        frontPlaneBackScene.add(frontPlaneBackModel);

        const frontPlaneFrontModel = curModel.clone();
        frontPlaneFrontModel.visible = true;
        const frontPlaneFrontMesh = frontPlaneFrontModel.children[i];
        frontPlaneFrontMesh.material = new THREE.MeshBasicMaterial({
          colorWrite: false,
          depthWrite: false,
          side: THREE.FrontSide,
          clippingPlanes: [frontPlane],
        });
        frontPlaneFrontModel.children = [frontPlaneFrontMesh];
        const frontPlaneFrontScene = new THREE.Scene();
        frontPlaneFrontScene.add(frontPlaneFrontModel);

        // 背景平面
        const backPlaneMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(planeWidth, planeWidth),
          new THREE.MeshBasicMaterial({
            color: mesh.material[j].color,
            side: THREE.DoubleSide,
            clippingPlanes: [leftPlane, rightPlane],
          })
        );
        backPlaneMesh.position.copy(
          backPlane.projectPoint(origin, new THREE.Vector3())
        );
        backPlaneMesh.lookAt(origin);
        const backPlaneScene = new THREE.Scene();
        backPlaneScene.add(backPlaneMesh);

        const backPlaneBackModel = curModel.clone();
        backPlaneBackModel.visible = true;
        const backPlaneBackMesh = backPlaneBackModel.children[i];
        backPlaneBackMesh.material = new THREE.MeshBasicMaterial({
          colorWrite: false,
          depthWrite: false,
          side: THREE.BackSide,
          clippingPlanes: [backPlane],
        });
        backPlaneBackModel.children = [backPlaneBackMesh];
        const backPlaneBackScene = new THREE.Scene();
        backPlaneBackScene.add(backPlaneBackModel);

        const backPlaneFrontModel = curModel.clone();
        backPlaneFrontModel.visible = true;
        const backPlaneFrontMesh = backPlaneFrontModel.children[i];
        backPlaneFrontMesh.material = new THREE.MeshBasicMaterial({
          colorWrite: false,
          depthWrite: false,
          side: THREE.FrontSide,
          clippingPlanes: [backPlane],
        });
        backPlaneFrontModel.children = [backPlaneFrontMesh];
        const backPlaneFrontScene = new THREE.Scene();
        backPlaneFrontScene.add(backPlaneFrontModel);

        list.push({
          frontPlaneScene,
          frontPlaneBackScene,
          frontPlaneFrontScene,
          backPlaneScene,
          backPlaneBackScene,
          backPlaneFrontScene,
        });
      }
    }
  });
  return {
    frontPlane,
    backPlane,
    list,
  };
}

/**(10) 进行模板测试，确定覆盖平面要显示的部分 */
function stencilTest1() {
  const gl = renderer.getContext();
  clipLineList.forEach((line) => {
    renderer.clearStencil();
    gl.enable(gl.STENCIL_TEST);
    const distance = line.frontPlane.distanceToPoint(camera.position); //返回点point到平面的有符号距离。在法向量方向的正方向则返回正值。
    line.list.forEach((item, index) => {
      // 通过有符号距离，判断相机在哪一面，就只覆盖哪一面
      if (distance < 0) {
        // 初始化模板缓冲值，每层不一样
        gl.stencilFunc(gl.ALWAYS, index, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        renderer.render(item.frontPlaneBackScene, camera);

        // 背面加1
        gl.stencilFunc(gl.ALWAYS, 1, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
        renderer.render(item.frontPlaneBackScene, camera);

        // 正面减1
        gl.stencilFunc(gl.ALWAYS, 1, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);
        renderer.render(item.frontPlaneFrontScene, camera);

        // 缓冲区为指定值，才显示覆盖盒
        gl.stencilFunc(gl.LEQUAL, index + 1, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        renderer.render(item.frontPlaneScene, camera);
      } else {
        // 初始化模板缓冲值，每层不一样
        gl.stencilFunc(gl.ALWAYS, index, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        renderer.render(item.backPlaneBackScene, camera);

        // 背面加1
        gl.stencilFunc(gl.ALWAYS, 1, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
        renderer.render(item.backPlaneBackScene, camera);

        // 正面减1
        gl.stencilFunc(gl.ALWAYS, 1, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);
        renderer.render(item.backPlaneFrontScene, camera);

        // 缓冲区为指定值，才显示覆盖盒
        gl.stencilFunc(gl.LEQUAL, index + 1, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        renderer.render(item.backPlaneScene, camera);
      }
    });
    gl.disable(gl.STENCIL_TEST);
  });
}

// function upFile() {
//   let fr = new FileReader();
//   fr.readAsDataURL(file);
// }

// ----------------------倾斜摄影数据加载相关-------------------------

let leanFillPlaneList = [];
let leanFillPlaneObjList = [];
const leanHelpers = new THREE.Group();
//倾斜摄影辅助剖面
const leanPlanes = [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), ////创建一个法向量为 (1, 0, 0) 的平面，表示垂直于 X 轴的平面，且通过原点（距离原点为 0）。
  new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
];

//两个模型之间的剖切面（可以由两个剖切面curmodel的下面和leanmodel的上面进行控制）

//倾斜摄影数据加载
async function leanLoadModel(url) {
  try {
    leanLoad = true;
    console.log("开始加载倾斜摄影数据", url);
    const manager = new THREE.LoadingManager();
    manager.onError = (url) => {
      layer.open({
        title: "异常信息",
        content: `加载失败: ${url}`,
      });
    };
    const leanMtlLoader = new MTLLoader();
    const leanMtlUrl = url + ".mtl";

    const materials = await new Promise((resolve, reject) => {
      leanMtlLoader.load(
        leanMtlUrl,
        (mtl) => {
          mtl.preload();
          resolve(mtl);
        },
        (xhr) =>
          console.log(`MTL 加载进度: ${(xhr.loaded / xhr.total) * 100}%`),
        (err) => reject(`MTL 加载错误: ${err.message}`)
      );
    });
    const leanObjLoader = new OBJLoader(manager);
    leanObjLoader.setMaterials(materials);
    const leanObjUrl = `${url}.obj`;
    leanModel = await new Promise((resolve, reject) => {
      leanObjLoader.load(
        leanObjUrl,
        (obj) => resolve(obj),
        (xhr) =>
          console.log(`OBJ 加载进度: ${(xhr.loaded / xhr.total) * 100}%`),
        (err) => reject(`OBJ 加载错误: ${err.message}`)
      );
    });

    leanModelSize = await getModelSize(leanModel);
    const leanBox = new THREE.Box3().setFromObject(leanModel);
    const leanCenter = new THREE.Vector3();
    leanBox.getCenter(leanCenter);
    leanModel.position.sub(leanCenter); // 模型几何中心对准原点

    // size 是 curModel 的尺寸
    const offsetY = size ? size.y + leanModelSize.y : leanModelSize.y;
    leanModel.position.y += offsetY;

    // 初始化剖切平面的位置
    leanPlanes[0].constant = leanModelSize.x;
    leanPlanes[1].constant = leanModelSize.y + offsetY;
    leanPlanes[2].constant = leanModelSize.z;
    leanHelpers.add(
      new THREE.PlaneHelper(leanPlanes[0], leanModelSize.max / 4, 0xff0000)
    );
    leanHelpers.add(
      new THREE.PlaneHelper(leanPlanes[1], leanModelSize.max / 4, 0x00ff00)
    );
    leanHelpers.add(
      new THREE.PlaneHelper(leanPlanes[2], leanModelSize.max / 4, 0x0000ff)
    );
    leanHelpers.visible = false;
    scene.add(leanHelpers);

    setClipping(leanModel, leanPlanes);
    leanFillPlaneList = [];
    leanFillPlaneObjList = [];
    leanPlanes.forEach((leanPlane) => {
      const { list, poList } = initFillPlaneList(leanModel, leanPlane);
      leanFillPlaneList.push(list);
      leanFillPlaneObjList.push(poList);
    });

    scene.add(leanModel);
    console.log("倾斜摄影模型加载成功");
    //requestAnimationFrame(render)
  } catch (err) {
    layer.open({
      title: "异常信息",
      content: `加载发生错误: ${err}`,
    });
    leanLoad = false;
  }
}

// 移除倾斜摄影模型
function removeLeanModel() {
  leanLoad = false;
  console.log("开始倾斜摄影数据", leanLoad);
  scene.remove(leanModel); //从场景中移除倾斜摄影模型组
}

//倾斜摄影模板渲染

//一体化画线剖切
function openGlobalLineCut() {
  //intersectModel = leanModel;   //设置当前相交模型为倾斜摄影模型
  clipModel = leanModel; //设置当前模型为一体化画线剖切的模型
  console.log("一体化画线剖切功能开启");

  if (!globalLineGroup) {
    globalLineGroup = new THREE.Group();
    scene.add(globalLineGroup); //倾斜摄影上线段组
  }
  curModel.visible = true;
  leanModel.visible = true; //显示倾斜摄影模型
  eventHandler.contextmenu(); //初始化线段容器
  eventHandler.start();
}

function clipGlobalLineCut() {
  console.log("一体化画线剖切功能执行");
}

function closeGlobalLineCut() {
  console.log("一体化画线剖切功能关闭");
  isCliping = false; //渲染剖切状态的只是地质模型
  clipLineList = []; //清空剖切线段列表
  scene.remove(lineGroup); //从场景中移除线段组
  scene.remove(globalLineGroup); //从场景中移除倾斜摄影线段组
  lineGroup = null; //重置线段组为 null
  globalLineGroup = null; //重置倾斜摄影线段组为 null
  lineList = []; //清空线段列表
  pointList = []; //清空点列表
  globalPointList = []; //清空倾斜摄影点列表
  curModel.visible = true;
  eventHandler.end();
}
