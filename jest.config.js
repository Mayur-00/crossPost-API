import { createDefaultPreset } from "ts-jest";


const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch:['**/__test__/**/*/test.ts'],
  verbose:true,
  forceExit:true,
  // clearMocks:true
};