const carousels = document.querySelectorAll(".carousel");
const modals = document.querySelectorAll(".modal");
const openImages = document.querySelectorAll(".open-image");

const carouselInstances = {};
const modalInstances = {};

carousels.forEach((carouselElement) => {
  const carousel = new bootstrap.Carousel(carouselElement);

  carouselElement.addEventListener("slide.bs.carousel", (event) => {
    const id = event.target.id.replace("carousel-", "modal-");
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

    const foundLoras = [];
    let foundModel = model;

    event.relatedTarget.dataset.lora.split(",").map((lora) => {
      const found = data.loras.find((item) => item.title === lora);
      if (found) {
        foundLoras.push(
          `<a href="${found.url}" target="_blank">${found.title}</a>`
        );
      }
    });

    const found = data.models.find((item) => item.hash === model);
    if (found) {
      foundModel = `<a href="${found.url}" target="_blank">${found.title}</a>`;
    }

    document.querySelector(`#${id} h4`).textContent = title;

    document.querySelector(`#${id} .technical.model`).innerHTML = foundModel;

    document.querySelector(`#${id} .technical.style`).textContent = style;
    document.querySelector(`#${id} .technical.subject`).textContent = subject;
    document.querySelector(`#${id} .technical.prompt`).textContent = prompt;
    document.querySelector(`#${id} .technical.negative-prompt`).textContent =
      negativePrompt;

    if (foundLoras.length > 0) {
      document.querySelector(`#${id} .technical.lora`).innerHTML =
        foundLoras.join(" ");
    }

    document.querySelector(`#${id} .technical.sampler`).textContent = sampler;
    document.querySelector(`#${id} .technical.cfg`).textContent = cfg;
    document.querySelector(`#${id} .technical.steps`).textContent = steps;
    document.querySelector(`#${id} .technical.seed`).textContent = seed;
  });

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

    if (carousel && modal) {
      modal.show();
      carousel.to(imageIndex);
    }
  });
});

const enableDisableLora = (displayLora) => {
  if (displayLora) {
    document.body.classList.add("display-lora");
  } else {
    document.body.classList.remove("display-lora");
  }
};

const enableDisableNSFW = (displayNSFW) => {
  if (displayNSFW === "show") {
    document.body.classList.add("display-nsfw");
    document.body.classList.remove("hide-nsfw");
  } else if (displayNSFW === "blur") {
    document.body.classList.remove("display-nsfw");
    document.body.classList.remove("hide-nsfw");
  } else {
    document.body.classList.remove("display-lora");
    document.body.classList.add("hide-nsfw");
  }
};

const testWebShare = async () => {
  if (navigator.share !== undefined) {
    document.body.classList.add("display-share");
  } else {
    document.body.classList.remove("display-share");
  }
};

const load = () => {
  testWebShare();

  const displayLora = localStorage.getItem("displayLora") === "true";
  const displayNSFW = localStorage.getItem("displayNSFW") ?? "blur";

  enableDisableLora(displayLora);
  enableDisableNSFW(displayNSFW);

  document.querySelector("#displayLora").checked = displayLora;
  document.querySelector("#displayNSFW option").selected = false;
  document.querySelector(
    `#displayNSFW option[value="${displayNSFW}"]`
  ).selected = true;

  document.querySelector("#displayLora").addEventListener("click", (event) => {
    enableDisableLora(event.target.checked);
    localStorage.setItem("displayLora", event.target.checked);
  });

  document.querySelector("#displayNSFW").addEventListener("change", (event) => {
    enableDisableNSFW(event.target.value);
    localStorage.setItem("displayNSFW", event.target.value);
  });

  document.querySelectorAll(".share-button").forEach((shareBtn) =>
    shareBtn.addEventListener("click", (event) => {
      const container = event.currentTarget.parentElement;

      const title = container.querySelector("h4").textContent;
      const url = document.location.href;

      navigator.share({ title, url });
    })
  );
};

load();
