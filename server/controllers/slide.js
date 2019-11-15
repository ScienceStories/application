'use strict';
const getValue = require('../utils').getValue;
const getRandomInt = require('../utils').getRandomInt;
const safeOverwrite = require('../utils').safeOverwrite;
const randomColor = require('randomcolor');

class Slide {
  constructor(name, additional_data) {
    this.name = name; // example: "Grace Hopper"
    this.additional_data = additional_data;
    this._data = {}; //Used to key lookup more efficiently
    this.include_item_statements = true;
    this.include_inverse = false;
  }

  process(){
    return object_to_array(this._data, 'sort_key');
  }
  isValidStatement(statement){
    if (statement.ps_ && statement.ps_Label && statement.ps_Label.value){
      return true;
    }
    return false;
  }
  validateStatement(statement){
    if (this.isValidStatement(statement)){
      let title = statement.ps_Label.value;
      let tempval = {
        qid : statement.ps_.value.replace("http://www.wikidata.org/entity/", ""),
        title: statement.ps_Label.value,
        description: getValue(statement.ps_Description),
        location: getValue(statement.objLocationEntityLabel),
        year: getYearFromStatement(statement),
        image: getValue(statement.img),
        website: getValue(statement.objWebsite),
        logo: getValue(statement.logo),
        qual_prop: false,
        qual_value: false,
        sort_key: false,
      };
      if (!tempval.image){
        tempval.image = getValue(statement.locationImage);
      }
      if (statement.wdpqLabel){
        if (statement.pq_Label){
          tempval.qual_prop = statement.wdpqLabel.value;
          tempval.qual_value = statement.pq_Label.value;
        } else if (statement.pq_) {
          tempval.qual_label = statement.wdpqLabel.value;
          tempval.qual_value = statement.pq_.value;
        }
      }
      tempval.sort_key = tempval.year;
      return tempval;
    }
    return false;
  }
  mergeStatement(qid, statement){
    let tempStatement = (this._data[qid]) ? this._data[qid] : {};
    let overwriteKeys = ['qid', 'title', 'description', 'image', 'logo',
                         'website', 'location', 'sort_key', 'acronym', 'date',
                         'date_range', 'type', 'action', 'instance'];
    safeOverwrite(tempStatement, statement, overwriteKeys);
    if (!tempStatement.quals && statement.qual_value) tempStatement.quals = [{prop:statement.qual_prop, value: statement.qual_value}]
    else if (statement.qual_value && tempStatement.quals.map(e => e.prop.concat(e.value)).indexOf(statement.qual_prop.concat(statement.qual_value)) == -1){
      tempStatement.quals.push({prop:statement.qual_prop, value: statement.qual_value})
    }
    // Take the smallest date to sort
    let new_sort = statement.sort_key;
    if (new_sort){
      tempStatement.sort_key = Math.min(tempStatement.sort_key, new_sort);
    }
    return tempStatement;
  }
  setStatement(input){
    let statement = this.validateStatement(input);
    if (statement){
      let qid = statement.qid;
      this._data[qid] = this.mergeStatement(qid, statement);
    }
    return this._data;
  }

  getSubclasses() {
    const subclasses = [
      WikipediaSlide, IndexSlide];
    return subclasses.map(cls => new cls(this.name, this.additional_data));
  }

  getDynamicSlides(jsonData, wdData, inverseData){
    let slides = this.getSubclasses();
    let itemSlides = slides.filter(cls => cls.include_item_statements == true);
    wdData.map(statement => itemSlides.map(cls => cls.setStatement(statement)));
    let inverseSlides = slides.filter(cls => cls.include_inverse == true);
    inverseData.map(statement =>
      inverseSlides.map(cls => cls.setStatement(statement, true)));
    return slides.reduce((output, slide) => {
        let ctx = slide.storyContext();
        if (ctx) output.push(ctx);
        return output;
    }, jsonData);
  }
}

class NoStatementSlide extends Slide {
  constructor(name, additional_data) {
    super(name, additional_data);
    this.include_item_statements = false;
  }
}


class WikipediaSlide extends NoStatementSlide {
  storyContext(){
    let wiki = this.additional_data.wikipedia_url;
    if (!wiki) return false;
    return {
      "type": "wikipedia",
      "wikipedia": wiki,
      "tooltip": "Wikipedia Article",
      "color": "#8182a0",
    }
  }
}

class IndexSlide extends Slide {
  setStatement(input){
    let url_val = getValue(input.url);
    if (url_val){
      this._data[url_val] = {
        prop: getValue(input.wdLabel),
        url: (input.ps_.type == 'url') ? getValue(input.ps_) : url_val,
        value: getValue(input.ps_Label),
        description: getValue(input.wdDescription)
      };
    }
    if (getValue(input.ref_prop) == 'P854') {
      let ref_url = getValue(input.ref_val);
      if (!this._data[ref_url]) {
        this._data[ref_url] = {
          prop: 'Reference Link',
          url: ref_url,
          value: ref_url,
          description: "This source was used to derive statements made in Wikidata that describe " + this.name
        }
      }
    }
    return this._data;
  }

  storyContext(){
    return {
      "type": "index",
      "content": this._data,
      "tooltip": "Learn More",
      "color": "#ffb97d",
      "name": this.name,
      "row": this.additional_data.row,
      "user": this.additional_data.user
    }
  }
}


function safeAppend(obj, element, key, sort=false){
  let old_val = obj[key];
  let new_val = element[key];
  if (!old_val && new_val) obj[key] = [new_val];
  else if (old_val && new_val && old_val.indexOf(new_val) == -1){
    obj[key].push(new_val);
    if (sort) obj[key].sort();
  }
}

function getYearFromStatement(statement){
  let qual_prop = getValue(statement.wdpq);
  let qual_val = getValue(statement.pq_Label);
  if (qual_prop && qual_val &&
      ((qual_prop == "http://www.wikidata.org/entity/P580")
      || (qual_prop == "http://www.wikidata.org/entity/P582")
      || (qual_prop == "http://www.wikidata.org/entity/P585"))){
    return parseInt(qual_val.substring(0,4), 10)
  }
  return false;
}

function isValidStatement(statement){
  if (statement.ps_ && statement.ps_Label && statement.ps_Label.value){
    return true;
  }
  return false;
}

function object_to_array(obj, sortKey=false, storyData){
  let array = Object.keys(obj).map(key => obj[key]);
  if (!sortKey) return array;
  array.sort((second, first) => {
    if (!first[sortKey]) return 0;
    if (!second[sortKey]) return 1;
    return second[sortKey] - first[sortKey];
  });
  return array;
}

function getYears(birthVal, deathVal){
  if(birthVal){
    let year_string = parseInt(birthVal.substring(0,4), 10) + '-';
    if(deathVal) year_string += parseInt(deathVal.substring(0,4), 10);
    return year_string;
  }
  return null;
}

function wdCoordinatesToArray(point){
  // Example: Point(-77.070795 38.876806)"
  var temp =  JSON.parse( point.substr(point.indexOf('Point'), point.length).substr(5).replace(' ', ',').replace(/\(/g, "[").replace(/\)/g, "]"));
  return [temp[1], temp[0]]
}
module.exports = {Slide};
