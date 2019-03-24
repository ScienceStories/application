const pyshellrunner = require('python-shell').PythonShell.run;
const appFetch =  require('../../app').appFetch;
const getURLPath =  require('../../app').getURLPath;
const sparqlController = require('./sparql');

module.exports = {
  getManifestURL(req, qid){
    return getURLPath(req, '/api/iiif/'+qid+'/wikicat/manifest.json');
  },
  generateCommonsCategoryManifest(req, res){
    let scriptName = 'wikidataToCommonsManifest.py';
    let pyoptions = {
      pythonPath: process.env.PYPATH,
      scriptPath: './pyscripts',
      args: [req.params.category, getURLPath(req, req.path)]
    };
    return pyshellrunner(scriptName, pyoptions, (err, results) => {
      if (err){
        return res.send({"status": "server error"});
      }
      let manifestJSON = JSON.parse(results);
      return res.send(manifestJSON);
    });
  },
  generateCommonsManifestFromWikidataItem(req, res){
    let qid = req.params.qid;
    let query_url = sparqlController.getCommonsCategory(qid);
    return appFetch(query_url).then(output => {
      let val = output.results.bindings;
      if (val.length && val[0].commonsCat){
        req.params.category = val[0].commonsCat.value;
        return module.exports.generateCommonsCategoryManifest(req, res);
      }
      return res.send({'status': 'No commons category detected for this item'})
    });
  },
};
