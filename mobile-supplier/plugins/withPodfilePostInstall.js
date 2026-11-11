const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withPodfilePostInstall(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfilePath, "utf-8");
      const insertion = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "15.1"
      end
    end
`;
      if (!contents.includes("IPHONEOS_DEPLOYMENT_TARGET\"] = \"15.1\"")) {
        contents = contents.replace(/post_install do \|installer\|/, `post_install do |installer|\n${insertion}`);
        fs.writeFileSync(podfilePath, contents);
      }
      return config;
    },
  ]);
};