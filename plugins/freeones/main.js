function lowercase(str) {
  return str.toLowerCase();
}

function cmToFt(cm) {
  cm *= 0.033;
  return Math.round((cm + Number.EPSILON) * 100) / 100;
}

function kgToLbs(kg) {
  kg *= 2.2;
  return Math.round((kg + Number.EPSILON) * 100) / 100;
}

async function search({ $axios }, query) {
  const url = `https://www.freeones.xxx/partial/subject`;
  return (
    await $axios.get(url, {
      params: {
        q: query,
      },
    })
  ).data;
}

async function getFirstSearchResult(ctx, query) {
  const searchHtml = await search(ctx, query);
  const $ = ctx.$cheerio.load(searchHtml);
  const el = $(".grid-item.teaser-subject>a");
  return el;
}

class Measurements {
  static fromString(str) {
    const [bra, waist, hip] = str.split("-");
    if (bra && waist && hip) {
      const measurements = new Measurements();
      measurements.chest = parseInt(bra);
      measurements.cup = bra.replace(measurements.chest, "");
      measurements.waist = Number(waist);
      measurements.hip = Number(hip);
      return measurements;
    }
    return null;
  }

  toString() {
    return `${this.braSize()}-${this.waist}-${this.hip}`;
  }

  braSize() {
    return `${this.chest}${this.cup}`;
  }
}

