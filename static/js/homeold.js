function loadFeatureStories(){
  var $cont = document.querySelector('.cont');
  var $elsArr = [].slice.call(document.querySelectorAll('.el'));
  var $closeBtnsArr = [].slice.call(document.querySelectorAll('.el__close-btn'));

  setTimeout(function() {
    $cont.classList.remove('s--inactive');
  }, 200);

  $elsArr.forEach(function($el) {
    $el.addEventListener('click', function() {
      if (this.classList.contains('s--active')) return;
      $cont.classList.add('s--el-active');
      this.classList.add('s--active');
    });
  });

  $closeBtnsArr.forEach(function($btn) {
    $btn.addEventListener('click', function(e) {
      e.stopPropagation();
      $cont.classList.remove('s--el-active');
      document.querySelector('.el.s--active').classList.remove('s--active');
    });
  });

}




/*
 * Plugin intialization
 */

 // $.fn.pagepiling.setMouseWheelScrolling(false);
$('#pagepiling').pagepiling({
    sectionsColor: ['white', "#e1e8f0", '#535558'],
    onLeave: function (index, nextIndex, direction) {

        //fading out the txt of the leaving section
        $('.section').eq(index - 1).find('h1, p').fadeOut(700, 'easeInQuart');

        //fading in the text of the destination (in case it was fadedOut)
        $('.section').eq(nextIndex - 1).find('h1, p').fadeIn(700, 'easeInQuart');


        //reaching our last section? The one with our normal site?
        if (nextIndex == 2) {
            $('#arrow').hide();

            //fading out navigation bullets
            // $('#pp-nav').fadeOut();

            $('#section2').find('.content').animate({
                top: '0%'
            }, 700, 'easeInQuart');
            loadFeatureStories();
        }

        //leaving our last section? The one with our normal site?
        if (index == 2) {
            $('#arrow').show();

            //fadding in navigation bullets
            $('#pp-nav').fadeIn();

            $('#section2 .content').animate({
                top: '100%'
            }, 700, 'easeInQuart');
        }
    },
});
$.fn.pagepiling.setAllowScrolling(false);
$('#arrow').click(function () {
    $.fn.pagepiling.moveSectionDown();
});
