const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: Bun hoists shared deps to the workspace root's node_modules,
// so Metro needs to watch that root and know where to look them up —
// otherwise it crashes resolving hoisted packages ("Unexpectedly escaped traversal").
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});

// Uniwind rewrites `import "react-native"` to its own component wrapper.
// That wrapper reads NativeModules by importing "react-native" again. On
// Windows the wrapper is not recognized as internal, so the import points
// back at itself and NativeModules recurses until the app crashes at startup.
const uniwindRoot = `${path
  .resolve(path.dirname(require.resolve("uniwind/package.json")))
  .replaceAll("/", path.sep)
  .toLowerCase()}${path.sep}`;
const realReactNativePath = require.resolve("react-native/index.js", {
  paths: [projectRoot],
});
const resolveBeforeUniwindFix = uniwindConfig.resolver.resolveRequest;

uniwindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath
    ? path.resolve(context.originModulePath).replaceAll("/", path.sep).toLowerCase()
    : "";

  if (moduleName === "react-native" && origin.startsWith(uniwindRoot)) {
    return { type: "sourceFile", filePath: realReactNativePath };
  }

  if (typeof resolveBeforeUniwindFix === "function") {
    return resolveBeforeUniwindFix(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = uniwindConfig;
