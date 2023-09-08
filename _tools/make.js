const fs = require("fs");
const path = require("path");

const { execSync } = require("child_process");

const matchStyleRaw = require("./match-style.json");
// const menu = require("./menu.json");

const constructMenu = () => {
  const root = path.resolve(__dirname, "..", "static", "_source");
  const menu = [];

  const folders = fs.readdirSync(root);

  folders.forEach((folder) => {
    const dataPath = path.resolve(root, folder, "data.json");

    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

      menu.push({ ...data, slug: folder });
    }
  });

  return menu;
};

const menu = constructMenu();

const matchStyle = matchStyleRaw.sort((a, b) => {
  if (a["category-order"] !== b["category-order"]) {
    return a["category-order"] - b["category-order"];
  }

  return a.name.localeCompare(b.name);
});

const checkMissingStyles = (images, folder, prompts) => {
  const subject = menu.find((item) => item.slug === folder);
  matchStyle.forEach((style) => {
    const found = images.find((image) => image.includes(style.style));

    let doubleLora = false;

    if (subject && subject.params.lora && style.lora) {
      doubleLora = subject.params.lora.some((lora) =>
        style.lora.some((styleLora) => styleLora.title === lora.title)
      );
    }

    if (!found && !doubleLora) {
      console.log(`Missing style ${style.style}`, { doubleLora });
      if (subject) {
        if (style.prompt.includes("{prompt}")) {
          prompts.push(
            `--prompt "${style.prompt.replace(
              "{prompt}",
              subject.params.prompt
            )}" --negative_prompt "${subject.params.negativePrompt}" --seed ${
              subject.params.seed
            } --styles "${style.style}" --cfg_scale ${subject.params.cfg}`
          );
        } else {
          prompts.push(
            `--prompt "${subject.params.prompt}, ${style.prompt}" --negative_prompt "${subject.params.negativePrompt}" --seed ${subject.params.seed} --styles "${style.style}" --cfg_scale ${subject.params.cfg}`
          );
        }
      }
    }
  });
};

const generateImagesData = () => {
  const loras = new Map();
  const models = new Map();
  menu.forEach((item) => {
    const dir = path.resolve(
      __dirname,
      "..",
      "static",
      "images",
      "img-thumbs",
      item.slug
    );
    const files = fs.readdirSync(dir);
    const images = [
      "title,filename,category,subject,prompt,negativePrompt,lora",
    ];

    files.forEach((file) => {
      let match = /[0-9]+-(.*)\.jpg/i.exec(file);

      if (!match) {
        if (file.includes(item.slug)) {
          match = [file, "None"];
        }
      }

      if (match) {
        const name = match[1];

        let style = matchStyle.find((style) => style.style === name);

        if (style) {
          const prompt = style.prompt.replace("{prompt}", item.params.prompt);
          const lora = [...(item.params.lora ?? []), ...(style.lora ?? [])];

          lora.forEach((l) => {
            loras.set(l.title, l);
          });

          models.set(item.params.model.hash, item.params.model);

          const promptClean = prompt
            .split(",")
            .map((item) => item.trim())
            .join(", ");
          const negativePromptClean = style.negativePrompt
            .split(",")
            .map((item) => item.trim())
            .join(", ");
          images.push(
            `${style.name},${item.slug}/${file},${style.category},${
              item.title
            },"${promptClean}","${negativePromptClean}","${lora
              .map((lora) => lora.title)
              .join(",")}"`
          );
        }
      }
    });

    fs.writeFileSync(
      path.resolve(__dirname, "..", "_data", `${item.slug}.csv`),
      images.join("\n")
    );
  });

  const categoryData = ["title,slug,order,lora"];
  matchStyle.forEach((style) => {
    categoryData.push(
      `${style.category},${style["category-slug"]},${style["category-order"]},false`
    );
  });
  categoryData.push(`LoRA,lora,100,true`);

  const lorasDataCSV = [
    "title,url",
    ...Array.from(loras).map(([, lora]) => `${lora.title},${lora.url}`),
  ];
  const modelsDataCSV = [
    "hash,title,url",
    ...Array.from(models).map(
      ([, model]) => `${model.hash},${model.title},${model.url}`
    ),
  ];

  const lorasDataJson = Array.from(loras).map(([, lora]) => lora);
  const modelsDataJson = Array.from(models).map(([, model]) => model);

  fs.writeFileSync(
    path.resolve(__dirname, "..", "_data", `data-loras.csv`),
    lorasDataCSV.join("\n")
  );
  fs.writeFileSync(
    path.resolve(__dirname, "..", "_data", `data-models.csv`),
    modelsDataCSV.join("\n")
  );

  fs.writeFileSync(
    path.resolve(__dirname, "..", "_data", `data-category.csv`),
    categoryData
      .filter((value, index, self) => self.indexOf(value) === index)
      .join("\n")
  );

  fs.writeFileSync(
    path.resolve(__dirname, "..", "static", `data.js`),
    `var data = ${JSON.stringify(
      { loras: lorasDataJson, models: modelsDataJson },
      null,
      2
    )}`
  );
};

