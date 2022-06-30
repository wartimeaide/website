// initialize Leaflet
let map = L.map('podcastmap', {
  minZoom: 2,
  maxZoom: 5,
  gestureHandling: true
}).setView({lon: 0, lat: 0}, 2);

// add the OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
  subdomains: 'ab',
  attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
}).addTo(map);

// show the scale bar on the lower left corner
L.control.scale().addTo(map);

const podcastsByRegion = {}

// populate podcasts
for (const podcast of podcasts) {
  for (const region of podcast.regionCodes) {
    if (!podcastsByRegion[region]) podcastsByRegion[region] = []
    podcastsByRegion[region].push(podcast)
  }
}

for (const [regionCode, regionPodcasts] of Object.entries(podcastsByRegion)) {
  const region = regions[regionCode]
  if (!region) console.warn("no geojson path for region", regionCode, "has found in local db")
  const podcastList = regionPodcasts.reduce(
    (prev, curr) => prev += `<li>${curr.title}:
<iframe src="${pinecast.base}${curr.pinecast}?theme=minimal" class="podcast-frame" height="60" width="410"></iframe>
</li>`,
    ""
  )
  const capital = region.demographics.capital || ["(Unknown)"]
  const cca3 = region.demographics.cca3 ? ` (${region.demographics.cca3})` : ""
  L.geoJSON(region.outline)
    .bindPopup(
      L.popup({
        maxWidth: 450,
        closeOnClick: false
      })
        .setContent(`<h1>${region.demographics.flag} ${region.demographics.name.common}${cca3}</h1><h2>Demographics</h2>
        <ul>
          <li>Capital: ${capital.join(', ')}</li>
          <li>Official Name: ${region.demographics.name.official}</li>
          <li>Area: ${region.demographics.area}km²</li>
        </ul>
        <h2>Podcasts</h2>
        <ul>${podcastList}</ul>`)

    )
    .bindTooltip(region.demographics.name.common)
    .addTo(map)
}