module.exports = async (ctx) => {
  const { $createImage, args, $axios, $moment, $cheerio, $throw, $log, actorName } = ctx;
  if (!actorName) $throw("Uh oh. You shouldn't use the plugin for this type of event");

  $log(`Scraping freeones date for ${actorName}, dry mode: ${args.dry || false}...`);

  const blacklist = (args.blacklist || []).map(lowercase);
  if (!args.blacklist) $log("No blacklist defined, returning everything...");
  if (blacklist.length) $log(`Blacklist defined, will ignore: ${blacklist.join(", ")}`);

  const whitelist = (args.whitelist || []).map(lowercase);
  if (whitelist.length) $log(`Whitelist defined, will only return: ${whitelist.join(", ")}...`);

  function isBlacklisted(prop) {
    if (whitelist.length) {
      return !whitelist.includes(lowercase(prop));
    }
    return blacklist.includes(lowercase(prop));
  }

  // Check imperial unit preference
  const useImperial = args.useImperial;
  if (!useImperial) {
    $log("Imperial preference not set. Using metric values...");
  } else {
    $log("Imperial preference indicated. Using imperial values...");
  }

  // Check Use Avatar as Thumbnail preference
  const useAvatarAsThumbnail = args.useAvatarAsThumbnail;
  if (!useAvatarAsThumbnail) {
    $log("Will not use the Avatar as the Actor Thumbnail...");
  } else {
    $log("Will use the Avatar as the Actor Thumbnail...");
  }

  let firstResult;
  try {
    firstResult = await getFirstSearchResult(ctx, actorName);
  } catch (error) {
    $throw(error.message);
  }

  if (!firstResult) $throw(`${actorName} not found!`);

  const href = firstResult.attr("href");

  let html;
  try {
    html = (await $axios.get(`https://freeones.xxx${href}/profile`)).data;
  } catch (error) {
    $throw(error.message);
  }
  const $ = $cheerio.load(html);

  function getNationality() {
    if (isBlacklisted("nationality")) return {};
    $log("Getting nationality...");

    const selector = $('[data-test="section-personal-information"] a[href*="countryCode%5D"]');

    if (!selector.length) {
      $log("Nationality not found");
      return {};
    }

    const nationality = $(selector).attr("href").split("=").slice(-1)[0];
    if (!nationality) {
      return {};
    }
    return {
      nationality,
    };
  }

  function getHeight() {
    if (isBlacklisted("height")) return {};
    $log("Getting height...");

    const selector = $('[data-test="link_height"] .text-underline-always');
    if (!selector) return {};

    const rawHeight = $(selector).text();
    const cm = rawHeight.match(/\d+cm/)[0];
    if (!cm) return {};
    const height = parseInt(cm.replace("cm", ""));
    if (!useImperial) return { height };

    // Convert to imperial
    return { height: cmToFt(height) };
  }

  function getWeight() {
    if (isBlacklisted("weight")) return {};
    $log("Getting weight...");

    const selector = $('[data-test="link_weight"] .text-underline-always');
    if (!selector) return {};

    const rawWeight = $(selector).text();
    const kg = rawWeight.match(/\d+kg/)[0];
    if (!kg) return {};
    const weight = parseInt(kg.replace("kg", ""));
    if (!useImperial) return { weight };

    // Convert to imperial
    return { weight: kgToLbs(weight) };
  }

  function getZodiac() {
    if (isBlacklisted("zodiac")) return {};
    $log("Getting zodiac sign...");

    const selector = $('[data-test="link_zodiac"] .text-underline-always');
    if (!selector) return {};
    const zodiacText = $(selector).text();
    const zodiac = zodiacText.split(" (")[0];
    return { zodiac };
  }

  function getBirthplace() {
    if (isBlacklisted("birthplace")) return {};
    $log("Getting birthplace...");

    const selector = $('[data-test="section-personal-information"] a[href*="placeOfBirth"]');
    const cityName = selector.length ? $(selector).attr("href").split("=").slice(-1)[0] : null;

    if (!cityName) {
      $log("No birthplace found");
      return {};
    } else {
      const stateSelector = $('[data-test="section-personal-information"] a[href*="province"]');
      const stateName = stateSelector.length
        ? $(stateSelector).attr("href").split("=").slice(-1)[0]
        : null;
      if (!stateName) {
        $log("No birth province found, just city!");
        return { birthplace: cityName };
      } else {
        const bplace = cityName + ", " + stateName.split("-")[0].trim();
        return { birthplace: bplace };
      }
    }
  }

  function scrapeText(prop, selector) {
    if (isBlacklisted(prop)) return {};
    $log(`Getting ${prop}...`);

    const el = $(selector);
    if (!el) return {};

    return { [prop]: el.text() };
  }

  async function getAvatar() {
    if (args.dry) return {};
    if (isBlacklisted("avatar")) return {};
    $log("Getting avatar...");

    const imgEl = $(".profile-header .img-fluid");
    if (!imgEl) return {};

    const url = $(imgEl).attr("src");

    if (!url) return {};

    const imgId = await $createImage(url, `${actorName} (avatar)`);

    if (!useAvatarAsThumbnail) {
      return { avatar: imgId };
    } else {
      return {
        avatar: imgId,
        thumbnail: imgId,
      };
    }
  }

  function getAge() {
    if (isBlacklisted("bornOn")) return {};
    $log("Getting age...");

    const aTag = $('[data-test="section-personal-information"] a');
    if (!aTag) return {};

    const href = $(aTag).attr("href");
    const yyyymmdd = href.match(/\d\d\d\d-\d\d-\d\d/);

    if (yyyymmdd && yyyymmdd.length) {
      const date = yyyymmdd[0];
      const timestamp = $moment(date, "YYYY-MM-DD").valueOf();
      return {
        bornOn: timestamp,
      };
    } else {
      $log("Could not find actor birth date.");
      return {};
    }
  }

  function getAlias() {
    if (isBlacklisted("aliases")) return {};
    $log("Getting aliases...");

    const aliasSel = $('[data-test="section-alias"] p[data-test*="p_aliases"]');
    const aliasText = aliasSel.text();
    const aliasName = aliasText && !/unknown/.test(aliasText) ? aliasText.trim() : null;
    if (!aliasName) return {};
    const aliases = aliasName.split(/,\s*/g);

    return { aliases };
  }

  function scrapeMeasurements() {
    const measurementParts = [];
    $('[data-test="p-measurements"] .text-underline-always').each(function (i, element) {
      measurementParts[i] = $(this).text();
    });
    const measurements = measurementParts.join("-");
    return Measurements.fromString(measurements);
  }

  const measurements = scrapeMeasurements();

  function getMeasurements() {
    if (isBlacklisted("measurements")) return {};
    $log("Getting measurements...");
    return measurements ? { measurements: measurements.toString() } : {};
  }

  function getChestSize() {
    if (isBlacklisted("measurements")) return {};
    $log("Getting chest size...");
    return measurements ? { "chest size": measurements.chest } : {};
  }

  function getWaistSize() {
    if (isBlacklisted("measurements")) return {};
    $log("Getting waist size...");
    return measurements ? { "waist size": measurements.waist } : {};
  }

  function getHipSize() {
    if (isBlacklisted("measurements")) return {};
    $log("Getting hip size...");
    return measurements ? { "hip size": measurements.hip } : {};
  }

  function getBraSize() {
    if (isBlacklisted("measurements")) return {};
    $log("Getting bra/cup/bust size...");
    return measurements
      ? {
          "cup size": measurements.braSize(),
          "bra size": measurements.braSize(),
          "bust size": measurements.braSize(),
        }
      : {};
  }

  function getGender() {
    if (isBlacklisted("gender")) return {};
    return { sex: "Female", gender: "Female" };
  }

  let tattooResult = scrapeText("tattoos", '[cdata-test="p_has_tattoos"]');
  if (!Object.keys(tattooResult).length) {
    tattooResult = scrapeText("tattoos", '[data-test="p_has_tattoos"]');
  }
  const tattooText = tattooResult.tattoos;
  const hasTattoos = !!tattooText && !!tattooText.length && tattooText !== "No Tattoos";

  const piercingText = scrapeText("piercings", '[data-test="p_has_piercings"]').piercings;
  const hasPiercings = !!piercingText && !!piercingText.length && piercingText !== "No Piercings";

  const custom = {
    ...scrapeText("hair color", '[data-test="link_hair_color"] .text-underline-always'),
    ...scrapeText("eye color", '[data-test="link_eye_color"] .text-underline-always'),
    ...scrapeText("ethnicity", '[data-test="link_ethnicity"] .text-underline-always'),
    ...getHeight(),
    ...getWeight(),
    ...getMeasurements(),
    ...getChestSize(),
    ...getWaistSize(),
    ...getHipSize(),
    ...getBraSize(),
    ...getBirthplace(),
    ...getZodiac(),
    ...getGender(),
  };

  const data = {
    ...getNationality(),
    ...getAge(),
    ...getAlias(),
    ...(await getAvatar()),
    custom,
  };

  if (!isBlacklisted("labels")) {
    data.labels = [];
    if (custom["hair color"]) data.labels.push(`${custom["hair color"]} Hair`);
    if (custom["eye color"]) data.labels.push(`${custom["eye color"]} Eyes`);
    if (custom.ethnicity) data.labels.push(custom.ethnicity);
    if (custom.gender) data.labels.push("Female");
    if (hasPiercings) data.labels.push("Piercings");
    if (hasTattoos) data.labels.push("Tattoos");
  }

  if (args.dry === true) {
    $log("Would have returned:", data);
    return {};
  }
  return data;
};
