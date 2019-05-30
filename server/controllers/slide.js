'use strict';
const getValue = require('../utils').getValue;
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
        qid : statement.ps_.value,
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
    const subclasses = [CommonsCategorySlide, EducationSlide, EmployerSlide,
      MembershipSlide, TimelineSlide, PeopleSlide, MapSlide, LibrarySlide,
      AwardSlide, WikidataSlide, WikipediaSlide, IndexSlide];
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

class IncludeInverseSlide extends Slide {
  constructor(name, additional_data) {
    super(name, additional_data);
    this.include_inverse = true;
  }
}

class InverseOnlySlide extends IncludeInverseSlide {
  constructor(name, additional_data) {
    super(name, additional_data);
    this.include_item_statements = false;
  }
}

class NoStatementSlide extends Slide {
  constructor(name, additional_data) {
    super(name, additional_data);
    this.include_item_statements = false;
  }
}

class CommonsCategorySlide extends NoStatementSlide {
  storyContext(){
    let cat = this.additional_data.commons_category;
    if (!cat) return false;
    return {
      "type": "wikicat",
      "title": "Media Gallery",
      "category": cat,
      "tooltip": "Wikimedia Gallery",
      "color": "#530244",
    }
  }
}

class WikidataSlide extends NoStatementSlide {
  storyContext(){
    return {
      "type": "wikidata",
      "qid": this.additional_data.qid,
      "tooltip": "Wikidata Statements",
      "color": "#ff8394",
      "name": this.name,
    }
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
      this._data[url_val] = input;
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

class LibrarySlide extends InverseOnlySlide {
  constructor(name, additional_data) {
    super(name, additional_data);
    this._data = {'book': [], 'article': [], 'other': []};
    this.empty = true;
  }

  validateStatement(statement){
    let name = this.name;
    var tempval = {
      qid : false,
      pid : statement.ps.value,
      contribution: [],
      date: false,
      title: false,
      type: 'other',
      instance: [],
      url: false,
    }
    if (statement.datatype.value == "http://wikiba.se/ontology#WikibaseItem"){
      tempval.qid = statement.ps_.value;
      tempval.url = tempval.qid;
    }
    if (statement.objDate){
      tempval.date =  parseInt(statement.objDate.value.substring(0,4), 10)
    }
    if (statement.objInstanceLabel){
      tempval.instance = [statement.objInstanceLabel.value]
    }
    if (statement.website) {
      tempval.url = statement.website.value;
    }
    if (statement.full_work) {
      tempval.url = statement.full_work.value;
    }
    if (statement.handle) {
      tempval.url = 'http://hdl.handle.net/'+statement.handle.value;
    }
    if (statement.doi) {
      tempval.url = 'https://doi.org/'+statement.doi.value;
    }
    if (statement.wdLabel){
      tempval.contribution = [statement.wdLabel.value]
    }
    if (statement.ps_Label){
      tempval.title = statement.ps_Label.value
    }

    if (statement.objInstance){
      // Check if Scholarly article, conference paper, article
      if ((statement.objInstance.value == "http://www.wikidata.org/entity/Q13442814")
      || (statement.objInstance.value == "http://www.wikidata.org/entity/Q23927052")
      || (statement.objInstance.value == "http://www.wikidata.org/entity/Q191067")){
        tempval.type = 'article'
        return tempval
      }
      // Check if book, novel, textbook
      else if ((statement.objInstance.value == "http://www.wikidata.org/entity/Q571")
      || (statement.objInstance.value == "http://www.wikidata.org/entity/Q8261")
      || (statement.objInstance.value == "http://www.wikidata.org/entity/Q83790")){
      tempval.type = 'book'
      return tempval
      }
      // Check if property is "author","editor", "illustrator", "designed by", "developer", "copyright owner", "founder", "creator", "attributed to", "inventor"
      else if ((tempval.pid == "http://www.wikidata.org/prop/statement/P50")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P98")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P110")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P287")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P178")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P3931")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P112")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P170")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P1773")
      || (tempval.pid == "http://www.wikidata.org/prop/statement/P61")
      ){
        tempval.type = 'other'
        return tempval
      }
    }
    return false
  }

  setStatement(input){
    let statement = this.validateStatement(input);
    if (statement){
      let foundLib = false;
      let old_val = this._data[statement.type];
      for (let i = 0; i < old_val.length && !foundLib; i++) {
        let checkOutput = old_val[i];
        if (statement.qid == checkOutput.qid){
          foundLib = true
          checkOutput.date = Math.min(statement.date, checkOutput.date);
          if (!checkOutput.contribution.includes(statement.contribution[0])){
            checkOutput.contribution.concat(statement.contribution)
          }
          if (!checkOutput.instance.includes(statement.instance[0])){
            checkOutput.instance.concat(statement.instance);
          }
        }
      }
      if (!foundLib) this._data[statement.type].push(statement)
      this.empty = false;
    }
  }

  storyContext() {
    if (this.empty) return false;
    return {
      "type": "library",
      "library": this._data,
      "tooltip": "Library of " + this.name,
      "color": "#dc8453",
      "name": this.name,
    }
  }
}

