const carousels = document.querySelectorAll(".carousel");
const modals = document.querySelectorAll(".modal");
const openImages = document.querySelectorAll(".open-image");
// const carousel = new bootstrap.Carousel('#myCarousel')

const carouselInstances = {};
const modalInstances = {};

carousels.forEach((carouselElement) => {
  const carousel = new bootstrap.Carousel(carouselElement);

  carouselElement.addEventListener('slide.bs.carousel', event => {

    const id = event.target.id.replace('carousel-', 'modal-');
    const title = event.relatedTarget.dataset.title;
    const style = event.relatedTarget.dataset.style;
    const subject = event.relatedTarget.dataset.subject;
    const model = event.relatedTarget.dataset.model;
    const prompt = event.relatedTarget.dataset.prompt;
    const negativePrompt = event.relatedTarget.dataset.negativePrompt;
    const sampler = event.relatedTarget.dataset.sampler;
    const cfg = event.relatedTarget.dataset.cfg;
    const steps = event.relatedTarget.dataset.steps;
    const seed = event.relatedTarget.dataset.seed;

    document.querySelector(`#${id} h4`).textContent = title;
    document.querySelector(`#${id} .technical.model`).textContent = model;
    document.querySelector(`#${id} .technical.style`).textContent = style;
    document.querySelector(`#${id} .technical.subject`).textContent = subject;
    document.querySelector(`#${id} .technical.prompt`).textContent = prompt;
    document.querySelector(`#${id} .technical.negativePrompt`).textContent = negativePrompt;
    document.querySelector(`#${id} .technical.sampler`).textContent = sampler;
    document.querySelector(`#${id} .technical.cfg`).textContent = cfg;
    document.querySelector(`#${id} .technical.steps`).textContent = steps;
    document.querySelector(`#${id} .technical.seed`).textContent = seed;
  })

  carouselInstances[carouselElement.id] = carousel;
});

modals.forEach((modalElement) => {
  const modal = new bootstrap.Modal(modalElement);
  modalInstances[modalElement.id] = modal;
});

openImages.forEach((openImage) => {
  openImage.addEventListener("click", (event) => {
    const imageId = event.currentTarget.dataset.imageId;
    const imageIndex = event.currentTarget.dataset.imageIndex;

    const carousel = carouselInstances[`carousel-${imageId}`];
    const modal = modalInstances[`modal-${imageId}`];

    if(carousel && modal) {
      modal.show();
      carousel.to(imageIndex);
    }
  });
});
//modal
const handleGotoCarousel = () => {};
