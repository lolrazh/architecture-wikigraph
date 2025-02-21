"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdate_N_E"]("app/page",{

/***/ "(app-pages-browser)/./src/app/page.tsx":
/*!**************************!*\
  !*** ./src/app/page.tsx ***!
  \**************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": function() { return /* binding */ Home; }\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/jsx-dev-runtime.js\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/index.js\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var d3__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! d3 */ \"(app-pages-browser)/./node_modules/d3/src/index.js\");\n/* __next_internal_client_entry_do_not_use__ default auto */ \nvar _s = $RefreshSig$();\n\n\nfunction denormalizeTitle(title) {\n    return title.replace(/_/g, \" \");\n}\nfunction Home() {\n    _s();\n    const svgRef = (0,react__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);\n    const [isLoading, setIsLoading] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(true);\n    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)(()=>{\n        const fetchData = async ()=>{\n            try {\n                const response = await fetch(\"/graph.json\");\n                const graphData = await response.json();\n                if (!svgRef.current) return;\n                // Clear any existing content\n                d3__WEBPACK_IMPORTED_MODULE_2__.select(svgRef.current).selectAll(\"*\").remove();\n                // Calculate depth for each node using BFS\n                const depthMap = new Map();\n                const queue = [\n                    {\n                        id: \"Architecture\",\n                        depth: 0\n                    }\n                ];\n                depthMap.set(\"Architecture\", 0);\n                while(queue.length > 0){\n                    const current = queue.shift();\n                    const links = graphData.links.filter((l)=>(typeof l.source === \"string\" ? l.source : l.source.id) === current.id);\n                    for (const link of links){\n                        const targetId = typeof link.target === \"string\" ? link.target : link.target.id;\n                        if (!depthMap.has(targetId)) {\n                            depthMap.set(targetId, current.depth + 1);\n                            queue.push({\n                                id: targetId,\n                                depth: current.depth + 1\n                            });\n                        }\n                    }\n                }\n                // Add depth to nodes\n                graphData.nodes.forEach((node)=>{\n                    node.depth = depthMap.get(node.id) || 0;\n                });\n                const width = 800;\n                const height = 600;\n                // Create SVG\n                const svg = d3__WEBPACK_IMPORTED_MODULE_2__.select(svgRef.current).attr(\"width\", width).attr(\"height\", height).attr(\"class\", \"bg-black\");\n                // Add zoom functionality\n                const g = svg.append(\"g\");\n                svg.call(d3__WEBPACK_IMPORTED_MODULE_2__.zoom().extent([\n                    [\n                        0,\n                        0\n                    ],\n                    [\n                        width,\n                        height\n                    ]\n                ]).scaleExtent([\n                    0.1,\n                    4\n                ]).on(\"zoom\", (event)=>{\n                    g.attr(\"transform\", event.transform);\n                }));\n                // Color scale for depth\n                const colorScale = d3__WEBPACK_IMPORTED_MODULE_2__.scaleSequential().domain([\n                    0,\n                    2\n                ]).interpolator(d3__WEBPACK_IMPORTED_MODULE_2__.interpolateViridis);\n                // Create force simulation\n                const simulation = d3__WEBPACK_IMPORTED_MODULE_2__.forceSimulation(graphData.nodes).force(\"link\", d3__WEBPACK_IMPORTED_MODULE_2__.forceLink(graphData.links).id((d)=>d.id).distance(100)).force(\"charge\", d3__WEBPACK_IMPORTED_MODULE_2__.forceManyBody().strength(-500)).force(\"center\", d3__WEBPACK_IMPORTED_MODULE_2__.forceCenter(width / 2, height / 2)).force(\"collision\", d3__WEBPACK_IMPORTED_MODULE_2__.forceCollide().radius(30));\n                // Create links\n                const links = g.append(\"g\").selectAll(\"line\").data(graphData.links).join(\"line\").attr(\"stroke\", \"#2a4858\").attr(\"stroke-opacity\", 0.4).attr(\"stroke-width\", 1);\n                // Create nodes\n                const nodes = g.append(\"g\").selectAll(\"g\").data(graphData.nodes).join(\"g\").call(d3__WEBPACK_IMPORTED_MODULE_2__.drag().on(\"start\", (event, d)=>{\n                    if (!event.active) simulation.alphaTarget(0.3).restart();\n                    d.fx = d.x;\n                    d.fy = d.y;\n                }).on(\"drag\", (event, d)=>{\n                    d.fx = event.x;\n                    d.fy = event.y;\n                }).on(\"end\", (event, d)=>{\n                    if (!event.active) simulation.alphaTarget(0);\n                    d.fx = null;\n                    d.fy = null;\n                }));\n                // Add circles to nodes\n                nodes.append(\"circle\").attr(\"r\", (d)=>d.id === \"Architecture\" ? 8 : 5).attr(\"fill\", (d)=>colorScale(d.depth || 0)).attr(\"stroke\", \"#fff\").attr(\"stroke-width\", 0.5);\n                // Add labels to nodes\n                nodes.append(\"text\").text((d)=>{\n                    const displayTitle = denormalizeTitle(d.id);\n                    const words = displayTitle.split(/(?=[A-Z])/);\n                    return words.length > 2 ? words.slice(0, 2).join(\"\") + \"...\" : displayTitle;\n                }).attr(\"x\", 8).attr(\"y\", 3).attr(\"fill\", \"#fff\").attr(\"font-size\", \"10px\").attr(\"font-family\", \"Space Mono\").style(\"pointer-events\", \"none\");\n                // Add title for hover tooltip\n                nodes.append(\"title\").text((d)=>\"\".concat(denormalizeTitle(d.id), \"\\nDepth: \").concat(d.depth));\n                // Add click handler to open Wikipedia page\n                nodes.on(\"click\", (event, d)=>{\n                    const title = denormalizeTitle(d.id);\n                    window.open(\"https://en.wikipedia.org/wiki/\".concat(encodeURIComponent(title)), \"_blank\");\n                });\n                // Update positions on each tick\n                simulation.on(\"tick\", ()=>{\n                    links.attr(\"x1\", (d)=>d.source.x).attr(\"y1\", (d)=>d.source.y).attr(\"x2\", (d)=>d.target.x).attr(\"y2\", (d)=>d.target.y);\n                    nodes.attr(\"transform\", (d)=>\"translate(\".concat(d.x, \",\").concat(d.y, \")\"));\n                });\n                setIsLoading(false);\n            } catch (error) {\n                console.error(\"Error loading graph data:\", error);\n                setIsLoading(false);\n            }\n        };\n        fetchData();\n    }, []);\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"main\", {\n        className: \"flex min-h-screen flex-col items-center p-24 bg-black text-gray-200\",\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h1\", {\n                className: \"text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400\",\n                children: \"Wikipedia Hyperlink Graph\"\n            }, void 0, false, {\n                fileName: \"D:\\\\Projects\\\\2025\\\\architecture-wikigraph\\\\src\\\\app\\\\page.tsx\",\n                lineNumber: 187,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"relative w-[800px] h-[600px] border border-gray-800 rounded-lg bg-black\",\n                children: [\n                    isLoading && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                        className: \"absolute inset-0 flex items-center justify-center\",\n                        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"text-gray-400\",\n                            children: \"Loading graph data...\"\n                        }, void 0, false, {\n                            fileName: \"D:\\\\Projects\\\\2025\\\\architecture-wikigraph\\\\src\\\\app\\\\page.tsx\",\n                            lineNumber: 193,\n                            columnNumber: 13\n                        }, this)\n                    }, void 0, false, {\n                        fileName: \"D:\\\\Projects\\\\2025\\\\architecture-wikigraph\\\\src\\\\app\\\\page.tsx\",\n                        lineNumber: 192,\n                        columnNumber: 11\n                    }, this),\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"svg\", {\n                        ref: svgRef,\n                        className: \"w-full h-full\"\n                    }, void 0, false, {\n                        fileName: \"D:\\\\Projects\\\\2025\\\\architecture-wikigraph\\\\src\\\\app\\\\page.tsx\",\n                        lineNumber: 196,\n                        columnNumber: 9\n                    }, this)\n                ]\n            }, void 0, true, {\n                fileName: \"D:\\\\Projects\\\\2025\\\\architecture-wikigraph\\\\src\\\\app\\\\page.tsx\",\n                lineNumber: 190,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"mt-4 text-sm text-gray-400 space-y-2\",\n                children: [\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"p\", {\n                        children: \"Click on any node to visit the corresponding Wikipedia page\"\n                    }, void 0, false, {\n                        fileName: \"D:\\\\Projects\\\\2025\\\\architecture-wikigraph\\\\src\\\\app\\\\page.tsx\",\n                        lineNumber: 199,\n                        columnNumber: 9\n                    }, this),\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"p\", {\n                        children: \"Drag nodes to rearrange • Scroll to zoom • Node color indicates depth from root\"\n                    }, void 0, false, {\n                        fileName: \"D:\\\\Projects\\\\2025\\\\architecture-wikigraph\\\\src\\\\app\\\\page.tsx\",\n                        lineNumber: 200,\n                        columnNumber: 9\n                    }, this)\n                ]\n            }, void 0, true, {\n                fileName: \"D:\\\\Projects\\\\2025\\\\architecture-wikigraph\\\\src\\\\app\\\\page.tsx\",\n                lineNumber: 198,\n                columnNumber: 7\n            }, this)\n        ]\n    }, void 0, true, {\n        fileName: \"D:\\\\Projects\\\\2025\\\\architecture-wikigraph\\\\src\\\\app\\\\page.tsx\",\n        lineNumber: 186,\n        columnNumber: 5\n    }, this);\n}\n_s(Home, \"JAphPLNbXSt8DXvSQEcOTT2wthk=\");\n_c = Home;\nvar _c;\n$RefreshReg$(_c, \"Home\");\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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O0FBSVg7R0EvS3dCekY7S0FBQUEiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vc3JjL2FwcC9wYWdlLnRzeD9mNjhhIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2UgY2xpZW50JztcclxuXHJcbmltcG9ydCBSZWFjdCwgeyB1c2VFZmZlY3QsIHVzZVJlZiwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCAqIGFzIGQzIGZyb20gJ2QzJztcclxuXHJcbmludGVyZmFjZSBOb2RlIGV4dGVuZHMgZDMuU2ltdWxhdGlvbk5vZGVEYXR1bSB7XHJcbiAgaWQ6IHN0cmluZztcclxuICB4PzogbnVtYmVyO1xyXG4gIHk/OiBudW1iZXI7XHJcbiAgZng/OiBudW1iZXIgfCBudWxsO1xyXG4gIGZ5PzogbnVtYmVyIHwgbnVsbDtcclxuICBkZXB0aD86IG51bWJlcjtcclxufVxyXG5cclxuaW50ZXJmYWNlIExpbmsge1xyXG4gIHNvdXJjZTogc3RyaW5nIHwgTm9kZTtcclxuICB0YXJnZXQ6IHN0cmluZyB8IE5vZGU7XHJcbn1cclxuXHJcbmludGVyZmFjZSBHcmFwaERhdGEge1xyXG4gIG5vZGVzOiBOb2RlW107XHJcbiAgbGlua3M6IExpbmtbXTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGVub3JtYWxpemVUaXRsZSh0aXRsZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICByZXR1cm4gdGl0bGUucmVwbGFjZSgvXy9nLCAnICcpO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBIb21lKCkge1xyXG4gIGNvbnN0IHN2Z1JlZiA9IHVzZVJlZjxTVkdTVkdFbGVtZW50PihudWxsKTtcclxuICBjb25zdCBbaXNMb2FkaW5nLCBzZXRJc0xvYWRpbmddID0gdXNlU3RhdGUodHJ1ZSk7XHJcblxyXG4gIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICBjb25zdCBmZXRjaERhdGEgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnL2dyYXBoLmpzb24nKTtcclxuICAgICAgICBjb25zdCBncmFwaERhdGE6IEdyYXBoRGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoIXN2Z1JlZi5jdXJyZW50KSByZXR1cm47XHJcblxyXG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBjb250ZW50XHJcbiAgICAgICAgZDMuc2VsZWN0KHN2Z1JlZi5jdXJyZW50KS5zZWxlY3RBbGwoXCIqXCIpLnJlbW92ZSgpO1xyXG5cclxuICAgICAgICAvLyBDYWxjdWxhdGUgZGVwdGggZm9yIGVhY2ggbm9kZSB1c2luZyBCRlNcclxuICAgICAgICBjb25zdCBkZXB0aE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcbiAgICAgICAgY29uc3QgcXVldWUgPSBbeyBpZDogXCJBcmNoaXRlY3R1cmVcIiwgZGVwdGg6IDAgfV07XHJcbiAgICAgICAgZGVwdGhNYXAuc2V0KFwiQXJjaGl0ZWN0dXJlXCIsIDApO1xyXG5cclxuICAgICAgICB3aGlsZSAocXVldWUubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgY29uc3QgY3VycmVudCA9IHF1ZXVlLnNoaWZ0KCkhO1xyXG4gICAgICAgICAgY29uc3QgbGlua3MgPSBncmFwaERhdGEubGlua3MuZmlsdGVyKGwgPT4gXHJcbiAgICAgICAgICAgICh0eXBlb2YgbC5zb3VyY2UgPT09ICdzdHJpbmcnID8gbC5zb3VyY2UgOiBsLnNvdXJjZS5pZCkgPT09IGN1cnJlbnQuaWRcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGZvciAoY29uc3QgbGluayBvZiBsaW5rcykge1xyXG4gICAgICAgICAgICBjb25zdCB0YXJnZXRJZCA9IHR5cGVvZiBsaW5rLnRhcmdldCA9PT0gJ3N0cmluZycgPyBsaW5rLnRhcmdldCA6IGxpbmsudGFyZ2V0LmlkO1xyXG4gICAgICAgICAgICBpZiAoIWRlcHRoTWFwLmhhcyh0YXJnZXRJZCkpIHtcclxuICAgICAgICAgICAgICBkZXB0aE1hcC5zZXQodGFyZ2V0SWQsIGN1cnJlbnQuZGVwdGggKyAxKTtcclxuICAgICAgICAgICAgICBxdWV1ZS5wdXNoKHsgaWQ6IHRhcmdldElkLCBkZXB0aDogY3VycmVudC5kZXB0aCArIDEgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEFkZCBkZXB0aCB0byBub2Rlc1xyXG4gICAgICAgIGdyYXBoRGF0YS5ub2Rlcy5mb3JFYWNoKG5vZGUgPT4ge1xyXG4gICAgICAgICAgbm9kZS5kZXB0aCA9IGRlcHRoTWFwLmdldChub2RlLmlkKSB8fCAwO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCB3aWR0aCA9IDgwMDtcclxuICAgICAgICBjb25zdCBoZWlnaHQgPSA2MDA7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQ3JlYXRlIFNWR1xyXG4gICAgICAgIGNvbnN0IHN2ZyA9IGQzLnNlbGVjdChzdmdSZWYuY3VycmVudClcclxuICAgICAgICAgIC5hdHRyKCd3aWR0aCcsIHdpZHRoKVxyXG4gICAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGhlaWdodClcclxuICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdiZy1ibGFjaycpO1xyXG5cclxuICAgICAgICAvLyBBZGQgem9vbSBmdW5jdGlvbmFsaXR5XHJcbiAgICAgICAgY29uc3QgZyA9IHN2Zy5hcHBlbmQoJ2cnKTtcclxuICAgICAgICBzdmcuY2FsbChcclxuICAgICAgICAgIGQzLnpvb208U1ZHU1ZHRWxlbWVudCwgdW5rbm93bj4oKVxyXG4gICAgICAgICAgICAuZXh0ZW50KFtbMCwgMF0sIFt3aWR0aCwgaGVpZ2h0XV0pXHJcbiAgICAgICAgICAgIC5zY2FsZUV4dGVudChbMC4xLCA0XSlcclxuICAgICAgICAgICAgLm9uKCd6b29tJywgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgZy5hdHRyKCd0cmFuc2Zvcm0nLCBldmVudC50cmFuc2Zvcm0pO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIENvbG9yIHNjYWxlIGZvciBkZXB0aFxyXG4gICAgICAgIGNvbnN0IGNvbG9yU2NhbGUgPSBkMy5zY2FsZVNlcXVlbnRpYWwoKVxyXG4gICAgICAgICAgLmRvbWFpbihbMCwgMl0pXHJcbiAgICAgICAgICAuaW50ZXJwb2xhdG9yKGQzLmludGVycG9sYXRlVmlyaWRpcyk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBmb3JjZSBzaW11bGF0aW9uXHJcbiAgICAgICAgY29uc3Qgc2ltdWxhdGlvbiA9IGQzLmZvcmNlU2ltdWxhdGlvbjxOb2RlPihncmFwaERhdGEubm9kZXMpXHJcbiAgICAgICAgICAuZm9yY2UoJ2xpbmsnLCBkMy5mb3JjZUxpbms8Tm9kZSwgTGluaz4oZ3JhcGhEYXRhLmxpbmtzKVxyXG4gICAgICAgICAgICAuaWQoZCA9PiBkLmlkKVxyXG4gICAgICAgICAgICAuZGlzdGFuY2UoMTAwKSlcclxuICAgICAgICAgIC5mb3JjZSgnY2hhcmdlJywgZDMuZm9yY2VNYW55Qm9keSgpLnN0cmVuZ3RoKC01MDApKVxyXG4gICAgICAgICAgLmZvcmNlKCdjZW50ZXInLCBkMy5mb3JjZUNlbnRlcih3aWR0aCAvIDIsIGhlaWdodCAvIDIpKVxyXG4gICAgICAgICAgLmZvcmNlKCdjb2xsaXNpb24nLCBkMy5mb3JjZUNvbGxpZGUoKS5yYWRpdXMoMzApKTtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIGxpbmtzXHJcbiAgICAgICAgY29uc3QgbGlua3MgPSBnLmFwcGVuZCgnZycpXHJcbiAgICAgICAgICAuc2VsZWN0QWxsKCdsaW5lJylcclxuICAgICAgICAgIC5kYXRhKGdyYXBoRGF0YS5saW5rcylcclxuICAgICAgICAgIC5qb2luKCdsaW5lJylcclxuICAgICAgICAgIC5hdHRyKCdzdHJva2UnLCAnIzJhNDg1OCcpXHJcbiAgICAgICAgICAuYXR0cignc3Ryb2tlLW9wYWNpdHknLCAwLjQpXHJcbiAgICAgICAgICAuYXR0cignc3Ryb2tlLXdpZHRoJywgMSk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBub2Rlc1xyXG4gICAgICAgIGNvbnN0IG5vZGVzID0gZy5hcHBlbmQoJ2cnKVxyXG4gICAgICAgICAgLnNlbGVjdEFsbDxTVkdHRWxlbWVudCwgTm9kZT4oJ2cnKVxyXG4gICAgICAgICAgLmRhdGEoZ3JhcGhEYXRhLm5vZGVzKVxyXG4gICAgICAgICAgLmpvaW4oJ2cnKVxyXG4gICAgICAgICAgLmNhbGwoZDMuZHJhZzxTVkdHRWxlbWVudCwgTm9kZT4oKVxyXG4gICAgICAgICAgICAub24oJ3N0YXJ0JywgKGV2ZW50LCBkKSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKCFldmVudC5hY3RpdmUpIHNpbXVsYXRpb24uYWxwaGFUYXJnZXQoMC4zKS5yZXN0YXJ0KCk7XHJcbiAgICAgICAgICAgICAgZC5meCA9IGQueDtcclxuICAgICAgICAgICAgICBkLmZ5ID0gZC55O1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAub24oJ2RyYWcnLCAoZXZlbnQsIGQpID0+IHtcclxuICAgICAgICAgICAgICBkLmZ4ID0gZXZlbnQueDtcclxuICAgICAgICAgICAgICBkLmZ5ID0gZXZlbnQueTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLm9uKCdlbmQnLCAoZXZlbnQsIGQpID0+IHtcclxuICAgICAgICAgICAgICBpZiAoIWV2ZW50LmFjdGl2ZSkgc2ltdWxhdGlvbi5hbHBoYVRhcmdldCgwKTtcclxuICAgICAgICAgICAgICBkLmZ4ID0gbnVsbDtcclxuICAgICAgICAgICAgICBkLmZ5ID0gbnVsbDtcclxuICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICAvLyBBZGQgY2lyY2xlcyB0byBub2Rlc1xyXG4gICAgICAgIG5vZGVzLmFwcGVuZCgnY2lyY2xlJylcclxuICAgICAgICAgIC5hdHRyKCdyJywgZCA9PiBkLmlkID09PSBcIkFyY2hpdGVjdHVyZVwiID8gOCA6IDUpXHJcbiAgICAgICAgICAuYXR0cignZmlsbCcsIGQgPT4gY29sb3JTY2FsZShkLmRlcHRoIHx8IDApKVxyXG4gICAgICAgICAgLmF0dHIoJ3N0cm9rZScsICcjZmZmJylcclxuICAgICAgICAgIC5hdHRyKCdzdHJva2Utd2lkdGgnLCAwLjUpO1xyXG5cclxuICAgICAgICAvLyBBZGQgbGFiZWxzIHRvIG5vZGVzXHJcbiAgICAgICAgbm9kZXMuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAgIC50ZXh0KGQgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBkaXNwbGF5VGl0bGUgPSBkZW5vcm1hbGl6ZVRpdGxlKGQuaWQpO1xyXG4gICAgICAgICAgICBjb25zdCB3b3JkcyA9IGRpc3BsYXlUaXRsZS5zcGxpdCgvKD89W0EtWl0pLyk7XHJcbiAgICAgICAgICAgIHJldHVybiB3b3Jkcy5sZW5ndGggPiAyID8gd29yZHMuc2xpY2UoMCwgMikuam9pbignJykgKyAnLi4uJyA6IGRpc3BsYXlUaXRsZTtcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICAuYXR0cigneCcsIDgpXHJcbiAgICAgICAgICAuYXR0cigneScsIDMpXHJcbiAgICAgICAgICAuYXR0cignZmlsbCcsICcjZmZmJylcclxuICAgICAgICAgIC5hdHRyKCdmb250LXNpemUnLCAnMTBweCcpXHJcbiAgICAgICAgICAuYXR0cignZm9udC1mYW1pbHknLCAnU3BhY2UgTW9ubycpXHJcbiAgICAgICAgICAuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKTtcclxuXHJcbiAgICAgICAgLy8gQWRkIHRpdGxlIGZvciBob3ZlciB0b29sdGlwXHJcbiAgICAgICAgbm9kZXMuYXBwZW5kKCd0aXRsZScpXHJcbiAgICAgICAgICAudGV4dChkID0+IGAke2Rlbm9ybWFsaXplVGl0bGUoZC5pZCl9XFxuRGVwdGg6ICR7ZC5kZXB0aH1gKTtcclxuXHJcbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgdG8gb3BlbiBXaWtpcGVkaWEgcGFnZVxyXG4gICAgICAgIG5vZGVzLm9uKCdjbGljaycsIChldmVudCwgZCkgPT4ge1xyXG4gICAgICAgICAgY29uc3QgdGl0bGUgPSBkZW5vcm1hbGl6ZVRpdGxlKGQuaWQpO1xyXG4gICAgICAgICAgd2luZG93Lm9wZW4oYGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpLyR7ZW5jb2RlVVJJQ29tcG9uZW50KHRpdGxlKX1gLCAnX2JsYW5rJyk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFVwZGF0ZSBwb3NpdGlvbnMgb24gZWFjaCB0aWNrXHJcbiAgICAgICAgc2ltdWxhdGlvbi5vbigndGljaycsICgpID0+IHtcclxuICAgICAgICAgIGxpbmtzXHJcbiAgICAgICAgICAgIC5hdHRyKCd4MScsIGQgPT4gKGQuc291cmNlIGFzIE5vZGUpLnghKVxyXG4gICAgICAgICAgICAuYXR0cigneTEnLCBkID0+IChkLnNvdXJjZSBhcyBOb2RlKS55ISlcclxuICAgICAgICAgICAgLmF0dHIoJ3gyJywgZCA9PiAoZC50YXJnZXQgYXMgTm9kZSkueCEpXHJcbiAgICAgICAgICAgIC5hdHRyKCd5MicsIGQgPT4gKGQudGFyZ2V0IGFzIE5vZGUpLnkhKTtcclxuXHJcbiAgICAgICAgICBub2Rlcy5hdHRyKCd0cmFuc2Zvcm0nLCBkID0+IGB0cmFuc2xhdGUoJHtkLnh9LCR7ZC55fSlgKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc2V0SXNMb2FkaW5nKGZhbHNlKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIGdyYXBoIGRhdGE6JywgZXJyb3IpO1xyXG4gICAgICAgIHNldElzTG9hZGluZyhmYWxzZSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgZmV0Y2hEYXRhKCk7XHJcbiAgfSwgW10pO1xyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPG1haW4gY2xhc3NOYW1lPVwiZmxleCBtaW4taC1zY3JlZW4gZmxleC1jb2wgaXRlbXMtY2VudGVyIHAtMjQgYmctYmxhY2sgdGV4dC1ncmF5LTIwMFwiPlxyXG4gICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC00eGwgZm9udC1ib2xkIG1iLTggdGV4dC10cmFuc3BhcmVudCBiZy1jbGlwLXRleHQgYmctZ3JhZGllbnQtdG8tciBmcm9tLWJsdWUtNDAwIHRvLXZpb2xldC00MDBcIj5cclxuICAgICAgICBXaWtpcGVkaWEgSHlwZXJsaW5rIEdyYXBoXHJcbiAgICAgIDwvaDE+XHJcbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmUgdy1bODAwcHhdIGgtWzYwMHB4XSBib3JkZXIgYm9yZGVyLWdyYXktODAwIHJvdW5kZWQtbGcgYmctYmxhY2tcIj5cclxuICAgICAgICB7aXNMb2FkaW5nICYmIChcclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlclwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInRleHQtZ3JheS00MDBcIj5Mb2FkaW5nIGdyYXBoIGRhdGEuLi48L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICl9XHJcbiAgICAgICAgPHN2ZyByZWY9e3N2Z1JlZn0gY2xhc3NOYW1lPVwidy1mdWxsIGgtZnVsbFwiIC8+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTQgdGV4dC1zbSB0ZXh0LWdyYXktNDAwIHNwYWNlLXktMlwiPlxyXG4gICAgICAgIDxwPkNsaWNrIG9uIGFueSBub2RlIHRvIHZpc2l0IHRoZSBjb3JyZXNwb25kaW5nIFdpa2lwZWRpYSBwYWdlPC9wPlxyXG4gICAgICAgIDxwPkRyYWcgbm9kZXMgdG8gcmVhcnJhbmdlIOKAoiBTY3JvbGwgdG8gem9vbSDigKIgTm9kZSBjb2xvciBpbmRpY2F0ZXMgZGVwdGggZnJvbSByb290PC9wPlxyXG4gICAgICA8L2Rpdj5cclxuICAgIDwvbWFpbj5cclxuICApO1xyXG59ICJdLCJuYW1lcyI6WyJSZWFjdCIsInVzZUVmZmVjdCIsInVzZVJlZiIsInVzZVN0YXRlIiwiZDMiLCJkZW5vcm1hbGl6ZVRpdGxlIiwidGl0bGUiLCJyZXBsYWNlIiwiSG9tZSIsInN2Z1JlZiIsImlzTG9hZGluZyIsInNldElzTG9hZGluZyIsImZldGNoRGF0YSIsInJlc3BvbnNlIiwiZmV0Y2giLCJncmFwaERhdGEiLCJqc29uIiwiY3VycmVudCIsInNlbGVjdCIsInNlbGVjdEFsbCIsInJlbW92ZSIsImRlcHRoTWFwIiwiTWFwIiwicXVldWUiLCJpZCIsImRlcHRoIiwic2V0IiwibGVuZ3RoIiwic2hpZnQiLCJsaW5rcyIsImZpbHRlciIsImwiLCJzb3VyY2UiLCJsaW5rIiwidGFyZ2V0SWQiLCJ0YXJnZXQiLCJoYXMiLCJwdXNoIiwibm9kZXMiLCJmb3JFYWNoIiwibm9kZSIsImdldCIsIndpZHRoIiwiaGVpZ2h0Iiwic3ZnIiwiYXR0ciIsImciLCJhcHBlbmQiLCJjYWxsIiwiem9vbSIsImV4dGVudCIsInNjYWxlRXh0ZW50Iiwib24iLCJldmVudCIsInRyYW5zZm9ybSIsImNvbG9yU2NhbGUiLCJzY2FsZVNlcXVlbnRpYWwiLCJkb21haW4iLCJpbnRlcnBvbGF0b3IiLCJpbnRlcnBvbGF0ZVZpcmlkaXMiLCJzaW11bGF0aW9uIiwiZm9yY2VTaW11bGF0aW9uIiwiZm9yY2UiLCJmb3JjZUxpbmsiLCJkIiwiZGlzdGFuY2UiLCJmb3JjZU1hbnlCb2R5Iiwic3RyZW5ndGgiLCJmb3JjZUNlbnRlciIsImZvcmNlQ29sbGlkZSIsInJhZGl1cyIsImRhdGEiLCJqb2luIiwiZHJhZyIsImFjdGl2ZSIsImFscGhhVGFyZ2V0IiwicmVzdGFydCIsImZ4IiwieCIsImZ5IiwieSIsInRleHQiLCJkaXNwbGF5VGl0bGUiLCJ3b3JkcyIsInNwbGl0Iiwic2xpY2UiLCJzdHlsZSIsIndpbmRvdyIsIm9wZW4iLCJlbmNvZGVVUklDb21wb25lbnQiLCJlcnJvciIsImNvbnNvbGUiLCJtYWluIiwiY2xhc3NOYW1lIiwiaDEiLCJkaXYiLCJyZWYiLCJwIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./src/app/page.tsx\n"));

/***/ })

});