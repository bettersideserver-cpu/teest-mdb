let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

let hoveredMesh = null; // 🔥 track hover
let isZooming = false;  // 🔥 prevent spam clicks


// ── URL PARAM ────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const locKey = params.get('location') || 'punjab';

// ── CONFIG ───────────────────────────────────────────────────
const LOCATION_CONFIGS = {

  punjab: {
    center: [78, 20],
    zoom: 4,
    projects: [
      {
        name: "MDB The Lutyens",
        coords: [76.7106423, 30.5811009],
        modelUrl: "London_Square.glb",

        url: "https://www.betterside.in", // 🔥 ADD THIS

        transform: {
          position: [23, -60, -50],
          rotation: [Math.PI / 2, 0, 0],
          scale: [1, 1, 1]
        }
      }
    ]
  },

  canada: {
    center: [-122.4935, 52.9799],
    zoom: 4,
    projects: [
      {
        name: "442 Kinchant St",
        coords: [-122.4935506, 52.9799497],
        modelUrl: "house.glb",
        zoom: 18,
        roadName: "Kinchant Street", // 🔥 ADD THIS

        transform: {
          position: [0, 0, -50], // 🔥 change this to move model
          rotation: [Math.PI / 2, 0, 0],
          scale: [1, 1, 1]
        }
      }
    ]
  }

};

// ── GLOBALS ──────────────────────────────────────────────────
const locConf = LOCATION_CONFIGS[locKey] || LOCATION_CONFIGS.punjab;
const projects = locConf.projects;

let map, scene, camera, renderer, model;
let currentProject = null;

// ── INIT ─────────────────────────────────────────────────────
window.onload = () => {

  map = new maplibregl.Map({
    container: 'map',
    // style: {
    //   version: 8,
    //   sources: {

    //     // 🛰 SATELLITE
    //     satellite: {
    //       type: "raster",
    //       tiles: [
    //         "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    //       ],
    //       tileSize: 256
    //     },

    //     // 🛣 ROADS + LABELS
    //     osm: {
    //       type: "vector",
    //       url: "https://demotiles.maplibre.org/tiles/tiles.json"
    //     }

    //   },

    //   layers: [

    //     // 🛰 base
    //     {
    //       id: "satellite",
    //       type: "raster",
    //       source: "satellite"
    //     },
    //     {
    //       id: "road-glow",
    //       type: "line",
    //       source: "osm",
    //       "source-layer": "transportation",
    //       paint: {
    //         "line-color": "#00BFFF",
    //         "line-width": [
    //           "interpolate",
    //           ["linear"],
    //           ["zoom"],
    //           10, 3,
    //           15, 8,
    //           20, 14
    //         ],
    //         "line-opacity": 0.2
    //       }
    //     },
    //     // 🛣 roads
    //     {
    //       id: "roads",
    //       type: "line",
    //       source: "osm",
    //       "source-layer": "transportation",
    //       paint: {
    //         "line-color": "#00BFFF",   // 🔥 bright blue
    //         "line-width": [
    //           "interpolate",
    //           ["linear"],
    //           ["zoom"],
    //           10, 1,
    //           15, 3,
    //           20, 6
    //         ],
    //         "line-opacity": 0.9
    //       }
    //     },

    //     // 🏙 buildings (optional)
    //     {
    //       id: "buildings",
    //       type: "fill",
    //       source: "osm",
    //       "source-layer": "building",
    //       paint: {
    //         "fill-color": "#888",
    //         "fill-opacity": 0.3
    //       }
    //     }

    //   ]
    // },

    

    style: {
      version: 8,
      sources: {

        // 🛰 Satellite
        satellite: {
          type: "raster",
          tiles: [
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          ],
          tileSize: 256
        },

        // 🛣 Roads overlay (raster labels)
        roads: {
          type: "raster",
          tiles: [
            "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
          ],
          tileSize: 256
        }

      },

      layers: [

        // base satellite
        {
          id: "satellite",
          type: "raster",
          source: "satellite"
        },

        // roads overlay
        {
          id: "roads",
          type: "raster",
          source: "roads",
          paint: {
            "raster-opacity": 0.9
          }
        }

      ]
    },



    
    center: locConf.center,
    zoom: locConf.zoom


  });


map.getCanvas().addEventListener('click', (event) => {

  if (!model || !currentProject) return;

  const rect = map.getCanvas().getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(model, true);

  if (intersects.length > 0) {

    console.log("Clicked on building 🔥");

    if (currentProject.url) {
      window.open(currentProject.url, "_blank"); // open new tab
    }

  }

});


  map.addControl(new maplibregl.NavigationControl());


  let roadsVisible = true;

  document.getElementById("roadToggle").onclick = () => {

    roadsVisible = !roadsVisible;

    if (roadsVisible) {
      map.setPaintProperty("roads", "raster-opacity", 0.9);
      document.getElementById("roadToggle").innerText = "Roads ON";
    } else {
      map.setPaintProperty("roads", "raster-opacity", 0);
      document.getElementById("roadToggle").innerText = "Roads OFF";
    }

  };


  setupProjects();
  setupThreeLayer();
  buildPanel();
};


