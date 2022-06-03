
let editBtn = document.querySelector('.edit-btn')

let editProfileForm = document.querySelector('.edit-profile-form')
let xmark = document.querySelector('.fa-xmark')

function handleEditProfile(){
  editProfileForm.style.visibility = 'visible'
}

function handleCloseEditProfile(){
  editProfileForm.style.visibility = 'hidden'
}

editBtn.addEventListener('click', handleEditProfile)
xmark.addEventListener('click', handleCloseEditProfile)