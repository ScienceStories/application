var wikidataAnnotationSet = {}
function convertAnnotations(){
$('.mirador-viewer .all-annotations .text-viewer p:not(.converted)').each(function() {
  $( this ).addClass( "converted" );
  pretext = $( this ).text().match(/wdAnnotation\(([^)]+)\)/)
  if (pretext && pretext.length > 0){
    annoQid = pretext[1];
    console.log('found: '+annoQid)
    var annotationHtml =  wikidataAnnotationSet[annoQid];
    if ( annotationHtml ){
      return $( this ).html(annotationHtml);
    }
    else{
      elem = this
      // var wikipedia_api = `http://en.wikipedia.org/w/api.php?action=parse&format=json&prop=text&page=${wikititle}&callback=?`
      // var wikipedia_link = `https://en.wikipedia.org/wiki/${wikititle}`
      $.getJSON( `/api/wd/annotation/${annoQid}`, function( data ) {
      console.log(data)

      // Header
      annotationHtml = `
      <div class="wdAntn">
        <div class="wdAntn-header"> ${data.label} <i class="fa ${data.icon} pull-right"></i></div>
      `
      // image
      if (data.image.length){
        annotationHtml += `<div class="wdAntn-image"><img src="${data.image}"></div>`
      }
      if (data.summary.length){
        annotationHtml += `<div class="wdAntn-section-header"> Who is this? </div>
        <div class="wdAntn-description">${data.summary}</div>`
      }
      if (data.facts){
        facts = data.facts
        annotationHtml += `<div class="wdAntn-section-header"> Quick Facts </div>`
        for (fact in facts){
          if (facts[fact].length){
            annotationHtml += `<div class="wdAntn-statements">
              <div class="wdAntn-statement">
                <span class="wdAntn-prop">${fact}:</span> ${facts[fact]}
              </div>`
          }
        }
        annotationHtml += `</div>`
      }
      annotationHtml += `<div class="wdAntn-section-header"> Learn More </div>
      <div class="wdAntn-buttons">
        <a target="_blank" href="/${annoQid}"><div class="wdAntn-btn">Science Story</div></a>
        <div class="wdAntn-btn"><a target="_blank" href="https://wikidata.org/wiki/${annoQid}">Wikidata Information</a></div>`
      if (data.wikipedia.length){
        annotationHtml += `<div class="wdAntn-btn"><a target="_blank" href="https://en.wikipedia.org/wiki/${data.wikipedia}">Wikipedia Article</a></div>`
      }
      annotationHtml += '</div></div>'
      wikidataAnnotationSet[annoQid] = annotationHtml;
      console.log('added! '+annoQid);
        $( elem ).html(annotationHtml);
        });
    }

  }

});}
window.setInterval(function(){
  convertAnnotations()
}, 500);
