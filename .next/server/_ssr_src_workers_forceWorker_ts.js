/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "(ssr)/./src/workers/forceWorker.ts":
/*!************************************!*\
  !*** ./src/workers/forceWorker.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var d3__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! d3 */ \"(ssr)/./node_modules/d3/src/index.js\");\n// Force calculation worker\n\nself.onmessage = (e)=>{\n    const { nodes, links, width, height } = e.data;\n    // Create force simulation\n    const simulation = d3__WEBPACK_IMPORTED_MODULE_0__.forceSimulation(nodes).force(\"link\", d3__WEBPACK_IMPORTED_MODULE_0__.forceLink(links).id((d)=>d.id).distance(100)).force(\"charge\", d3__WEBPACK_IMPORTED_MODULE_0__.forceManyBody().strength((d)=>d.id === \"Architecture\" ? -2000 : -800)).force(\"center\", d3__WEBPACK_IMPORTED_MODULE_0__.forceCenter(width / 2, height / 2)).force(\"collision\", d3__WEBPACK_IMPORTED_MODULE_0__.forceCollide().radius(30)).force(\"x\", d3__WEBPACK_IMPORTED_MODULE_0__.forceX(width / 2).strength(0.05)).force(\"y\", d3__WEBPACK_IMPORTED_MODULE_0__.forceY(height / 2).strength(0.05));\n    // On each tick, post the updated positions back to the main thread\n    simulation.on(\"tick\", ()=>{\n        self.postMessage({\n            type: \"tick\",\n            nodes\n        });\n    });\n    simulation.on(\"end\", ()=>{\n        self.postMessage({\n            type: \"end\",\n            nodes\n        });\n    });\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9zcmMvd29ya2Vycy9mb3JjZVdvcmtlci50cyIsIm1hcHBpbmdzIjoiOztBQUFBLDJCQUEyQjtBQUNGO0FBd0J6QkMsS0FBS0MsU0FBUyxHQUFHLENBQUNDO0lBQ2hCLE1BQU0sRUFBRUMsS0FBSyxFQUFFQyxLQUFLLEVBQUVDLEtBQUssRUFBRUMsTUFBTSxFQUFFLEdBQUdKLEVBQUVLLElBQUk7SUFFOUMsMEJBQTBCO0lBQzFCLE1BQU1DLGFBQWFULCtDQUFrQixDQUFPSSxPQUN6Q08sS0FBSyxDQUFDLFFBQVFYLHlDQUFZLENBQWFLLE9BQ3JDUSxFQUFFLENBQUNDLENBQUFBLElBQUtBLEVBQUVELEVBQUUsRUFDWkUsUUFBUSxDQUFDLE1BQ1hKLEtBQUssQ0FBQyxVQUFVWCw2Q0FBZ0IsR0FDOUJpQixRQUFRLENBQUNILENBQUFBLElBQUtBLEVBQUVELEVBQUUsS0FBSyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsTUFDbkRGLEtBQUssQ0FBQyxVQUFVWCwyQ0FBYyxDQUFDTSxRQUFRLEdBQUdDLFNBQVMsSUFDbkRJLEtBQUssQ0FBQyxhQUFhWCw0Q0FBZSxHQUFHb0IsTUFBTSxDQUFDLEtBQzVDVCxLQUFLLENBQUMsS0FBS1gsc0NBQVMsQ0FBQ00sUUFBUSxHQUFHVyxRQUFRLENBQUMsT0FDekNOLEtBQUssQ0FBQyxLQUFLWCxzQ0FBUyxDQUFDTyxTQUFTLEdBQUdVLFFBQVEsQ0FBQztJQUU3QyxtRUFBbUU7SUFDbkVSLFdBQVdjLEVBQUUsQ0FBQyxRQUFRO1FBQ3BCdEIsS0FBS3VCLFdBQVcsQ0FBQztZQUFFQyxNQUFNO1lBQVFyQjtRQUFNO0lBQ3pDO0lBRUFLLFdBQVdjLEVBQUUsQ0FBQyxPQUFPO1FBQ25CdEIsS0FBS3VCLFdBQVcsQ0FBQztZQUFFQyxNQUFNO1lBQU9yQjtRQUFNO0lBQ3hDO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93aWtpcGVkaWEtaHlwZXJsaW5rLWdyYXBoLy4vc3JjL3dvcmtlcnMvZm9yY2VXb3JrZXIudHM/M2RjMCJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBGb3JjZSBjYWxjdWxhdGlvbiB3b3JrZXJcclxuaW1wb3J0ICogYXMgZDMgZnJvbSAnZDMnO1xyXG5cclxuaW50ZXJmYWNlIE5vZGUge1xyXG4gIGlkOiBzdHJpbmc7XHJcbiAgeD86IG51bWJlcjtcclxuICB5PzogbnVtYmVyO1xyXG4gIGZ4PzogbnVtYmVyIHwgbnVsbDtcclxuICBmeT86IG51bWJlciB8IG51bGw7XHJcbiAgZGVwdGg/OiBudW1iZXI7XHJcbn1cclxuXHJcbmludGVyZmFjZSBMaW5rIHtcclxuICBzb3VyY2U6IHN0cmluZyB8IE5vZGU7XHJcbiAgdGFyZ2V0OiBzdHJpbmcgfCBOb2RlO1xyXG4gIHZhbHVlOiBudW1iZXI7XHJcbn1cclxuXHJcbmludGVyZmFjZSBGb3JjZU1lc3NhZ2Uge1xyXG4gIG5vZGVzOiBOb2RlW107XHJcbiAgbGlua3M6IExpbmtbXTtcclxuICB3aWR0aDogbnVtYmVyO1xyXG4gIGhlaWdodDogbnVtYmVyO1xyXG59XHJcblxyXG5zZWxmLm9ubWVzc2FnZSA9IChlOiBNZXNzYWdlRXZlbnQ8Rm9yY2VNZXNzYWdlPikgPT4ge1xyXG4gIGNvbnN0IHsgbm9kZXMsIGxpbmtzLCB3aWR0aCwgaGVpZ2h0IH0gPSBlLmRhdGE7XHJcbiAgXHJcbiAgLy8gQ3JlYXRlIGZvcmNlIHNpbXVsYXRpb25cclxuICBjb25zdCBzaW11bGF0aW9uID0gZDMuZm9yY2VTaW11bGF0aW9uPE5vZGU+KG5vZGVzKVxyXG4gICAgLmZvcmNlKCdsaW5rJywgZDMuZm9yY2VMaW5rPE5vZGUsIExpbms+KGxpbmtzKVxyXG4gICAgICAuaWQoZCA9PiBkLmlkKVxyXG4gICAgICAuZGlzdGFuY2UoMTAwKSlcclxuICAgIC5mb3JjZSgnY2hhcmdlJywgZDMuZm9yY2VNYW55Qm9keTxOb2RlPigpXHJcbiAgICAgIC5zdHJlbmd0aChkID0+IGQuaWQgPT09IFwiQXJjaGl0ZWN0dXJlXCIgPyAtMjAwMCA6IC04MDApKVxyXG4gICAgLmZvcmNlKCdjZW50ZXInLCBkMy5mb3JjZUNlbnRlcih3aWR0aCAvIDIsIGhlaWdodCAvIDIpKVxyXG4gICAgLmZvcmNlKCdjb2xsaXNpb24nLCBkMy5mb3JjZUNvbGxpZGUoKS5yYWRpdXMoMzApKVxyXG4gICAgLmZvcmNlKCd4JywgZDMuZm9yY2VYKHdpZHRoIC8gMikuc3RyZW5ndGgoMC4wNSkpXHJcbiAgICAuZm9yY2UoJ3knLCBkMy5mb3JjZVkoaGVpZ2h0IC8gMikuc3RyZW5ndGgoMC4wNSkpO1xyXG5cclxuICAvLyBPbiBlYWNoIHRpY2ssIHBvc3QgdGhlIHVwZGF0ZWQgcG9zaXRpb25zIGJhY2sgdG8gdGhlIG1haW4gdGhyZWFkXHJcbiAgc2ltdWxhdGlvbi5vbigndGljaycsICgpID0+IHtcclxuICAgIHNlbGYucG9zdE1lc3NhZ2UoeyB0eXBlOiAndGljaycsIG5vZGVzIH0pO1xyXG4gIH0pO1xyXG5cclxuICBzaW11bGF0aW9uLm9uKCdlbmQnLCAoKSA9PiB7XHJcbiAgICBzZWxmLnBvc3RNZXNzYWdlKHsgdHlwZTogJ2VuZCcsIG5vZGVzIH0pO1xyXG4gIH0pO1xyXG59OyAiXSwibmFtZXMiOlsiZDMiLCJzZWxmIiwib25tZXNzYWdlIiwiZSIsIm5vZGVzIiwibGlua3MiLCJ3aWR0aCIsImhlaWdodCIsImRhdGEiLCJzaW11bGF0aW9uIiwiZm9yY2VTaW11bGF0aW9uIiwiZm9yY2UiLCJmb3JjZUxpbmsiLCJpZCIsImQiLCJkaXN0YW5jZSIsImZvcmNlTWFueUJvZHkiLCJzdHJlbmd0aCIsImZvcmNlQ2VudGVyIiwiZm9yY2VDb2xsaWRlIiwicmFkaXVzIiwiZm9yY2VYIiwiZm9yY2VZIiwib24iLCJwb3N0TWVzc2FnZSIsInR5cGUiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./src/workers/forceWorker.ts\n");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	__webpack_require__.x = () => {
/******/ 		// Load entry module and return exports
/******/ 		// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 		var __webpack_exports__ = __webpack_require__.O(undefined, ["vendor-chunks/d3-geo","vendor-chunks/robust-predicates","vendor-chunks/d3-shape","vendor-chunks/d3-array","vendor-chunks/d3-hierarchy","vendor-chunks/d3-scale","vendor-chunks/d3-selection","vendor-chunks/d3-transition","vendor-chunks/d3-scale-chromatic","vendor-chunks/d3-delaunay","vendor-chunks/d3-time-format","vendor-chunks/d3-brush","vendor-chunks/d3-force","vendor-chunks/d3-zoom","vendor-chunks/d3-color","vendor-chunks/d3-interpolate","vendor-chunks/delaunator","vendor-chunks/d3-time","vendor-chunks/d3-format","vendor-chunks/d3-contour","vendor-chunks/d3-quadtree","vendor-chunks/d3-random","vendor-chunks/d3-chord","vendor-chunks/d3-drag","vendor-chunks/d3-dsv","vendor-chunks/d3-ease","vendor-chunks/d3-axis","vendor-chunks/d3-path","vendor-chunks/d3-timer","vendor-chunks/d3-polygon","vendor-chunks/d3-dispatch","vendor-chunks/d3-fetch","vendor-chunks/internmap","vendor-chunks/d3"], () => (__webpack_require__("(ssr)/./src/workers/forceWorker.ts")))
/******/ 		__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 		return __webpack_exports__;
/******/ 	};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks and sibling chunks for the entrypoint
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/require chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "loaded", otherwise not loaded yet
/******/ 		var installedChunks = {
/******/ 			"_ssr_src_workers_forceWorker_ts": 1
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.O.require = (chunkId) => (installedChunks[chunkId]);
/******/ 		
/******/ 		var installChunk = (chunk) => {
/******/ 			var moreModules = chunk.modules, chunkIds = chunk.ids, runtime = chunk.runtime;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			for(var i = 0; i < chunkIds.length; i++)
/******/ 				installedChunks[chunkIds[i]] = 1;
/******/ 			__webpack_require__.O();
/******/ 		};
/******/ 		
/******/ 		// require() chunk loading for javascript
/******/ 		__webpack_require__.f.require = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					installChunk(require("./" + __webpack_require__.u(chunkId)));
/******/ 				} else installedChunks[chunkId] = 1;
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		// no external install chunk
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/startup chunk dependencies */
/******/ 	(() => {
/******/ 		var next = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			__webpack_require__.e("vendor-chunks/d3-geo");
/******/ 			__webpack_require__.e("vendor-chunks/robust-predicates");
/******/ 			__webpack_require__.e("vendor-chunks/d3-shape");
/******/ 			__webpack_require__.e("vendor-chunks/d3-array");
/******/ 			__webpack_require__.e("vendor-chunks/d3-hierarchy");
/******/ 			__webpack_require__.e("vendor-chunks/d3-scale");
/******/ 			__webpack_require__.e("vendor-chunks/d3-selection");
/******/ 			__webpack_require__.e("vendor-chunks/d3-transition");
/******/ 			__webpack_require__.e("vendor-chunks/d3-scale-chromatic");
/******/ 			__webpack_require__.e("vendor-chunks/d3-delaunay");
/******/ 			__webpack_require__.e("vendor-chunks/d3-time-format");
/******/ 			__webpack_require__.e("vendor-chunks/d3-brush");
/******/ 			__webpack_require__.e("vendor-chunks/d3-force");
/******/ 			__webpack_require__.e("vendor-chunks/d3-zoom");
/******/ 			__webpack_require__.e("vendor-chunks/d3-color");
/******/ 			__webpack_require__.e("vendor-chunks/d3-interpolate");
/******/ 			__webpack_require__.e("vendor-chunks/delaunator");
/******/ 			__webpack_require__.e("vendor-chunks/d3-time");
/******/ 			__webpack_require__.e("vendor-chunks/d3-format");
/******/ 			__webpack_require__.e("vendor-chunks/d3-contour");
/******/ 			__webpack_require__.e("vendor-chunks/d3-quadtree");
/******/ 			__webpack_require__.e("vendor-chunks/d3-random");
/******/ 			__webpack_require__.e("vendor-chunks/d3-chord");
/******/ 			__webpack_require__.e("vendor-chunks/d3-drag");
/******/ 			__webpack_require__.e("vendor-chunks/d3-dsv");
/******/ 			__webpack_require__.e("vendor-chunks/d3-ease");
/******/ 			__webpack_require__.e("vendor-chunks/d3-axis");
/******/ 			__webpack_require__.e("vendor-chunks/d3-path");
/******/ 			__webpack_require__.e("vendor-chunks/d3-timer");
/******/ 			__webpack_require__.e("vendor-chunks/d3-polygon");
/******/ 			__webpack_require__.e("vendor-chunks/d3-dispatch");
/******/ 			__webpack_require__.e("vendor-chunks/d3-fetch");
/******/ 			__webpack_require__.e("vendor-chunks/internmap");
/******/ 			__webpack_require__.e("vendor-chunks/d3");
/******/ 			return next();
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// run startup
/******/ 	var __webpack_exports__ = __webpack_require__.x();
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;