// ── PANEL ────────────────────────────────────────────────────
function buildPanel() {
  const container = document.getElementById('project-buttons');
  container.innerHTML = '';

  projects.forEach((project, i) => {
    const btn = document.createElement('button');
    btn.textContent = project.name;
    btn.onclick = () => focusProject(i);
    container.appendChild(btn);
  });
}

// ── MARKERS ──────────────────────────────────────────────────
function setupProjects() {
  projects.forEach((project, i) => {

    const el = document.createElement('div');
    el.className = 'marker';

    new maplibregl.Marker({ element: el })
      .setLngLat(project.coords)
      .addTo(map)
      .getElement()
      .addEventListener('click', () => focusProject(i));
  });
}
function showNearbyRoad(project) {

  const coords = project.coords;

  // remove old
  if (map.getLayer('road-label')) {
    map.removeLayer('road-label');
    map.removeSource('road-label');
  }

  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coords
        },
        properties: {
          name: project.roadName || "Nearby Road"
        }
      }
    ]
  };

  map.addSource('road-label', {
    type: 'geojson',
    data: geojson
  });

  // 📝 ONLY TEXT
  map.addLayer({
    id: 'road-label',
    type: 'symbol',
    source: 'road-label',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 14,
      'text-offset': [0, -2],
      'text-anchor': 'top'
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#000',
      'text-halo-width': 2
    }
  });
}
// ── CAMERA MOVE ──────────────────────────────────────────────
function focusProject(index) {

  const project = projects[index];
  currentProject = project;

  map.flyTo({
    center: project.coords,
    zoom: project.zoom || 17,
    pitch: 85,
    bearing: -10
  });

  loadModel(project);

// 🔥 show info panel
document.getElementById("nearbyPanel").style.display = "block";


  // 🔥 show nearby road
  showNearbyRoad(project);
}
function drawInfoLine(start, end, text) {

  // remove old
  if (map.getLayer('info-line')) {
    map.removeLayer('info-line');
    map.removeSource('info-line');
  }
  if (map.getLayer('info-text')) {
    map.removeLayer('info-text');
  }

  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [start, end]
        }
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [
            (start[0] + end[0]) / 2,
            (start[1] + end[1]) / 2
          ]
        },
        properties: {
          title: text
        }
      }
    ]
  };

  map.addSource('info-line', {
    type: 'geojson',
    data: geojson
  });

  // 🔵 line
  map.addLayer({
    id: 'info-line',
    type: 'line',
    source: 'info-line',
    paint: {
      'line-color': '#00BFFF',
      'line-width': 4
    }
  });

  // 📝 text label
  map.addLayer({
    id: 'info-text',
    type: 'symbol',
    source: 'info-line',
    layout: {
      'text-field': ['get', 'title'],
      'text-size': 14,
      'text-offset': [0, -1],
      'text-anchor': 'top'
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#000000',
      'text-halo-width': 2
    }
  });
}
// ── THREE LAYER ──────────────────────────────────────────────
function setupThreeLayer() {

  map.on('load', () => {

    const customLayer = {

      id: '3d-model',
      type: 'custom',
      renderingMode: '3d',

      onAdd(map, gl) {

        camera = new THREE.Camera();
        scene = new THREE.Scene();

        // 🌤 Ambient (soft base light)
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        // ☀️ Hemisphere (fake global illumination)
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 2.5);
        scene.add(hemi);

        // 🌞 Directional (sun light)
        const dir = new THREE.DirectionalLight(0xffffff, 2);
        dir.position.set(100, 200, 100);
        scene.add(dir);



        const texLoader = new THREE.TextureLoader();

        texLoader.load(
          'https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg',
          (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;

            scene.environment = texture; // 🔥 reflections + GI feel
          }
        );



        renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true
        });
        renderer.physicallyCorrectLights = true;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.autoClear = false;
      },

      render(gl, matrix) {

        if (!model || !currentProject) return;

        const mercator = maplibregl.MercatorCoordinate.fromLngLat(
          currentProject.coords,
          50
        );

        const scale = mercator.meterInMercatorCoordinateUnits();

        const m = new THREE.Matrix4().fromArray(matrix);

        const t = currentProject.transform || {};
        const pos = t.position || [0, 0, 0];

        const transform = new THREE.Matrix4()
          .makeTranslation(
            mercator.x + pos[0] * scale,
            mercator.y + pos[1] * scale,
            mercator.z + pos[2] * scale
          )
          .scale(new THREE.Vector3(scale, -scale, scale));

        camera.projectionMatrix = m.multiply(transform);

        renderer.resetState();
        renderer.render(scene, camera);
        map.triggerRepaint();
      }
    };

    map.addLayer(customLayer);
  });
}

