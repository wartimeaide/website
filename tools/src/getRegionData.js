const axios = require('axios')
const fs = require('fs')
const namesToFind = ["Venezuela", "Ukraine", "Afghanistan", "Sudan", "South Sudan", "Myanmar", "Yemen", "Belize", "Costa Rica", "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Panama"]

async function get() {
  const result = {}
  const {data: regions} = await axios.get("https://raw.githubusercontent.com/mledoze/countries/master/dist/countries.json")
  for (const name of namesToFind) {
    const region = regions.find(el => el.name.common === name)
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
      outline
    }
  }

  let out = JSON.stringify(result)
  out = out.replace(/[\u007F-\uFFFF]/g, function(chr) {
    return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4)
  })
  fs.writeFileSync("dist/output.json", out)
}

get()
  .then(r => console.log("finished"))