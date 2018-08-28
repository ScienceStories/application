//
//
//
// var $grid = $('#browseStories').masonry({
//     // options
//     itemSelector: '.grid-item',
//     columnWidth: '.grid-item',
//     percentPosition: true
// });
// // layout Masonry after each image loads
// $grid.imagesLoaded().progress( function() {
//   $grid.masonry('layout');
// });
//
$(window).load(function(){

var repeatedLoad = setInterval(loadGridGallery ,1000);
setTimeout(function( ) { clearInterval( repeatedLoad ); }, 10000);

})
function loadGridGallery(){
  $('.browse-gallery').masonry({
    visibleStyle: { transform: 'translateY(0)', opacity: 1 },
  hiddenStyle: { transform: 'translateY(100px)', opacity: 0 },
    // options...
    itemSelector: '.grid-item',
    columnWidth: '.grid-item',
    percentPosition: true
  });


}
