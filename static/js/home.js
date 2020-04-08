var storyOdometer = document.querySelector('.story-odometer');

od = storyOdometer && new Odometer({
  el: storyOdometer,
  value: 100,

  // Any option (other than auto and selector) can be passed in here
  format: '(,ddd)',
  theme: 'car'
});

// od.update(555)
// or
// el.innerHTML = 555
$('#featuredCarousel').slick({
  centerMode: true,
  arrows: false,
  centerPadding: '60px',
  slidesToShow: 3,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 2000,
  infinite: true,
  responsive: [
    {
      breakpoint: 768,
      settings: {
        arrows: false,
        centerMode: true,
        centerPadding: '40px',
        slidesToShow: 3
      }
    },
    {
      breakpoint: 480,
      settings: {
        arrows: false,
        centerMode: true,
        centerPadding: '40px',
        slidesToShow: 1
      }
    }
  ],
});


$('#sourceCarousel').slick({
  arrows: false,
  slidesToShow: 6,
  slidesToScroll: 1,
  autoplay: true,
  autoplaySpeed: 1900,
  infinite: true,
  responsive: [
    {
      breakpoint: 768,
      settings: {
        arrows: false,
        centerPadding: '40px',
        slidesToShow: 4
      }
    },
    {
      breakpoint: 480,
      settings: {
        arrows: false,
        centerPadding: '40px',
        slidesToShow: 3
      }
    }
  ],
});
ScrollReveal({ distance: '100px' });
ScrollReveal().reveal('section',
{
  origin: 'bottom',
  over: '3s'
});
storyOdometer && ScrollReveal().reveal('.odometer',
{
  origin: 'down',
  over: '3s',
  afterReveal: function (el) {
    od.update(100)
    setTimeout(  function(){od.update(countStories)}, 20)


  }
});
ScrollReveal().reveal('#features .left img',
{ delay: 500 ,
  origin: 'left',
  over: '3s'
});
ScrollReveal().reveal('#features .right img',
{ delay: 500 ,
  origin: 'right',
  over: '3s'
});
ScrollReveal().reveal('#features .bottom img',
{ delay: 500 ,
  origin: 'bottom',
  over: '3s'
});

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
