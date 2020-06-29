module.exports = async (ctx) => {
  const { args, $axios, $cheerio, $log, actorName, $createImage } = ctx;

  const name = actorName
    .replace(/#/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  $log(`Scraping actor info for '${name}', dry mode: ${args.dry || false}...`);

  const url = `https://www.adultempire.com/allsearch/search?q=${name}`;
  const html = (await $axios.get(url)).data;
  const $ = $cheerio.load(html);

  const firstResult = $(`a.boxcover[label="Performer"]`).toArray()[0];
  const href = $(firstResult).attr("href");

  if (href) {
    const actorUrl = "https://adultempire.com" + href;
    const html = (await $axios.get(actorUrl)).data;
    const $ = $cheerio.load(html);

    let avatar;

    const firstImageResult = $(`a.fancy`).toArray()[0];
    const avatarUrl = $(firstImageResult).attr("href");

    if (avatarUrl) {
      avatar = $createImage(avatarUrl, `${actorName} (avatar)`);
    }

    let hero;

    const secondImageResult = $(`a.fancy`).toArray()[1];
    const heroUrl = $(secondImageResult).attr("href");

    if (heroUrl) {
      hero = $createImage(heroUrl, `${actorName} (hero image)`);
    }

    let description;

    const descEl = $("#content .row aside");
    if (descEl) {
      description = descEl.text().trim();
    }

    let aliases;

    const aliasEl = $("#content .row .col-sm-5 .m-b-1");

    if (aliasEl) {
      const text = aliasEl.text();
      aliases = text
        .replace("Alias: ", "")
        .split(",")
        .map((s) => s.trim());
    }

    const result = { avatar, $ae_avatar: avatarUrl, hero, $ae_hero: heroUrl, aliases, description };

    if (args.dry) {
      $log(result);
      return {};
    } else {
      return result;
    }
  }

  return {};
};