class MapSlide extends IncludeInverseSlide {
  validateStatement(statement, inverse=false){
    let name = this.name;
    var tempval = {
      qid : false,
      pid : statement.ps.value,
      title: false,
      image: false,
      locationImage: false,
      coordinates: false,
      location: false,
    }
    if (statement.datatype.value == "http://wikiba.se/ontology#WikibaseItem"){
      tempval.qid = statement.ps_.value
    }
    if(statement.img && statement.img.value){
      tempval.image = statement.img.value
    }
    if(statement.locationImage && statement.locationImage.value){
      tempval.locationImage = statement.locationImage.value
    }
    if (statement.locationLabel && statement.locationLabel.value) {
      tempval.location = statement.locationLabel.value
    }
    if (statement.ps_Label && statement.ps_Label.value) {
      tempval.location = statement.ps_Label.value
    }

    if (statement.location){
      // Check if birth place
      if (statement.ps.value == "http://www.wikidata.org/prop/statement/P19"){
        tempval.title = name+" was born"
        if (statement.ps_Label.value) {
          tempval.title += " in " +statement.ps_Label.value
        }
        tempval.coordinates = wdCoordinatesToArray(statement.location.value)
        return tempval
      }
      // Check if death place
      if (statement.ps.value == "http://www.wikidata.org/prop/statement/P20"){
        tempval.title = name+" died"
        if (statement.ps_Label.value) {
          tempval.title += " in " +statement.ps_Label.value
        }
        tempval.coordinates = wdCoordinatesToArray(statement.location.value)
        return tempval
      }
      else{
        tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value
        if (inverse) tempval.title = statement.ps_Label.value + " ("+  statement.wdLabel.value + ": "+name+")"
        tempval.coordinates = wdCoordinatesToArray(statement.location.value)
        return tempval
      }
    }
    else if (statement.objLocation){
      tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value
      if (inverse) tempval.title = statement.ps_Label.value + " ("+  statement.wdLabel.value + ": "+name+")"
      tempval.coordinates = wdCoordinatesToArray(statement.objLocation.value)
      return tempval
    }
    return false
  }

  setStatement(input, inverse=false){
    let statement = this.validateStatement(input, inverse);
    if (statement){
      let old_val = this._data[statement.coordinates];
      if(old_val) {
        let foundmap = false;
        for (var i = 0; i < old_val.length; i++) {
          if (old_val[i].title == statement.title) {
            foundmap = true;
            i = old_val.length;
          }
        }
        if (!foundmap) this._data[statement.coordinates].push(statement);
      }
      else this._data[statement.coordinates] = [statement];
    }
  }

  storyContext(){
    if (!Object.keys(this._data).length) return false;
    return {
      "type": "map",
      "map": this._data,
      "tooltip": "Significant Places",
      "color": "rgb(29, 206, 173)",
      "name": this.name,
    }
  }
}

class PeopleSlide extends IncludeInverseSlide {

