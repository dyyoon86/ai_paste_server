import React from "react";
import { Composition } from "remotion";
import { PasteVideo, type VideoProps } from "./Video";
import { defaultPlan } from "./defaultPlan";
import type { RenderPlan } from "./planTypes";

/**
 * Single shared composition. Width/height/fps/duration are derived from the
 * input props' render plan via calculateMetadata, so one composition handles
 * every aspect ratio and length.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PasteVideo"
      component={PasteVideo}
      durationInFrames={defaultPlan.durationInFrames}
      fps={defaultPlan.fps}
      width={defaultPlan.width}
      height={defaultPlan.height}
      defaultProps={{ plan: defaultPlan }}
      calculateMetadata={({ props }) => {
        const plan = props.plan as RenderPlan;
        return {
          durationInFrames: Math.max(1, plan.durationInFrames),
          fps: plan.fps,
          width: plan.width,
          height: plan.height,
        };
      }}
    />
  );
};