const generateStylesCSV = () => {
  const styles = ["name,prompt,negative_prompt,"];
  const categories = [];
  matchStyle.forEach((style) => {
    if (
      style.category !== "No style" &&
      (!style.lora || style.lora.length === 0)
    ) {
      if (!categories.includes(style.category)) {
        categories.push(style.category);
        styles.push(`____${style.category}____`);
      }

      styles.push(`${style.name},"${style.prompt}","${style.negativePrompt}"`);
    }
  });

  fs.writeFileSync(
    path.resolve(__dirname, "..", "static", "styles.csv"),
    styles.join("\n")
  );
};

const generatePages = () => {
  let menuSubjectPage = "";
  const dataSubject = ["id,lora,model,nsfw,sampler,cfg,steps,seed"];

  menu.forEach((item) => {
    const lora = item.params.lora ?? [];
    menuSubjectPage += `- title: ${item.title}
  id: ${item.slug}
  description: ${item.description}
  image: static/images/img-thumbs/${item.slug}/${item.slug}.jpg
  lora: ${lora.length !== 0 ?? false}
  model: ${item.params.model.hash}
  nsfw: ${item.nsfw ?? false}

`;

    dataSubject.push(
      `${item.slug},${lora.length !== 0 ?? false},${item.params.model.hash},${
        item.nsfw ?? false
      },${item.params.sampler},${item.params.cfg},${item.params.steps},${
        item.params.seed
      }`
    );

    const page = `---
layout: gallery
title: ${item.title}
description: ${item.description}
---

{% assign data = site.data.${item.slug} %}

{% include galleries.html 
    data = data 
    gallery = "${item.slug}"
%}
`;

    fs.writeFileSync(path.resolve(__dirname, "..", `${item.slug}.html`), page);
  });

  const stylesGalleries = {};

  stylesGalleries.LoRA = [
    `---
layout: gallery
title: LoRA
---`,
  ];

  stylesGalleries.LoRA.push(
    `{% assign everything = ${menu
      .map((item) => `site.data.${item.slug}`)
      .join(" | concat: ")} %}`
  );

  const categories = matchStyle
    .map((item) => item.category)
    .filter((value, index, self) => self.indexOf(value) === index);

  categories.forEach((category) => {
    const categoryTitle =
      category === "Stability's AI" || category === "No style"
        ? "Base"
        : category;

    stylesGalleries[category] = [
      `---
layout: gallery
title: ${categoryTitle}
---`,
    ];

    stylesGalleries[category].push(
      `{% assign everything = ${menu
        .map((item) => `site.data.${item.slug}`)
        .join(" | concat: ")} %}`
    );
  });

  matchStyle.forEach((style) => {
    const styleId = style.name.replace(/[^a-z]/gi, "").toLowerCase();

    if (style.lora && style.lora.length > 0) {
      stylesGalleries.LoRA.push(
        `{% assign ${styleId} = everything | where: 'title', '${style.name}' %}`
      );

      stylesGalleries.LoRA.push(
        `{% include gallery.html data = ${styleId} title = "${style.name}" id = '${styleId}' %}`
      );
    }

    stylesGalleries[style.category].push(
      `{% assign ${styleId} = everything | where: 'title', '${style.name}' %}`
    );

    stylesGalleries[style.category].push(
      `{% include gallery.html data = ${styleId} title = "${style.name}" id = '${styleId}' %}`
    );
  });

  fs.writeFileSync(
    path.resolve(__dirname, "..", "_data", "data-subject.csv"),
    dataSubject.join("\n")
  );

  fs.writeFileSync(
    path.resolve(__dirname, "..", "_data", "menu-subject.yml"),
    menuSubjectPage
  );

  let menuStylePage = "";

  Object.keys(stylesGalleries).forEach((category) => {
    let categorySlug = category.replace(/[^a-z]/gi, "").toLowerCase();
    let categoryTitle = category;
    if (category === "Stability's AI" || category === "No style") {
      categorySlug = "base";
      categoryTitle = "Base";
    }

    fs.writeFileSync(
      path.resolve(__dirname, "..", `styles-${categorySlug}.html`),
      stylesGalleries[category].join("\n\n")
    );

    if (category !== "Stability's AI") {
      menuStylePage += `- title: ${categoryTitle}
  id: styles-${categorySlug}
  image: static/images/img-thumbs/${categorySlug}.jpg
  lora: ${category === "LoRA"}
  nsfw: false

`;
    }
  });

  fs.writeFileSync(
    path.resolve(__dirname, "..", "_data", "menu-styles.yml"),
    menuStylePage
  );
};