  validateStatement(statement, inverse=false){
    let name = this.name;
    if (statement.person){
      let tempval = {
        qid: getValue(statement.person),
        pid: getValue(statement.ps),
        title: getValue(statement.personLabel),
        description: getValue(statement.personDescription),
        relation: false,
        image: getValue(statement.personImg),
        qualifier: false,
        date_range: getYears(
                  getValue(statement.personBirth),
                  getValue(statement.personDeath)),
        inverse: inverse
      }
      let person_prop = getValue(statement.personPropLabel);
      let relation_prop = getValue(statement.ps);
      if (relation_prop == "http://www.wikidata.org/prop/statement/P50"){
        let person_prop = getValue(statement.personPropLabel);
        if (person_prop == 'author'){
          tempval.relation = "Co-Author";
        }
      }
      else if (relation_prop == "http://www.wikidata.org/prop/statement/P1029"){
        if (person_prop == 'crew member'){
          tempval.relation = "Crew Member";
          if (inverse && statement.ps_Label){
            tempval.relation += " ("+getValue(statement.ps_Label)+")";
          }
        }
      }
      else if (relation_prop == "http://www.wikidata.org/prop/statement/P112"){
        if (person_prop == 'founded by'){
          tempval.relation = `${tempval.title} co-founded "${getValue(statement.ps_Label)}" with ${name}`;
        }
        else {
          tempval.relation = `${name} founded "${getValue(statement.ps_Label)}" \n ${person_prop}: ${tempval.title}`;
        }
      }
      return tempval;
    }
    if (getValue(statement.objInstance) == "http://www.wikidata.org/entity/Q5"){
      var tempval = {
        qid: statement.ps_.value,
        pid: statement.ps.value,
        title: statement.ps_Label.value,
        description: false,
        relation: false,
        image: false,
        qualifier: false,
        date_range: getYears(
                  getValue(statement.objBirth),
                  getValue(statement.objDeath)),
        inverse: inverse
      }
      if(statement.img && statement.img.value){
        tempval.image = statement.img.value
      }
      if (statement.ps_Label && statement.ps_Label.value) {
        if (inverse) tempval.relation = statement.wdLabel.value + ": "+name
        else tempval.relation = statement.wdLabel.value
      }
      if(statement.ps_Description && statement.ps_Description.value){
        tempval.description = statement.ps_Description.value
      }
      if (statement.wdpqLabel && statement.pq_Label){
        if (inverse) tempval.qualifier = statement.wdpqLabel.value + " (for "+tempval.title+"): " + statement.pq_Label.value
        else tempval.qualifier = statement.wdpqLabel.value + ': ' + statement.pq_Label.value
      }
      return tempval;
    }
    return false;
  }

  setStatement(input, inverse=false){
    let statement = this.validateStatement(input, inverse);
    if (statement){
      let qid = statement.qid;
      let newStatement = this.mergeStatement(qid, statement);
      safeAppend(newStatement, statement, 'relation');
      safeAppend(newStatement, statement, 'qualifier', true);
      this._data[qid] = newStatement
    }
    return this._data;
  }

  storyContext(){
    let data = this.process();
    if (!data.length) return false;
    return {
      "type": "people",
      "people": data,
      "tooltip": "People Relevant to " + this.name,
      "color": "#8d6fe6",
      "name": this.name,
    }
  }
}

class TimelineSlide extends IncludeInverseSlide{

