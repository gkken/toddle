let translateBtn = document.querySelectorAll('.translate')
let babyTxt = document.querySelectorAll('.baby')
let normalTxt = document.querySelectorAll('.normal')

translateBtn.forEach(function(btn) {
  addEventListener('click', test)
})

function test(event){
  let clickedBtn = event.target

  let clickedBtnDataset = clickedBtn.dataset.id
  normalTxt.forEach(function(text){
    if (text.dataset.id === clickedBtnDataset){
      text.classList.toggle('hidden')
    }
  })

  babyTxt.forEach(function(text) {
    if (text.dataset.id === clickedBtnDataset){
      text.classList.toggle('hidden')
    }
  })
}