const checkImages = async () => {
  const sourceFolder = path.resolve(__dirname, "..", "static", "_source");
  const thumbFolder = path.resolve(
    __dirname,
    "..",
    "static",
    "images",
    "img-thumbs"
  );
  const imagesFolder = path.resolve(
    __dirname,
    "..",
    "static",
    "images",
    "img-normal"
  );

  const prompts = [];

  const folders = fs.readdirSync(sourceFolder);

  folders.forEach((folder) => {
    const images = fs
      .readdirSync(path.resolve(sourceFolder, folder))
      .filter((predicate) => predicate.endsWith(".png"));

    if (!fs.existsSync(path.resolve(thumbFolder, folder))) {
      fs.mkdirSync(path.resolve(thumbFolder, folder), { recursive: true });
    }

    if (!fs.existsSync(path.resolve(imagesFolder, folder))) {
      fs.mkdirSync(path.resolve(imagesFolder, folder), { recursive: true });
    }

    console.group(folder);

    checkMissingStyles(images, folder, prompts);
    console.groupEnd();

    images.forEach((image) => {
      const thumbImagePath = path.resolve(thumbFolder, folder, image);
      const normalImagePath = path.resolve(imagesFolder, folder, image);

      let thumbImage = thumbImagePath;
      let normalImage = normalImagePath;
      if (thumbImage.includes("None") || normalImage.includes("None")) {
        const pathNameThumb = path.dirname(thumbImage);
        const pathNameNormal = path.dirname(normalImage);
        thumbImage = `${pathNameThumb}/${folder}.png`;
        normalImage = `${pathNameNormal}/${folder}.png`;
      }

      if (!fs.existsSync(thumbImage.replace(".png", ".jpg"))) {
        fs.copyFileSync(path.resolve(sourceFolder, folder, image), thumbImage);
        console.log(`Resizing ${thumbImage}`);
        execSync(`mogrify -resize 422x316 -format jpg "${thumbImage}"`);
        fs.rmSync(path.resolve(thumbImage));
      }

      if (!fs.existsSync(normalImage.replace(".png", ".jpg"))) {
        fs.copyFileSync(path.resolve(sourceFolder, folder, image), normalImage);
        console.log(`Converting ${normalImage}`);
        execSync(`mogrify -format jpg "${normalImage}"`);
        fs.rmSync(path.resolve(normalImage));
      }
    });

    const normalImages = fs.readdirSync(path.resolve(imagesFolder, folder));
    const thumbImages = fs.readdirSync(path.resolve(imagesFolder, folder));

    normalImages.forEach((normalImage) => {
      const sourceImagePath = path.resolve(sourceFolder, folder, normalImage);

      let skip = false;

      let sourceImage = sourceImagePath;
      if (normalImage.includes(folder)) {
        skip = true;
      }

      if (!skip && !fs.existsSync(sourceImage.replace(".jpg", ".png"))) {
        console.log(
          `Deleting ${path.resolve(imagesFolder, folder, normalImage)}`,
          sourceImage
        );
        fs.rmSync(path.resolve(imagesFolder, folder, normalImage));
      }
    });

    thumbImages.forEach((thumbImage) => {
      const sourceImagePath = path.resolve(sourceFolder, folder, thumbImage);

      let skip = false;

      let sourceImage = sourceImagePath;
      if (thumbImage.includes(folder)) {
        skip = true;
      }

      if (!skip && !fs.existsSync(sourceImage.replace(".jpg", ".png"))) {
        console.log(
          `Deleting ${path.resolve(thumbFolder, folder, thumbImage)}`
        );
        //execSync(`mogrify -format jpg "${normalImagePath}"`);
        fs.rmSync(path.resolve(thumbFolder, folder, thumbImage));
      }
    });
  });

  fs.writeFileSync(path.resolve(__dirname, "prompts.txt"), prompts.join("\n"));
};

checkImages();
generateImagesData();
generatePages();
generateStylesCSV();
