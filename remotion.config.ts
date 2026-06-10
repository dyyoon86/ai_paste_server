import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setConcurrency(2);
// Keep Chromium happy on headless Windows/CI hosts.
Config.setChromiumOpenGlRenderer("angle");
