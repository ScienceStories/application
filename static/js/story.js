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
        <div class="wdAntn-header"> ${data.label} <i class="${data.icon} pull-right"></i></div>
      `
      // image
      if (data.image.length){
        annotationHtml += `<div class="wdAntn-image"><img src="${data.image}"></div>`
      }
      if (data.summary.length){
        annotationHtml += `<div class="wdAntn-section-header"> ${data.pronoun} is this? </div>
        <div class="wdAntn-description">${data.summary}</div>`
      }
      if (data.facts){
        facts = data.facts
        annotationHtml += `<div class="wdAntn-section-header"> Quick Facts </div><div class="wdAntn-statements">`
        for (fact in facts){
          if (facts[fact].length){
            annotationHtml += `
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
function sendComment(elm, story_id, stay = false){
  var parent = $(elm).data('parent')
  var message = $(elm).prev().val()
  console.log($(elm).prev())
  console.log('sending-> ', message, parent, story_id)
  return $.post('/api/comment/send', {parentId: parent, message: message, storyId:story_id}).done( function(data){
    console.log(data)
    if (!stay){
      $(elm).parent().slideUp('slow')
    }
    $(elm).prev().val('')

  })

}
function replyToggle(elm){
  var parent = $(elm).parent().next().slideToggle('slow')
}

function loadComments(story_id){
  $.get('/api/story/'+story_id+'/commentlist')
  .then(data => {
    $('.comments-list').html(data)
  })
}

function reloadComments(story_id){
  // console.log("CALLING")
  $.get('/api/story/'+story_id+'/comments')
  .then(data => {
    var newComments = data.comments;
    for (var i = 0; i < newComments.length; i++) {
      var cmt = newComments[i]
      var placeCmt = $('.comment-container[data-id='+cmt.id+']')
      if (placeCmt.length){
        // Existing Stays
        // console.log('CASE 1:', cmt)
      }
      else if (cmt.order < $('.comment-container').length){

        // console.log('CASE 2:', cmt)
          if (cmt.parentId == $('.comment-container:nth-child('+cmt.order+')').data('id')){
            $('.comment-container:nth-child('+cmt.order+')').after(cmt.html).hide().fadeIn()
          }
          else
          $('.comment-container:nth-child('+cmt.order+')').after(cmt.html).hide().fadeIn()

      }
      else {
        // console.log('CASE 3:', cmt)
        $('.comments-list').append(cmt.html).hide().fadeIn()

      }
    }

  })
}


$(document).ready(function(){
   $('.slide-index').scroll(function(){lazyload(".index-preview")});
   lazyload(".index-preview");
   $('.people-list').draggable({
    axis: "x"
});
});

function lazyload(selector){
   var wt = $(window).scrollTop();    //* top of the window
   var wb = wt + $(window).height();  //* bottom of the window

   $(selector).each(function(){
      var ot = $(this).offset().top;  //* top of object (i.e. advertising div)
      var ob = ot + $(this).height(); //* bottom of object

      if(!$(this).attr("loaded") && wt<=ob && wb >= ot){
        $(this).attr("src", $(this).data('src'));
         // $(this).html("here goes the iframe definition");
         $(this).attr("loaded",true);
      }
   });
}
