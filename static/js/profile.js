

function updateMember(field){
  value = $(`.account-section-input[name=account-${field}]`).val()
  $.post('/api/member/update/'+field, {value : value},  function(response){
    var messageSelector = '.account-response#'+field+'response'
    var updateMessage = (response == 'success') ? 'Account Successfully Updated!' : '<span class="error">Error Occurred, Please Try Again Later.</span>'
    $(messageSelector).html(updateMessage).slideFadeToggle()
    setTimeout(function(){$(messageSelector).slideFadeToggle().html(''); }, 3000);
    if(response == 'success'){
      $('.profile-'+field).html(value)
    }
  })
}
function updatePassword(){
  // Check old length
  oldPwd = $('.account-section-input[name=account-password-old]').val()
  if (!oldPwd.length) return showPasswordMessage('<span class="error">Please enter your old password</span>')
  // Check new length
  newPwd = $('.account-section-input[name=account-password-new]').val()
  if (!newPwd.length) return showPasswordMessage('<span class="error">Please enter your new password</span>')
  // Check unique
  if (oldPwd == newPwd) return showPasswordMessage('<span class="error">Please select a different password from the old one.</span>')
  // Check confirm equal
  confirmPwd = $('.account-section-input[name=account-password-confirm]').val()
  if (confirmPwd != newPwd) return showPasswordMessage('<span class="error">Confirm password does not match</span>')
  // Send to server
  var pwdObj = {old:oldPwd, new:newPwd}
  return $.post('/api/member/update/password', pwdObj)
  .done( function(response){
    var responseMessage = '<span class="error">Error Occurred, Please Try Again Later.</span>'
    if (response == 'success') responseMessage = 'Password successfully updated!'
    else if (response == 'invalid_old') responseMessage = '<span class="error">Old password is incorrect.</span>'
    return showPasswordMessage(responseMessage)
  })
  .fail(function() {
    showPasswordMessage('<span class="error">Error Occurred, Please Try Again Later.</span>')
  })

}

function showPasswordMessage(message){
  $('#passwordresponse').html(message).slideFadeToggle()
  setTimeout(function(){$('#passwordresponse').slideFadeToggle().html(''); }, 3000);
}

function animateSuccess(field, response){
  var messageSelector = '.account-response#'+field+'response'
  var updateMessage = (response == 'success') ? 'Account Successfully Updated!' : '<span class="error">Error Occurred, Please Try Again Later.</span>'
  $(messageSelector).html(updateMessage).slideFadeToggle()
  setTimeout(function(){$(messageSelector).slideFadeToggle().html(''); }, 3000);
}

function initializeAvatarPicker(){
  return $("select.image-picker").imagepicker({
          hide_select : true,
          show_label  : true
  })
}
$(function(){
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

  // ACCOUNT JS
  $('.account-section-header').click(function(){
    $(this).next().slideFadeToggle(200)
  })

  initializeAvatarPicker()

  $('.profile-picture-upload-btn').click(function(){
    var tempPictureUrl = $('.upload-picture-url').val()
    $('optgroup#uploadedPictureSet').prepend(`<option data-img-src="${tempPictureUrl}" value="${tempPictureUrl}" selected>Web Upload</option>`)
    return initializeAvatarPicker()

  })

})
