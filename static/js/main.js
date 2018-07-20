$(window).load(function(){
  $('body>div.page-wrapper').fadeIn(1000)

});
jQuery.fn.fadeOutAndRemove = function(speed){
    $(this).fadeOut(speed,function(){
        $(this).remove();
    })
}
function textAreaAdjust(o) {
  o.style.height = "1px";
  o.style.height = (25+o.scrollHeight)+"px";
}