// ── MODEL LOADER ─────────────────────────────────────────────
function loadModel(project) {

  const loader = new THREE.GLTFLoader();

  if (model) scene.remove(model);

  loader.load(project.modelUrl, (gltf) => {

    model = gltf.scene;

    const t = project.transform || {};

    model.rotation.set(...(t.rotation || [0, 0, 0]));
    model.scale.set(...(t.scale || [1, 1, 1]));

    // ✅ FIXED traverse
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.envMapIntensity = 1.5;
      }
    });

    scene.add(model);

    console.log("Loaded:", project.name);
  });
}






// ── ROUTING ───────────────────────────────────────────────────
// ── MAPBOX TOKEN ─────────────────────────────────────────────
const MAPBOX_TOKEN = "pk.eyJ1IjoiYW1hbnBhbmVzYXIiLCJhIjoiY21ud3VwNHo0MDBjNDJxczh6a3c4Y2RlaSJ9.JGJ94Fyek4zBUNwZNAxxsw";

// ── GEOCODING ────────────────────────────────────────────────
async function getCoordinates(place) {

  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${place}.json?access_token=${MAPBOX_TOKEN}`
  );

  const data = await res.json();

  if (!data.features.length) {
    alert("Location not found");
    return null;
  }

  return data.features[0].center;
}

// ── ROUTE ────────────────────────────────────────────────────
async function getRoute(start, end) {

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url);
  const data = await res.json();

  const route = data.routes[0];

  return {
    geometry: route.geometry,
    distance: (route.distance / 1000).toFixed(2),
    duration: (route.duration / 60).toFixed(1)
  };
}

// ── DRAW ROUTE ───────────────────────────────────────────────
function drawRoute(geometry, distance, duration, start, end) {

  if (map.getLayer('route')) {
    map.removeLayer('route');
    map.removeSource('route');
  }

  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: geometry
    }
  });

  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    paint: {
      'line-color': '#00BFFF',
      'line-width': 5,
      'line-opacity': 0.9
    }
  });

  // 🔥 Fit full route nicely
  map.fitBounds([start, end], {
    padding: 100,
    pitch: 60
  });

  // 🔥 Clean UI instead of alert
  let info = document.getElementById("route-info");

  if (!info) {
    info = document.createElement("div");
    info.id = "route-info";
    info.style = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 14px;
      z-index: 1000;
    `;
    document.body.appendChild(info);
  }

  info.innerHTML = `Distance: ${distance} km<br>Time: ${duration} min`;
}

