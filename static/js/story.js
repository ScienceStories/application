/*
 * Plugin intialization
 */

 // $.fn.pagepiling.setMouseWheelScrolling(false);
 lastSlide = 6;
$('#pagepiling').pagepiling({
  setMouseWheelScrolling: false,
    verticalCentered: false,
    css3: false,
    sectionsColor: ['white', '#f9c93a', 'white', '#3C103C', '#1dc7ce', '#EC008C'],
    onLeave: function (index, nextIndex, direction) {

        //fading out the txt of the leaving section
        $('.section').eq(index - 1).find('h1, p').fadeOut(700, 'easeInQuart');

        //fading in the text of the destination (in case it was fadedOut)
        $('.section').eq(nextIndex - 1).find('h1, p').fadeIn(700, 'easeInQuart');


        //reaching our last section? The one with our normal site?
        if (nextIndex == lastSlide) {
            $('#arrow').hide();

            //fading out navigation bullets
            // $('#pp-nav').fadeOut();

            $('#section'+lastSlide).find('.content').animate({
                top: '0%'
            }, 700, 'easeInQuart');
        }

        //leaving our last section? The one with our normal site?
        if (index == lastSlide) {
            $('#arrow').show();

            //fadding in navigation bullets
            $('#pp-nav').fadeIn();

            $('#section'+lastSlide+' .content').animate({
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
        url: `http://en.wikipedia.org/w/api.php?action=parse&format=json&prop=text&page=${wikititle}&callback=?`,
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






      var query = `SELECT DISTINCT ?person ?personLabel ?year ?occLabel ?occ ?img

WHERE {

  ?person wdt:P21 wd:Q6581072.

  ?person wdt:P69 wd:Q49112;
          p:P69 [pq:P512 wd:Q752297; pq:P582 ?year];
          OPTIONAL {
    ?person wdt:P106 ?occ;
  }
  OPTIONAL{
    ?person wdt:P18|wdt:P117 ?img .
    }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
}`

      $.ajax({
            method: "POST",
            url: "/api/sqarql",
            data: { query: query}
          })
            .done(function( msg ) {
              events = []
              temp = {}
              for (var i=0; i < msg.length; i++){
                var item = msg[i]
                var qid = item.person.value
                var temp_i = temp[qid]
                if (temp_i == null){
                  desc = `<div class='timeline-person'>`
                  if (item.img != null){
                    desc += `<img src='${item.img.value}'> `
                  }
                  if (item.occ != null){
                    desc += `<div class="timeline-context"><a href='${item.occ.value}' target='_blank'>${item.occLabel.value}</a>`
                  }

                  events.push({
                    start: Number(item.year.value.substring(0,4)),
                    title: item.personLabel.value,
                    qid: qid,
                    description: desc
                  })
                  temp[qid] = events.length;
                }
                else if (item.occ != null) {
                  events[temp_i-1].description += `, <a href='${item.occ.value}' target='_blank'>${item.occLabel.value}</a>`;
                }
                // console.log(item.occLabel.value, item.personLabel.value, item.year.value.substring(0,4))
              }
              newEvents = events.map(item => {
                item.description = $(`${item.description}<br><a href='${item.qid}' target='_blank'>Learn more</a></div></div>'`);
                return item})
              $('#section5Total').html(newEvents.length)
              $('#timeline').timespace({
                maxWidth: Math.round(screen.width*.9),

                timeType: 'date',
                useTimeSuffix: false,
                startTime: 1701,
                endTime: 2019,
                markerIncrement: 1,
                data: {
                  headings: [
                    {start: 1701, end: 1969, title: 'Before Co-education (undergraduate)'},
                    {start: 1970, end: 2019, title: 'During Co-education (undergraduate)'},
                  ],
                  events: newEvents
                },

              }, function () {

                // Edit the navigation amount
                this.navigateAmount = 500;

              });
            });


    // $('#timeline').timespace({
    //
    //   timeType: 'date',
    //   useTimeSuffix: false,
    //   startTime: 500,
    //   endTime: 2050,
    //   markerIncrement: 50,
    //   data: {
    //     headings: [
    //       {start: 500, end: 1750, title: 'Dark Ages'},
    //       {start: 1750, end: 1917, title: 'Age of Revolution'},
    //       {start: 1971, title: 'Information Age'},
    //     ],
    //     events: [
    //       {start: 1440, title: 'Gutenberg\'s Printing Press', width: 200},
    //       {start: 1517, end: 1648, title: 'The Reformation',
    //         description: $('<p>The Reformation was a turning point in the history of the world. '
    //           + 'Martin Luther was a key player in this event as he stood up against Papal tyranny '
    //           + 'and church apostasy.</p><p>Many other reformers followed in the steps of Luther '
    //           + 'and followed the convictions of their hearts, even unto death.</p>')},
    //       {start: 1773, title: 'Boston Tea Party'},
    //       {start: 1775, end: 1783, title: 'American Revolution', description: 'Description:', callback: function () {
    //
    //         this.container.find('.jqTimespaceDisplay section').append(
    //           '<p>This description was brought to you by the callback function. For information on the American Revolution, '
    //           + '<a target="_blank" href="https://en.wikipedia.org/wiki/American_Revolution">visit the Wikipedia page.</a></p>'
    //         );
    //
    //       }},
    //       {start: 1789, title: 'French Revolution'},
    //       {start: 1914, end: 1918, title: 'World War I', noDetails: true},
    //       {start: 1929, end: 1939, title: 'Great Depression',
    //         description: 'A period of global economic downturn. Many experienced unemployment and the basest poverty.'
    //       },
    //     ]
    //   },
    //
    // }, function () {
    //
    //   // Edit the navigation amount
    //   this.navigateAmount = 500;
    //
    // });
});
