// src/assets/images/imageConfig.js
// This file maps icon names to image files
// Once you add images to this folder, they will be used automatically

export const STAT_ICONS = {
  'account-multiple': null,
  'wallet': null,
  'wrench': null,
  'bell': null,
};

export const ACTION_ICONS = {
  'account-plus': null,
  'alert-circle': null,
  'wrench': null,
  'credit-card': null,
};

export const BUILDING_IMAGE = require('./building-illustration.jpg');

export const ANNOUNCEMENT_ICON = null;

// Fallback: Returns image if exists, otherwise returns null (for emoji fallback)
export const getStatIcon = (iconName) => {
  return STAT_ICONS[iconName] || null;
};

export const getActionIcon = (iconName) => {
  return ACTION_ICONS[iconName] || null;
};
