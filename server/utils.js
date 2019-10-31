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
  getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
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
  },
  iterMap(array, map, default_value) {
    // Iterate through array and apply the first value found in the map
    for (let i=0; i < array.length; i++) {
      const key = array[i];
      const value = map[key];
      if (value) return value;
    }
    return (default_value === undefined) ? map.default : default_value;
  }
}
