'use strict';
const { FORCE_HTTPS } = process.env;

module.exports = {
  BIBLIOGRAPHY_INSTANCE_TO_ICON_MAP: {
    "book": "fa fa-book",
    "written work": "fa fa-book",
    "literary work": "fa fa-book",
    "report": "far fa-chart-bar",
    "default": "far fa-file-alt"
  },
  FORCE_HTTPS: FORCE_HTTPS === 'true',
};
