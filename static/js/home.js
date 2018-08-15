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
ScrollReveal({ reset: true }).reveal('section',
{
  origin: 'bottom',
  over: '3s'
});
ScrollReveal({ reset: true }).reveal('#features .left img',
{ delay: 500 ,
  origin: 'left',
  over: '3s'
});
ScrollReveal({ reset: true }).reveal('#features .right img',
{ delay: 500 ,
  origin: 'right',
  over: '3s'
});
ScrollReveal({ reset: true }).reveal('#features .bottom img',
{ delay: 500 ,
  origin: 'bottom',
  over: '3s'
});