  validateStatement(statement, inverse=false){
    if (this.isValidStatement(statement) && getValue(statement.wdLabel) != "author"){
      // Skip Author Statements (Data is recoreded in the library)
      var tempval = {
        qid : false,
        pid : statement.ps.value,
        date: false,
        title: false,
        image: getValue(statement.img)
      }
      let statement_prop = getValue(statement.ps);
      let statement_val = getValue(statement.ps_);
      let statement_type = getValue(statement.datatype);
      let qual_prop = getValue(statement.wdpq);
      let name = this.name;

      if (statement_type == "http://wikiba.se/ontology#WikibaseItem"){
        tempval.qid = statement_val;
      }
      // Check if birth date
      if (statement_prop == "http://www.wikidata.org/prop/statement/P569"){
        tempval.title = name+" is Born"
        tempval.date = statement_val;
        return tempval
      }
      // Check if death date
      else if (statement_prop == "http://www.wikidata.org/prop/statement/P570"){
        tempval.title = name+" Passes"
        tempval.date = statement_val;
        return tempval
      }
      // Start Time
      else if (qual_prop == "http://www.wikidata.org/entity/P580"){
        tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value + " - Begins"
        if (inverse) tempval.title = statement.ps_Label.value + "- Begins ("+ statement.wdLabel.value + ": "+name+")"
        tempval.date = statement.pq_Label.value;
        return tempval
      }
      // End Time
      else if (qual_prop ==  "http://www.wikidata.org/entity/P582"){
        tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value + " - Ends"
        if (inverse) tempval.title = statement.ps_Label.value + "- Ends ("+ statement.wdLabel.value + ": "+name+")"
        tempval.date = statement.pq_Label.value;
        return tempval
      }
      // Check if point in time
      else if (qual_prop == "http://www.wikidata.org/entity/P585"){
        tempval.title = statement.wdLabel.value + ": " + statement.ps_Label.value
        if (inverse) tempval.title = statement.ps_Label.value + " ("+ statement.wdLabel.value + ": "+name+")"
        tempval.date = statement.pq_Label.value
        return tempval;
      }
      // If datetime value of statement
      else if (statement_type == "http://wikiba.se/ontology#Time"
        || statement.ps_.datatype ==  "http://www.w3.org/2001/XMLSchema#dateTime"){
        tempval.title = statement.wdLabel.value;
        if (inverse) tempval.title = statement.ps_Label.value + " ("+ statement.wdLabel.value + ": "+name+")";
        tempval.date = statement.ps_Label.value;
        return tempval;
      }
      // If datetime value of statement
      else if (statement.objDate){
        tempval.title = statement.wdLabel.value;
        if (inverse) tempval.title = statement.ps_Label.value + " ("+  statement.wdLabel.value + ": "+name+")"
        tempval.date = statement.objDate.value;
        return tempval;
      }
    }
    return false;
  }

  setStatement(input, inverse=false){
    let statement = this.validateStatement(input, inverse);
    if (statement){
      let uuid = String(statement.title) + String(statement.date);
      this._data[uuid] = this.mergeStatement(uuid, statement);
    }
    return this._data;
  }

  storyContext(){
    let data = this.process();
    if (this.additional_data.wikidata_date){
      data.push({
        date: this.additional_data.wikidata_date,
        title: this.name + " Gets Added To Wikidata",
        image: "https://upload.wikimedia.org/wikipedia/commons/6/66/Wikidata-logo-en.svg"
      })
    }
    if (this.additional_data.wikipedia_date){
      data.push({
        date: this.additional_data.wikipedia_date,
        title: this.name + " Gets Added To English Wikipedia",
        image: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Wikipedia-logo-v2-en.svg"
      })
    }
    if (this.additional_data.science_stories_date){
      data.push({
        date: this.additional_data.science_stories_date,
        title: this.name + " Gets a Science Story",
        image: "/static/images/branding/logo_black.png"
      })
    }
    if (!data.length) return false;
    return {
      "type": "timeline",
      "timeline": data,
      "tooltip": "Timeline",
      "color": "#1dc7ce",
      "name": this.name,
    }
  }
}

class EducationSlide extends Slide {
  isValidStatement(statement){
    return (super.isValidStatement(statement) && statement.ps.value == "http://www.wikidata.org/prop/statement/P69")
  }

  validateStatement(statement){
    let validatedStatement = super.validateStatement(statement);
    if (validatedStatement && getValue(statement.wdpq) == "http://www.wikidata.org/entity/P512"){
      validatedStatement.degree = getValue(statement.pq_Label);
    }
    return validatedStatement;
  }

  setStatement(input){
    let statement = this.validateStatement(input);
    if (statement){
      let qid = statement.qid;
      let newStatement = this.mergeStatement(qid, statement);
      safeAppend(newStatement, statement, 'degree');
      safeAppend(newStatement, statement, 'year', true);
      this._data[qid] = newStatement
    }
    return this._data;
  }


  storyContext(){
    let data = this.process();
    if (!data.length) return false;
    return {
      "type": "education",
      "education": data,
      "tooltip": "Education of " + this.name,
      "color": "#337399",
      "name": this.name
    }
  }
}

class EmployerSlide extends Slide {
  isValidStatement(statement){
    return (super.isValidStatement(statement) && statement.ps.value == "http://www.wikidata.org/prop/statement/P108")
  }

