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

var $grid = $('#browseStories').imagesLoaded( function() {
  // init Masonry after all images have loaded
  $grid.masonry({
    // options...
    itemSelector: '.grid-item',
    columnWidth: '.grid-item',
    percentPosition: true
  });
});
