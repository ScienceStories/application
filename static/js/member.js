$( "#tabs" ).tabs();
loadContributions(1)
$('#contributionLi').click(function(){
  loadGridGallery()
  // $('.browse-gallery').masonry('destroy', function(){
  //
  // });
})

  // endlessScroll()

  function loadGridGallery(){
    $('.browse-gallery').masonry({
      visibleStyle: { transform: 'translateY(0)', opacity: 1 },
    hiddenStyle: { transform: 'translateY(100px)', opacity: 0 },
      // options...
      itemSelector: '.grid-item',
      columnWidth: '.grid-item',
      percentPosition: true
    });}
function loadContributions(page){
  $.get('/api/member/contribution/'+memberUsername+'/'+page, function(response){
    $('#contributions .browse-gallery').html(response)
    $('.browse-gallery').masonry('destroy')
    loadGridGallery()
  })
}
function appendContributions(page){
  $.get('/api/member/contribution/'+memberUsername+'/'+page, function(response){
    $grid.masonry( 'appended', response )
    // $('#contributions .browse-gallery').html(response)
    // $('.browse-gallery').masonry('destroy')
    // loadGridGallery()
  })
}

// function endlessScroll(){
//   $.get('/api/member/contribution/'+memberUsername+'/1', function(response){
//     $('#contributions .browse-gallery').html(response)
//
//
// }
var $grid = $('.browse-gallery').masonry({
  // options...
  itemSelector: '.grid-item',
  columnWidth: '.grid-item',
  percentPosition: true,
  // ADDED
});



// get Masonry instance
var msnry = $grid.data('masonry');

// initial items reveal
$grid.imagesLoaded( function() {
  $grid.removeClass('are-images-unloaded');
  $grid.masonry( 'option', { itemSelector: '.grid-item' });
  var $items = $grid.find('.grid-item');
  $grid.masonry( 'appended', $items );
});

// init Infinite Scroll
$grid.infiniteScroll({
  // Infinite Scroll options...
  path: '/api/member/contribution/'+memberUsername+'/{{#}}',
  append: '.grid-item',
  outlayer: msnry,
  status: '.page-load-status',
  history: false
});
$grid.on( 'append.infiniteScroll', function( event, response, path, items ) {
  console.log( 'Loaded: ' + path );
  var pos1= $(window).scrollTop()
  $grid.masonry('destroy').masonry()
  $(window).scrollTop(pos1)
});