  storyContext(){
    let data = this.process();
    if (!data.length) return false;
    return {
      "type": "employer",
      "employer": data,
      "tooltip": "Where " + this.name + " Worked",
      "color": "#91ac99",
      "name": this.name,
    }
  }
}
const award_props = [ "P166", "P825", "P967", "P1411", "P2121", "P4444", "P4622"]
class AwardSlide extends Slide {

  isValidStatement(statement){
    return (super.isValidStatement(statement)
      && award_props.includes(statement.ps.value.substr(39)))
  }

  validateStatement(statement){
    let validatedStatement = super.validateStatement(statement);
    if (validatedStatement){
      validatedStatement.date = getYearFromStatement(statement);
      validatedStatement.instance = getValue(statement.objInstanceLabel);
      let conferred = getValue(statement.conferredLabel);
      validatedStatement.conferred = (conferred) ? [conferred] : [];
      if (getValue(statement.wdpq) == "http://www.wikidata.org/entity/P1027")
        validatedStatement.conferred.push(getValue(statement.pq_Label));
        validatedStatement.action = getValue(statement.wdLabel);
        let objInstance = getValue(statement.objInstance);
        let title = validatedStatement.title.toLowerCase();
        if (validatedStatement.description)
          title += validatedStatement.description.toLowerCase();

        if (title.includes('medal') || objInstance == "http://www.wikidata.org/entity/Q131647"){
          validatedStatement.type = 'medal'
        }
        else if (title.includes('certificate') || objInstance == "http://www.wikidata.org/entity/Q196756"){
          validatedStatement.type = 'certificate'
        }
        else if (title.includes('trophy') ||objInstance == "http://www.wikidata.org/entity/Q381165"){
          validatedStatement.type = 'trophy'
        }
        else if (title.includes('hall of fame') || objInstance == "http://www.wikidata.org/entity/Q1046088"){
          validatedStatement.type = 'hall'
        }
        else if (((title.includes('honor') || title.includes('honour')) && title.includes('docto'))
        || objInstance == "http://www.wikidata.org/entity/Q11415564"){
          validatedStatement.type = 'edu'
        }
        else if (title.includes('award') || objInstance == "http://www.wikidata.org/entity/Q618779"){
          validatedStatement.type = 'award'
        }
    }
    return validatedStatement;
  }

  setStatement(input){
    let statement = this.validateStatement(input);
    if (statement){
      let qid = statement.qid;
      let newStatement = this.mergeStatement(qid, statement);
      newStatement.color_light = randomColor({luminosity: 'light'})
      newStatement.color_dark = randomColor({luminosity: 'dark',
                                             hue: newStatement.color_light})

      if (newStatement.conferred) newStatement.conferred.concat(statement.conferred)
      else newStatement.conferred = statement.conferred;
      this._data[qid] = newStatement;

    }
    return this._data;
  }

  storyContext() {
    let data = this.process();
    if (!data.length) return false;
    return {
      "type": "award",
      "award": data,
      "tooltip": "Award Room",
      "color": "#4c4c4c",
      "name": this.name,
    }
  }
}

class MembershipSlide extends Slide {
  isValidStatement(statement){
    return (super.isValidStatement(statement) && statement.ps.value == "http://www.wikidata.org/prop/statement/P463")
  }

  validateStatement(statement){
    let validatedStatement = super.validateStatement(statement);
    if (validatedStatement){
      validatedStatement.acronym = validatedStatement.title.replace(' of ',' ')
        .replace(' and ', ' ').replace(' the ', ' ').replace(' for ', ' ')
        .match(/\b(\w)/g).join('')
    }
    return validatedStatement;
  }

  process(){
    let data = super.process();
    let BADGE_GRAPHIC_COUNT = 4;
    return data.map((m, index) => {
      m.color_light = randomColor({luminosity: 'light'});
      m.color_dark = randomColor({luminosity: 'dark', hue: m.color_light});
      m.partial = "badge_" + (index % BADGE_GRAPHIC_COUNT);
      return m;
    });
  }

  storyContext(){
    let data = this.process();
    if (!data.length) return false;
    return {
      "type": "membership",
      "membership": data,
      "tooltip": "Organizations",
      "color": "#de8389",
      "name": this.name,
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
