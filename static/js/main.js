$(window).load(function(){
  $('body>div.page-wrapper').fadeIn(2000)

});
jQuery.fn.fadeOutAndRemove = function(speed){
    $(this).fadeOut(speed,function(){
        $(this).remove();
    })
}
