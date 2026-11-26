/** The two screens a state is measured on. */
export const VIEWPORTS = [
  { name: "desktop", size: { width: 1280, height: 800 } },
  { name: "phone", size: { width: 375, height: 800 } },
] as const;

export const PHONE = VIEWPORTS[1].size;
