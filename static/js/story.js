/*
 * Plugin intialization
 */

 // $.fn.pagepiling.setMouseWheelScrolling(false);
$('#pagepiling').pagepiling({
  setMouseWheelScrolling: false,
    verticalCentered: false,
    css3: false,
    sectionsColor: ['white', '#f9c93a', 'white', '#3C103C', '#EC008C'],
    onLeave: function (index, nextIndex, direction) {

        //fading out the txt of the leaving section
        $('.section').eq(index - 1).find('h1, p').fadeOut(700, 'easeInQuart');

        //fading in the text of the destination (in case it was fadedOut)
        $('.section').eq(nextIndex - 1).find('h1, p').fadeIn(700, 'easeInQuart');


        //reaching our last section? The one with our normal site?
        if (nextIndex == 5) {
            $('#arrow').hide();

            //fading out navigation bullets
            // $('#pp-nav').fadeOut();

            $('#section5').find('.content').animate({
                top: '0%'
            }, 700, 'easeInQuart');
        }

        //leaving our last section? The one with our normal site?
        if (index == 5) {
            $('#arrow').show();

            //fadding in navigation bullets
            $('#pp-nav').fadeIn();

            $('#section5 .content').animate({
                top: '100%'
            }, 700, 'easeInQuart');
        }
    },
});
$.fn.pagepiling.setAllowScrolling(false);
$('#arrow').click(function () {
    $.fn.pagepiling.moveSectionDown();
});


$(document).ready(function(){

    $.ajax({
        type: "GET",
        url: "http://en.wikipedia.org/w/api.php?action=parse&format=json&prop=text&page=Grace_Hopper&callback=?",
        contentType: "application/json; charset=utf-8",
        async: false,
        dataType: "json",
        success: function (data, textStatus, jqXHR) {

            var markup = data.parse.text["*"];
            var blurb = $('<div></div>').html(markup);

            // remove links as they will not work
            blurb.find('a').each(function() { $(this).replaceWith($(this).html()); });

            // remove any references
            blurb.find('sup').remove();

            // remove cite error
            blurb.find('.mw-ext-cite-error').remove();
            $('#article').html($(blurb).find('p'));

        },
        error: function (errorMessage) {
        }
    });
});
