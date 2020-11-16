// Generated by CoffeeScript 2.5.1
var World;

import * as THREE from './../build/three.module.js';

import {
  CellTerrain
} from './CellTerrain.js';

import {
  AnimatedTextureAtlas
} from './AnimatedTextureAtlas.js';

World = class World {
  constructor(options) {
    var _this;
    _this = this;
    this.cellMesh = {};
    this.cellNeedsUpdate = {};
    this.models = {};
    this.cellSize = options.cellSize;
    this.camera = options.camera;
    this.scene = options.scene;
    this.toxelSize = options.toxelSize;
    this.al = options.al;
    this.cellTerrain = new CellTerrain({
      cellSize: this.cellSize
    });
    this.ATA = new AnimatedTextureAtlas({
      al: this.al
    });
    this.material = this.ATA.material;
    this.cellUpdateTime = null;
    this.renderTime = 500;
    this.neighbours = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
    //Utworzenie Workera do obliczania geometrii chunków
    this.chunkWorker = new Worker("/module/World/chunk.worker.js", {
      type: 'module'
    });
    this.chunkWorker.onmessage = function(message) {
      return _this.updateCell(message.data);
    };
    this.chunkWorker.postMessage({
      type: 'init',
      data: {
        models: {
          anvil: {...this.al.get("anvil").children[0].geometry.attributes}
        },
        blocksMapping: this.al.get("blocksMapping"),
        toxelSize: this.toxelSize,
        cellSize: this.cellSize
      }
    });
    //Utworzenie Workera do przekształcania bufforów otrzymanych z serwera
    this.sectionsWorker = new Worker("/module/World/sections.worker.js", {
      type: 'module'
    });
    this.sectionsWorker.onmessage = function(data) {
      var i, j, len1, result, results;
      result = data.data.result;
      results = [];
      for (j = 0, len1 = result.length; j < len1; j++) {
        i = result[j];
        if (i !== null) {
          results.push(_this.setCell(i.x, i.y, i.z, i.cell, i.biome));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };
    return;
  }

  setCell(cellX, cellY, cellZ, buffer, biome) {
    var j, len1, nei, neiCellId, ref, results;
    this._setCell(cellX, cellY, cellZ, buffer, biome);
    this.cellTerrain.setCell(cellX, cellY, cellZ, buffer);
    this.cellTerrain.setBiome(cellX, cellY, cellZ, biome);
    this.cellNeedsUpdate[this.cellTerrain.vec3(cellX, cellY, cellZ)] = true;
    ref = this.neighbours;
    results = [];
    for (j = 0, len1 = ref.length; j < len1; j++) {
      nei = ref[j];
      neiCellId = this.cellTerrain.vec3(cellX + nei[0], cellY + nei[1], cellZ + nei[2]);
      results.push(this.cellNeedsUpdate[neiCellId] = true);
    }
    return results;
  }

  setBlock(voxelX, voxelY, voxelZ, value) {
    var cellId, j, len1, nei, neiCellId, ref;
    voxelX = parseInt(voxelX);
    voxelY = parseInt(voxelY);
    voxelZ = parseInt(voxelZ);
    if ((this.cellTerrain.getVoxel(voxelX, voxelY, voxelZ)) !== value) {
      this._setVoxel(voxelX, voxelY, voxelZ, value);
      this.cellTerrain.setVoxel(voxelX, voxelY, voxelZ, value);
      cellId = this.cellTerrain.vec3(...this.cellTerrain.computeCellForVoxel(voxelX, voxelY, voxelZ));
      this.cellNeedsUpdate[cellId] = true;
      ref = this.neighbours;
      for (j = 0, len1 = ref.length; j < len1; j++) {
        nei = ref[j];
        neiCellId = this.cellTerrain.vec3(...this.cellTerrain.computeCellForVoxel(voxelX + nei[0], voxelY + nei[1], voxelZ + nei[2]));
        this.cellNeedsUpdate[neiCellId] = true;
      }
    }
  }

  updateCellsAroundPlayer(pos, radius) {
    var _this, cell, i, j, k, odw, ref, ref1, results, up, v, x, y, z;
    //Updatowanie komórek wokół gracza w danym zasięgu
    _this = this;
    if (this.cellUpdateTime !== null && (performance.now() - this.cellUpdateTime > this.renderTime)) {
      ref = this.cellMesh;
      for (k in ref) {
        v = ref[k];
        v.visible = false;
      }
      cell = this.cellTerrain.computeCellForVoxel(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
      up = function(x, y, z) {
        var pcell;
        pcell = [cell[0] + x, cell[1] + y, cell[2] + z];
        if (_this.cellMesh[_this.cellTerrain.vec3(...pcell)]) {
          _this.cellMesh[_this.cellTerrain.vec3(...pcell)].visible = true;
        }
        if (_this.cellNeedsUpdate[_this.cellTerrain.vec3(...pcell)]) {
          _this._genCellGeo(...pcell);
          delete _this.cellNeedsUpdate[_this.cellTerrain.vec3(...pcell)];
        }
      };
      odw = {};
      results = [];
      for (i = j = 0, ref1 = radius; (0 <= ref1 ? j <= ref1 : j >= ref1); i = 0 <= ref1 ? ++j : --j) {
        results.push((function() {
          var l, ref2, ref3, results1;
          results1 = [];
          for (x = l = ref2 = -i, ref3 = i; (ref2 <= ref3 ? l <= ref3 : l >= ref3); x = ref2 <= ref3 ? ++l : --l) {
            results1.push((function() {
              var m, ref4, ref5, results2;
              results2 = [];
              for (y = m = ref4 = -i, ref5 = i; (ref4 <= ref5 ? m <= ref5 : m >= ref5); y = ref4 <= ref5 ? ++m : --m) {
                results2.push((function() {
                  var n, ref6, ref7, results3;
                  results3 = [];
                  for (z = n = ref6 = -i, ref7 = i; (ref6 <= ref7 ? n <= ref7 : n >= ref7); z = ref6 <= ref7 ? ++n : --n) {
                    if (!odw[`${x}:${y}:${z}`]) {
                      up(x, y, z);
                      results3.push(odw[`${x}:${y}:${z}`] = true);
                    } else {
                      results3.push(void 0);
                    }
                  }
                  return results3;
                })());
              }
              return results2;
            })());
          }
          return results1;
        })());
      }
      return results;
    }
  }

  updateCell(data) {
    var cell, cellId, geometry, mesh;
    //Updatowanie komórki z już obliczoną geometrią
    cellId = this.cellTerrain.vec3(...data.info);
    cell = data.cell;
    mesh = this.cellMesh[cellId];
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cell.positions), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(cell.normals), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(cell.uvs), 2));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cell.colors), 3));
    if (mesh === void 0) {
      this.cellMesh[cellId] = new THREE.Mesh(geometry, this.material);
      this.scene.add(this.cellMesh[cellId]);
    } else {
      this.cellMesh[cellId].geometry = geometry;
    }
  }

  intersectsRay(start, end) {
    var dx, dy, dz, ix, iy, iz, len, lenSq, stepX, stepY, stepZ, steppedIndex, t, txDelta, txMax, tyDelta, tyMax, tzDelta, tzMax, voxel, xDist, yDist, zDist;
    start.x += 0.5;
    start.y += 0.5;
    start.z += 0.5;
    end.x += 0.5;
    end.y += 0.5;
    end.z += 0.5;
    dx = end.x - start.x;
    dy = end.y - start.y;
    dz = end.z - start.z;
    lenSq = dx * dx + dy * dy + dz * dz;
    len = Math.sqrt(lenSq);
    dx /= len;
    dy /= len;
    dz /= len;
    t = 0.0;
    ix = Math.floor(start.x);
    iy = Math.floor(start.y);
    iz = Math.floor(start.z);
    stepX = dx > 0 ? 1 : -1;
    stepY = dy > 0 ? 1 : -1;
    stepZ = dz > 0 ? 1 : -1;
    txDelta = Math.abs(1 / dx);
    tyDelta = Math.abs(1 / dy);
    tzDelta = Math.abs(1 / dz);
    xDist = stepX > 0 ? ix + 1 - start.x : start.x - ix;
    yDist = stepY > 0 ? iy + 1 - start.y : start.y - iy;
    zDist = stepZ > 0 ? iz + 1 - start.z : start.z - iz;
    txMax = txDelta < 2e308 ? txDelta * xDist : 2e308;
    tyMax = tyDelta < 2e308 ? tyDelta * yDist : 2e308;
    tzMax = tzDelta < 2e308 ? tzDelta * zDist : 2e308;
    steppedIndex = -1;
    while (t <= len) {
      voxel = this.cellTerrain.getVoxel(ix, iy, iz);
      if (voxel) {
        return {
          position: [start.x + t * dx, start.y + t * dy, start.z + t * dz],
          normal: [steppedIndex === 0 ? -stepX : 0, steppedIndex === 1 ? -stepY : 0, steppedIndex === 2 ? -stepZ : 0],
          voxel
        };
      }
      if (txMax < tyMax) {
        if (txMax < tzMax) {
          ix += stepX;
          t = txMax;
          txMax += txDelta;
          steppedIndex = 0;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      } else {
        if (tyMax < tzMax) {
          iy += stepY;
          t = tyMax;
          tyMax += tyDelta;
          steppedIndex = 1;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      }
    }
    return null;
  }

  getRayBlock() {
    var end, intersection, posBreak, posPlace, start;
    start = new THREE.Vector3().setFromMatrixPosition(this.camera.matrixWorld);
    end = new THREE.Vector3().set(0, 0, 1).unproject(this.camera);
    intersection = this.intersectsRay(start, end);
    if (intersection) {
      posPlace = intersection.position.map(function(v, ndx) {
        return v + intersection.normal[ndx] * 0.5;
      });
      posBreak = intersection.position.map(function(v, ndx) {
        return v + intersection.normal[ndx] * -0.5;
      });
      return {posPlace, posBreak};
    } else {
      return false;
    }
  }

  _setCell(cellX, cellY, cellZ, buffer, biome) {
    //Wysyłanie do ChunkWorkera informacji nowej komórce
    this.cellUpdateTime = performance.now();
    return this.chunkWorker.postMessage({
      type: "setCell",
      data: [cellX, cellY, cellZ, buffer, biome]
    });
  }

  _setVoxel(voxelX, voxelY, voxelZ, value) {
    //Wysyłanie do ChunkWorkera informacji o nowym Voxelu
    return this.chunkWorker.postMessage({
      type: "setVoxel",
      data: [voxelX, voxelY, voxelZ, value]
    });
  }

  _genCellGeo(cellX, cellY, cellZ) {
    //Wysyłanie do ChunkWorkera prośby o wygenerowanie geometrii komórki
    cellX = parseInt(cellX);
    cellY = parseInt(cellY);
    cellZ = parseInt(cellZ);
    return this.chunkWorker.postMessage({
      type: "genCellGeo",
      data: [cellX, cellY, cellZ]
    });
  }

  _computeSections(sections, x, z, biomes) {
    //Wysyłanie do SectionsWorkera Buffora, który ma przekształcić w łatwiejszą postać
    return this.sectionsWorker.postMessage({
      type: "computeSections",
      data: {sections, x, z, biomes}
    });
  }

};

export {
  World
};
