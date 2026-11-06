// Where a Free user lands from a Pro page: the settings page, whose billing
// section reads the param, tells them why and clears it.
export const UPGRADE_PARAM = "upgrade";
export const UPGRADE_REDIRECT_PATH = `/settings?${UPGRADE_PARAM}=1`;
