This file contains the current status of the configuration requirements in order to determine the slide customization features.

* Intro Slide: `<filename url>  <description text (only if no Wikipedia Page Exists)>`

* Mirador Slide: `<json list of manifest urls & location>`
  - example with local and external resource: `[{ "manifestUri": "api/iiif/manifest/FirstGlossaryProgrammingTerminology.json", "location": "Yale University"}, { "manifestUri": "https://iiif.lib.harvard.edu/manifests/drs:9596592", "location": "Harvard University"}]`


* Timeline Slide: `<SPARQL Query>`

* Youtube Slide: `<url in the embed feature iFrame source> <title> <subtitle/description>`
  - example: `https://www.youtube.com/embed/ZR0ujwlvbkQ  "Grace Hopper at MIT"  "This video is a lecture provided by MIT Lincoln Laboratory"`


* Wikidata Slide: Auto-generated

* Wikipedia Slide: Auto-generated
