const fs = require('fs');

module.exports = {
  safeOverwrite(obj, overwrite_obj, keys=false){
    if (!keys && !obj && overwrite_obj) obj = overwrite_obj;
    else if(keys){
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (key && !obj[key] && overwrite_obj[key]) obj[key] = overwrite_obj[key];
      }
    }
  },
  getValue(obj){
    if (obj && obj.value) return obj.value;
    else return null;
  },
  JSONFile(path){
    try {
      return JSON.parse(fs.readFileSync(path));
    }
    catch (err) { 
      return null;
    }
  }
}