// ── SEARCH EVENT ─────────────────────────────────────────────
document.getElementById("searchBox").addEventListener("keypress", async (e) => {

  if (e.key === "Enter") {

    if (!currentProject) {
      alert("Select a project first");
      return;
    }

    const place = e.target.value;

    const start = await getCoordinates(place);
    if (!start) return;

    const end = currentProject.coords;

    const route = await getRoute(start, end);

    drawRoute(route.geometry, route.distance, route.duration, start, end);
  }
});


//Auto Search
async function getSuggestions(query) {

  if (!query) return [];

  const center = map.getCenter();

  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?autocomplete=true&limit=5&country=in&proximity=${center.lng},${center.lat}&access_token=${MAPBOX_TOKEN}`
  );

  const data = await res.json();

  return data.features;
}
function showSuggestions(list) {

  const box = document.getElementById("suggestions");

  box.innerHTML = "";

  if (!list.length) {
    box.style.display = "none";
    return;
  }

  list.forEach(item => {

    const div = document.createElement("div");

    div.innerText = item.place_name;
    div.style.padding = "10px";
    div.style.cursor = "pointer";
    div.style.borderBottom = "1px solid rgba(255,255,255,0.1)";

    div.onmouseover = () => div.style.background = "rgba(255,255,255,0.1)";
    div.onmouseout = () => div.style.background = "transparent";

    div.onclick = async () => {

      document.getElementById("searchBox").value = item.place_name;
      box.style.display = "none";

      if (!currentProject) {
        alert("Select a project first");
        return;
      }

      const start = item.center;
      const end = currentProject.coords;

      const route = await getRoute(start, end);

      drawRoute(route.geometry, route.distance, route.duration, start, end);
    };

    box.appendChild(div);
  });

  box.style.display = "block";
}
const searchBox = document.getElementById("searchBox");

searchBox.addEventListener("input", async () => {

  const query = searchBox.value;

  if (query.length < 3) {
    document.getElementById("suggestions").style.display = "none";
    return;
  }

  const suggestions = await getSuggestions(query);

  showSuggestions(suggestions);
});









// ── NEARBY PLACES ─────────────────────────────────────────────
let nearbyMarkers = [];
let currentCategory = "hospital";

// 🔥 calculate distance between two lat/lng points in KM
function getDistanceKm(lat1, lon1, lat2, lon2){

    const R = 6371;

    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;

    const a =
      Math.sin(dLat/2)*Math.sin(dLat/2) +
      Math.cos(lat1*Math.PI/180) *
      Math.cos(lat2*Math.PI/180) *
      Math.sin(dLon/2)*Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}


async function searchNearby(type){

    if(!currentProject) return;

    currentCategory = type;

    const radiusKm =
      parseInt(document.getElementById("radiusSlider").value);

    const lng = currentProject.coords[0];
    const lat = currentProject.coords[1];

    const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${type}.json?`+
    `proximity=${lng},${lat}`+
    `limit=20&access_token=${MAPBOX_TOKEN}`;

    const res = await fetch(url);
    const data = await res.json();

    clearNearbyMarkers();

    let bounds = new maplibregl.LngLatBounds();
    bounds.extend(currentProject.coords);

    data.features.forEach(place=>{

        const dist = getDistanceKm(
          lat, lng,
          place.center[1],
          place.center[0]
        );

        if(dist <= radiusKm){

          const marker = new maplibregl.Marker({
            color:"#00ffcc"
          })
          .setLngLat(place.center)
          .setPopup(
            new maplibregl.Popup().setHTML(
              `<b>${place.text}</b><br>${dist.toFixed(1)} KM`
            )
          )
          .addTo(map);

          nearbyMarkers.push(marker);

          bounds.extend(place.center);
        }
    });

    map.fitBounds(bounds,{
      padding:100,
      pitch:55,
      duration:1500
    });
}
// 🔥 called on category change and radius change
function changeRadius(){
   searchNearby(currentCategory);
}
// 🔥 remove old nearby markers
function clearNearbyMarkers(){
   nearbyMarkers.forEach(m=>m.remove());
   nearbyMarkers = [];
}


// 🔥 called on radius slider change
function updateRadius(){
   const val = document.getElementById("radiusSlider").value;
   document.getElementById("radiusValue").innerText = val;

   searchNearby(currentCategory);
}