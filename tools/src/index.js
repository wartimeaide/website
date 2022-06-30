const axios = require('axios')
const fs = require('fs')
const simplify = require("simplify-geojson");
import { transformSync } from "@babel/core";
import { JSDOM } from 'jsdom';
import path from "path";

const PODCAST_MAP_HTML = path.join(__dirname, '../../themes/forty/layouts/shortcodes/podcastmap.html')
const PODCAST_MAP_JS = path.join(__dirname, './podcastmap.js')

const regionNamesToFind = ["Venezuela", "Ukraine", "Afghanistan", "Sudan", "South Sudan", "Myanmar", "Yemen", "Belize", "Costa Rica", "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Panama", "North Korea", "Iraq", "DR Congo", "Tibet", "Nigeria", "Niger", "Chad", "Cameroon", "Syria"]

async function fetchRegions() {
  const result = {}
  const {data: regions} = await axios.get("https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json")
  for (const name of regionNamesToFind) {
    const region = regions.find(el => el.name.common === name)
    if (!region) {
      console.log('failed to find region for name', name)
      continue
    }
    delete region.name.native
    delete region.translations
    delete region.currencies
    delete region.idd
    delete region.demonyms

    const code = region.cca3.toLowerCase()
    console.log("getting outline for", code)
    const {data: outline} = await axios.get(`https://raw.githubusercontent.com/mledoze/countries/master/data/${code}.geo.json`)

    result[code] = {
      demographics: region,
      outline: simplify(outline, 0.1)
    }
  }

  let regionsString = JSON.stringify(result)
  // replace unicode characters with \u notations
  regionsString = regionsString.replace(/[\u007F-\uFFFF]/g, function(chr) {
    return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
  })
  return regionsString
}

async function replaceDataInHTML(regionsString) {
  const html = fs.readFileSync(PODCAST_MAP_HTML, "utf8");
  const htmlDOM = new JSDOM(html);
  // remove element #wartimeaide-regions, then replace a new one with `const regions = ${regionsString}`
  htmlDOM.window.document.getElementById("wartimeaide-regions")?.remove()
  const regionDataElement = htmlDOM.window.document.createElement("script")
  regionDataElement.id = "wartimeaide-regions"
  regionDataElement.innerHTML = `var regions = ${regionsString}`;
  htmlDOM.window.document.body.appendChild(regionDataElement);

  // transpile JS in `./podcastmap.js` to ES5 for browser compatibility
  const podcastJS = fs.readFileSync(PODCAST_MAP_JS, "utf8");
  const transformedPodcastJS = transformSync(podcastJS, {
    presets: ["@babel/preset-env"],
  }).code;

  // remove element #wartimeaide-map-visualization, then replace a new one with the transpiled JS
  htmlDOM.window.document.getElementById("wartimeaide-map-visualization")?.remove()
  const mapVisualizationElement = htmlDOM.window.document.createElement("script")
  mapVisualizationElement.id = "wartimeaide-map-visualization"
  mapVisualizationElement.innerHTML = transformedPodcastJS;
  htmlDOM.window.document.body.appendChild(mapVisualizationElement);

  // write out the new HTML
  fs.writeFileSync(
    PODCAST_MAP_HTML,
    htmlDOM.window.document.documentElement.outerHTML
  );
}

async function main() {
  return fetchRegions()
    .then(regionsString => {
      replaceDataInHTML(regionsString)
    })
}

main()
  .then(r => console.log("finished"))
