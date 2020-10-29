import { SceneContext, SceneOutput } from "../../types/scene";
import { Api } from "./api";
import {
  createQuestionPrompter,
  escapeRegExp,
  isPositiveAnswer,
  ManualTouchChoices,
  stripStr,
  timeConverter,
  DeepPartial,
} from "./util";

const levenshtein = require("./levenshtein.js");
interface MyContext extends SceneContext {
  args: DeepPartial<{
    parseActor: boolean;
    parseStudio: boolean;
    ManualTouch: boolean;
    SceneDuplicationCheck: boolean;
    source_settings: {
      Actors: string;
      Studios: string;
      Scenes: string;
    };
  }>;
  testMode: DeepPartial<{
    questionAnswers: {
      enterInfoSearch: string;
      enterMovie: string;
      enterOneActorName: string;
      enterSceneDate: string;
      enterSceneTitle: string;
      enterStudioName: string;
      movieTitle: string;
      manualDescription: string;
      manualActors: string;
      multipleChoice: string;
    };
    CorrectImportInfo: string;
    testSiteUnavailable: boolean;
    status: boolean;
  }>;
}

interface TitleObj {
  title: string;
  slug: string;
}

function applyStudioAndActors(
  result: { actors?: string[]; studio?: string } | undefined,
  actor: string[],
  studio: string[]
): void {
  if (!result) {
    return;
  }

  if (!result.actors && Array.isArray(actor) && actor.length) {
    result.actors = actor;
  }
  if (!result.studio && Array.isArray(studio) && studio.length) {
    result.studio = studio[0];
  }
}

module.exports = async (ctx: MyContext): Promise<SceneOutput> => {
  const {
    event,
    $throw,
    $fs,
    $moment,
    $log,
    testMode,
    sceneName,
    scenePath,
    args,
    $inquirer,
    $createImage,
  } = ctx;
  // Array Variable that will be returned
  const result: SceneOutput = {};

  /**
   * If makeChoices() was already run
   */
  let didRunMakeChoices = false;
  // Variable that is used for all the "manualTouch" questions

  const cleanPathname = stripStr(scenePath.toString());

  // Making sure that the event that triggered is the correct event

  if (event !== "sceneCreated" && event !== "sceneCustom" && testMode?.status !== true) {
    $throw(" ERR: Plugin used for unsupported event");
  }

  // Checking all of the arguments are set in the plugin

  if (args?.source_settings === undefined) {
    $throw(" ERR: Missing source_settings in plugin args");
  }

  if (args?.parseActor === undefined) {
    $throw(" ERR: Missing ParseActor in plugin args");
  }

  if (args?.parseStudio === undefined) {
    $throw(" ERR: Missing parseStudio in plugin args");
  }

  if (args?.ManualTouch === undefined) {
    $throw(" ERR: Missing ManualTouch in plugin args");
  }

  if (args?.SceneDuplicationCheck === undefined) {
    $throw(" ERR: Missing SceneDuplicationCheck in plugin args");
  }

  const tpdbApi = new Api(ctx);

  $log(` MSG: STARTING to analyze scene: ${scenePath}`);
  // -------------------ACTOR Parse

  // This is where the plugin attempts to check for Actors using the Actors.db

  // creating a array to use for other functions
  const gettingActor: string[] = [];
  const actor: string[] = [];

  if (args?.parseActor && args?.source_settings?.Actors) {
    $log(`:::::PARSE:::: Parsing Actors DB ==> ${args.source_settings.Actors}`);
    $fs
      .readFileSync(args.source_settings.Actors, "utf8")
      .split("\n")
      .forEach((line) => {
        if (!line) {
          return;
        }

        const matchActor = new RegExp(escapeRegExp(JSON.parse(line).name), "i");

        const actorLength = matchActor.toString().split(" ");

        if (actorLength.length < 2) {
          return;
        }

        const foundActorMatch = stripStr(scenePath).match(matchActor);

        if (foundActorMatch !== null) {
          gettingActor.push(JSON.parse(line).name);
          return;
        }

        const allAliases: string[] = JSON.parse(line).aliases.toString().split(",");

        allAliases.forEach((personAlias) => {
          const aliasLength = personAlias.toString().split(" ");

          if (aliasLength.length < 2) {
            return;
          }

          let matchAliasActor = new RegExp(escapeRegExp(personAlias), "i");

          let foundAliasActorMatch = stripStr(scenePath).match(matchAliasActor);

          if (foundAliasActorMatch !== null) {
            gettingActor.push("alias:" + JSON.parse(line).name);
          } else {
            const aliasNoSpaces = personAlias.toString().replace(" ", "");

            matchAliasActor = new RegExp(escapeRegExp(aliasNoSpaces), "i");

            foundAliasActorMatch = stripStr(scenePath).match(matchAliasActor);

            if (foundAliasActorMatch !== null) {
              gettingActor.push("alias:" + JSON.parse(line).name);
            }
          }
        });
      });

    let actorHighScore = 5000;
    if (gettingActor.length && Array.isArray(gettingActor)) {
      gettingActor.forEach((person) => {
        // This is a function that will see how many differences it will take to make the string match.
        // The lowest amount of changes means that it is probably the closest match to what we need.
        // lowest score wins :)
        let foundAnAlias = false;
        if (person.includes("alias:")) {
          person = person.toString().replace("alias:", "").trim();
          foundAnAlias = true;
        }
        const found = levenshtein(person.toString().toLowerCase(), cleanPathname);

        if (found < actorHighScore) {
          actorHighScore = found;

          actor[0] = person;
        }
        if (foundAnAlias) {
          $log(`    SUCCESS: Found Actor-Alias: ` + person);
        } else {
          $log(`    SUCCESS: Found Actor: ` + person);
        }
      });
      $log(`---> Using "best match" Actor For Search: ` + actor);
    }
  }
  // -------------------STUDIO Parse

  // This is where the plugin attempts to check for Studios using the Studios.db

  // creating a array to use for other functions

  const gettingStudio: string[] = [];

  const studio: string[] = [];

  if (args?.parseStudio && args?.source_settings?.Studios) {
    $log(`:::::PARSE:::: Parsing Studios DB ==> ${args.source_settings.Studios}`);

    $fs
      .readFileSync(args.source_settings.Studios, "utf8")
      .split("\n")
      .forEach((line) => {
        if (!line) {
          return;
        }

        if (!JSON.parse(line).name) {
          return;
        }
        let matchStudio = new RegExp(escapeRegExp(JSON.parse(line).name), "i");

        const foundStudioMatch = stripStr(scenePath).match(matchStudio);

        if (foundStudioMatch !== null) {
          gettingStudio.push(JSON.parse(line).name);
        } else if (JSON.parse(line).name !== null) {
          matchStudio = new RegExp(escapeRegExp(JSON.parse(line).name.replace(/ /g, "")), "i");

          const foundStudioMatch = stripStr(scenePath).match(matchStudio);

          if (foundStudioMatch !== null) {
            gettingStudio.push(JSON.parse(line).name);
          }
        }

        if (!JSON.parse(line).aliases) {
          return;
        }

        const allStudioAliases = JSON.parse(line).aliases.toString().split(",");

        allStudioAliases.forEach((studioAlias) => {
          if (studioAlias) {
            let matchAliasStudio = new RegExp(escapeRegExp(studioAlias), "i");

            let foundAliasStudioMatch = stripStr(scenePath).match(matchAliasStudio);

            if (foundAliasStudioMatch !== null) {
              gettingStudio.push("alias:" + JSON.parse(line).name);
            } else {
              const aliasNoSpaces = studioAlias.toString().replace(" ", "");

              matchAliasStudio = new RegExp(escapeRegExp(aliasNoSpaces), "i");

              foundAliasStudioMatch = stripStr(scenePath).match(matchAliasStudio);

              if (foundAliasStudioMatch !== null) {
                gettingStudio.push("alias:" + JSON.parse(line).name);
              }
            }
          }
        });
      });
    // this is a debug option to se see how many studios were found by just doing a simple regex
    // $log(GettingStudio);
    let studioHighScore = 5000;
    if (gettingStudio.length && Array.isArray(gettingStudio)) {
      let foundStudioAnAlias = false;
      let instanceFoundStudioAnAlias = false;
      gettingStudio.forEach((stud) => {
        if (stud.includes("alias:")) {
          stud = stud.toString().replace("alias:", "").trim();
          instanceFoundStudioAnAlias = true;
        }

        // This is a function that will see how many differences it will take to make the string match.
        // The lowest amount of changes means that it is probably the closest match to what we need.
        // lowest score wins :)
        const found = levenshtein(stud.toString().toLowerCase(), cleanPathname);

        if (found < studioHighScore) {
          studioHighScore = found;

          studio[0] = stud;
          foundStudioAnAlias = instanceFoundStudioAnAlias;
        }
        if (foundStudioAnAlias) {
          $log(`    SUCCESS: Found Studio-Alias: ` + studio[0]);
        } else {
          $log(`    SUCCESS: Found Studio: ` + studio[0]);
        }
      });

      $log(`---> Using "best match" Studio For Search: ` + studio);
    }
  }
  // Try to PARSE the SceneName and determine Date

  const ddmmyyyy = stripStr(scenePath, true).match(/\d\d \d\d \d\d\d\d/);

  const yyyymmdd = stripStr(scenePath, true).match(/\d\d\d\d \d\d \d\d/);

  const yymmdd = stripStr(scenePath, true).match(/\d\d \d\d \d\d/);

  let timestamp = Number.NaN;

  $log(":::::PARSE:::: Parsing Date from ScenePath");
  // $log(stripStr(scenePath, true));

  if (yyyymmdd && yyyymmdd.length) {
    const date = yyyymmdd[0].replace(" ", ".");

    $log("   SUCCESS: Found => yyyymmdd");

    timestamp = $moment(date, "YYYY-MM-DD").valueOf();
  } else if (ddmmyyyy && ddmmyyyy.length) {
    const date = ddmmyyyy[0].replace(" ", ".");

    $log("   SUCCESS: Found => ddmmyyyy");

    timestamp = $moment(date, "DD-MM-YYYY").valueOf();
  } else if (yymmdd && yymmdd.length) {
    const date = yymmdd[0].replace(" ", ".");

    $log("   SUCCESS: Found => yymmdd");

    timestamp = $moment(date, "YY-MM-DD").valueOf();
  } else {
    $log("   FAILED: Could not find a date in the ScenePath");
  }

  // Function that is called to convert a found date into a timestamp.

  // After everything has completed parsing, I run a function that will perform all of the lookups against TPDB

  const finalCallResult = await doASearch(actor, studio, timestamp);
  if (Array.isArray(finalCallResult)) {
    return {};
  }

  return finalCallResult || {};

  // -------------------------------------------------------------

  // -------------------Functions & Async functions---------------

  // -------------------------------------------------------------

  /**
   * Logs all the properties of the object
   *
   * @param results - the result object
   */
  function logResultObject(results: SceneOutput): void {
    for (const property in results) {
      if (property === "releaseDate") {
        $log(`${property}: ${timeConverter(results[property] ?? 0)}`);
      } else {
        $log(`${property}: ${results[property]}`);
      }
    }
  }

  /**
   * Standard block of manual questions that prompt the user for input
   * @returns either an array of all questions that need to be import manually
   */
  async function manualImport(): Promise<SceneOutput | TitleObj[] | undefined> {
    const questionAsync = createQuestionPrompter($inquirer, testMode?.status, $log);

    const { isMovie: manualMovieAnswer } = await questionAsync<{ isMovie: string }>({
      type: "input",
      name: "isMovie",
      message: "Is this a Scene from a Movie / Set / Collection?: (y/N) ",
      testAnswer: testMode?.questionAnswers?.enterMovie ?? "",
    });

    const manualEnterMovieSearch = isPositiveAnswer(manualMovieAnswer);

    if (manualEnterMovieSearch) {
      const { titleOfMovie: manualMovieName } = await questionAsync<{ titleOfMovie: string }>({
        type: "input",
        name: "titleOfMovie",
        message: "What is the Title of the Movie?: ",
        testAnswer: testMode?.questionAnswers?.movieTitle ?? "",
      });

      if (result.movie === undefined && manualMovieName !== "") {
        result.movie = manualMovieName;
      }
    }

    const { titleOfScene: manualEnterTitleScene } = await questionAsync<{ titleOfScene: string }>({
      type: "input",
      name: "titleOfScene",
      message: "What is the TITLE of the scene?: ",
      testAnswer: testMode?.questionAnswers?.enterSceneTitle ?? "",
    });

    result.name = manualEnterTitleScene;

    const { releaseDateOfScene: manualEnterReleaseDateScene } = await questionAsync<{
      releaseDateOfScene: string;
    }>({
      type: "input",
      name: "releaseDateOfScene",
      message: "What is the RELEASE DATE of the scene (YYYY.MM.DD)?: ",
      testAnswer: testMode?.questionAnswers?.enterSceneDate ?? "",
    });

    if (manualEnterReleaseDateScene) {
      const questYear = manualEnterReleaseDateScene.toString().match(/\d\d\d\d.\d\d.\d\d/);

      $log(" MSG: Checking Date");

      if (questYear && questYear.length) {
        const date = questYear[0];

        $log(" MSG: Found => yyyymmdd");

        result.releaseDate = $moment(date, "YYYY-MM-DD").valueOf();
      }
    }

    const { descriptionOfScene: manualEnterDescriptionOfScene } = await questionAsync<{
      descriptionOfScene: string;
    }>({
      type: "input",
      name: "descriptionOfScene",
      message: "What is the DESCRIPTION for the scene?: ",
      testAnswer: testMode?.questionAnswers?.manualDescription ?? "",
    });

    result.description = manualEnterDescriptionOfScene;

    const { actorsOfScene: splitActors } = await questionAsync<{ actorsOfScene: string }>({
      type: "input",
      name: "actorsOfScene",
      message: `What are the Actors NAMES in the scene?: (separated by Comma)`,
      testAnswer: testMode?.questionAnswers?.manualActors ?? "",
      default() {
        return `${actor.length ? ` ${actor.join(", ")}` : ""}`;
      },
    });

    const areActorsBlank = !splitActors || !splitActors.trim();

    if (!areActorsBlank) {
      result.actors = splitActors.trim().split(",");
    }

    const { studioOfScene: askedStudio } = await questionAsync<{ studioOfScene: string }>({
      type: "input",
      name: "studioOfScene",
      message: `What Studio NAME is responsible for the scene?:`,
      testAnswer: testMode?.questionAnswers?.enterStudioName ?? "",
      default() {
        return `${studio[0] ? ` ${studio[0]}` : ""}`;
      },
    });

    const isStudioBlank = askedStudio === "" || askedStudio === " " || askedStudio === null;

    if (!isStudioBlank) {
      result.studio = askedStudio;
    }

    $log("====  Final Entry =====");

    applyStudioAndActors(result, actor, studio);
    logResultObject(result);

    if (args?.ManualTouch) {
      const { correctImportInfo: resultsConfirmation } = await questionAsync<{
        correctImportInfo: string;
      }>({
        type: "input",
        name: "correctImportInfo",
        message: "Is this the correct scene details to import? (y/N)",
        testAnswer: testMode ? testMode.CorrectImportInfo : "",
      });

      if (isPositiveAnswer(resultsConfirmation)) {
        return result;
      } else {
        const res = await makeChoices();
        return res;
      }
    } else {
      return result;
    }
  }

  /**
   * Provides 3 choices to be completed:
   * 1. search again => Completes a manual Search of The Porn Database
   * 2. manual info => plugin returns "manualImport"
   * 3. Do nothing => plugin does not return any results (empty object)
   * @returns {Promise<object>} ???
   */
  async function makeChoices(): Promise<SceneOutput | TitleObj[] | undefined> {
    if (!args?.ManualTouch) {
      $log(" Config ==> [ManualTouch]  MSG: SET TO FALSE ");
      if (didRunMakeChoices) {
        $log("  MSG: returning nothing");
        return {};
      } else {
        $log("  MSG: Trying a single Aggressive Search --> ");
        didRunMakeChoices = true;
        const aggressiveSearchNoManual = await run(scenePath, true);

        return aggressiveSearchNoManual;
      }
    } else {
      const questionActor: string[] = [];

      const questionStudio: string[] = [];

      let questionDate;

      /* If testmode is running and a question has already been asked,
       *  we always want the second option to do nothing and return nothing
       */
      if (didRunMakeChoices && testMode) {
        return {};
      }

      try {
        const questionAsync = createQuestionPrompter($inquirer, testMode?.status, $log);

        $log(" Config ==> [ManualTouch]  MSG: SET TO TRUE ");
        const { choices: Q1Answer } = await questionAsync<{ choices: string }>({
          type: "rawlist",
          name: "choices",
          message: "Would you like to:",
          testAnswer: testMode?.questionAnswers?.enterInfoSearch ?? "",
          choices: Object.values(ManualTouchChoices),
        });

        didRunMakeChoices = true;

        if (Q1Answer === ManualTouchChoices.MANUAL_ENTER) {
          const manualInfo = await manualImport();
          return manualInfo;
        }

        if (Q1Answer === ManualTouchChoices.NOTHING) {
          return {};
        }

        const { movieSearch: movieAnswer } = await questionAsync<{ movieSearch: string }>({
          type: "input",
          name: "movieSearch",
          message: "Is this a Scene from a Movie / Set / Collection?: (y/N) ",
          testAnswer: testMode?.questionAnswers?.enterMovie ?? "",
        });
        const enterMovieSearch = isPositiveAnswer(movieAnswer);

        if (enterMovieSearch) {
          const { manualMovieTitleSearch: movieName } = await questionAsync<{
            manualMovieTitleSearch: string;
          }>({
            type: "input",
            name: "manualMovieTitleSearch",
            message: "What is the Title of the Movie?: ",
            testAnswer: testMode?.questionAnswers?.movieTitle ?? "",
          });

          if (result.movie === undefined && movieName !== "") {
            result.movie = movieName;
          }
        }
        const { manualActorSearch: Q2Actor } = await questionAsync<{ manualActorSearch: string }>({
          type: "input",
          name: "manualActorSearch",
          message: `What is ONE of the Actors NAME in the scene?:`,
          testAnswer: testMode?.questionAnswers?.enterOneActorName ?? "",
          default() {
            return `${actor[0] ? ` ${actor[0]}` : ""}`;
          },
        });

        questionActor.push(Q2Actor);
        if (Array.isArray(actor) && !actor.length) {
          actor.push(Q2Actor);
        }

        const { manualStudioSearch: Q3Studio } = await questionAsync<{
          manualStudioSearch: string;
        }>({
          type: "input",
          name: "manualStudioSearch",
          message: `What Studio NAME is responsible for the scene?:`,
          testAnswer: testMode?.questionAnswers?.enterStudioName ?? "",
          default() {
            return `${studio[0] ? ` ${studio[0]}` : ""}`;
          },
        });

        questionStudio.push(Q3Studio);
        if (Array.isArray(studio) && !studio.length) {
          studio.push(Q3Studio);
        }
        const { manualDateSearch: Q4date } = await questionAsync<{ manualDateSearch: string }>({
          type: "input",
          name: "manualDateSearch",
          message: "What is the release date (YYYY.MM.DD)?: (Blanks allowed) ",
          testAnswer: testMode?.questionAnswers?.enterSceneDate ?? "",
          default() {
            const dottedTimestamp = timeConverter(timestamp).replace("-", ".");
            if (dottedTimestamp && !isNaN(+dottedTimestamp)) {
              return ` ${dottedTimestamp}`;
            }
            return "";
          },
        });

        if (Q4date !== "") {
          const questYear = Q4date.match(/\d\d\d\d.\d\d.\d\d/);

          $log(" MSG: Checking Date");

          if (questYear && questYear.length) {
            const date = questYear[0];

            $log(" MSG: Found => yyyymmdd");

            questionDate = $moment(date, "YYYY-MM-DD").valueOf();
          }
        }

        // Re run the search with user's input
        const res = await doASearch(questionActor, questionStudio, questionDate);

        return res;
      } catch (error) {
        $log("Something went wrong asking for search questions", error);
      }
    }
  }

  /**
   * Retrieves the scene titles or details from TPDB
   *
   * @param parseQuery - what tpdb should parse
   * @param aggressiveSearch - if the search does not only have 1 result, if this should run a manual import instead of trying to get titles
   * @returns either an array of all the possible Porn Database search results, or a data object for the proper "found" scene
   */
  async function run(
    parseQuery: string,
    aggressiveSearch = false
  ): Promise<SceneOutput | TitleObj[] | undefined> {
    const res = await tpdbApi.parseScene(parseQuery);
    $log(
      `Scene search url: ${res.config.url}?parse=${encodeURIComponent(parseQuery)}`
    );

    // checking the status of the link or site, will escape if the site is down

    if (
      res.status !== 200 ||
      !res.data ||
      testMode?.testSiteUnavailable
    ) {
      $log(" ERR: TPDB API query failed");

      if (testMode?.status && !testMode?.testSiteUnavailable) {
        $log("!! This will impact the test if it was not expecting a failure !!");
      }

      const manualInfo = await makeChoices();
      return manualInfo;
    }

    // Grab the content data of the fed link
    const sceneSearchResult = res.data;

    // setting the scene index to an invalid value by default
    let correctSceneIdx = -1;

    // If a result was returned, it sets it to the first entry
    if (sceneSearchResult.data.length === 1) {
      correctSceneIdx = 0;
    }

    // making a variable to store all of the titles of the found results (in case we need the user to select a scene)
    const allTitles: TitleObj[] = [];

    // When completing an aggressive search, We don't want "extra stuff" -- it should only have 1 result that is found!
    if (aggressiveSearch && correctSceneIdx === -1) {
      $log(" ERR: TPDB Could NOT find correct scene info");

      const manualInfo = await makeChoices();
      return manualInfo;
    } else {
      // list the found results and tries to match the SCENENAME to the found results.
      // all while gathering all of the titles, in case no match is found

      if (sceneSearchResult.data.length > 1) {
        $log(`     SRCH: ${sceneSearchResult.data.length} results found`);

        for (let sceneIdx = 0; sceneIdx < sceneSearchResult.data.length; sceneIdx++) {
          const scene = sceneSearchResult.data[sceneIdx];

          allTitles[sceneIdx] = { title: scene.title, slug: scene.slug };

          // making variables to use to eliminate Actors and scenes from the search results.

          // It is better to search just the title.  We already have the actor and studio.

          let searchedTitle = stripStr(sceneName).toString().toLowerCase();

          let matchTitle = stripStr(allTitles[sceneIdx].title).toString().toLowerCase();

          // lets remove the actors from the scenename and the searched title -- We should already know this

          for (let j = 0; j < actor.length; j++) {
            searchedTitle = searchedTitle.replace(actor[j].toString().toLowerCase(), "");

            matchTitle = matchTitle.replace(actor[j].toString().toLowerCase(), "").trim();
          }

          // lets remove the Studio from the scenename and the searched title -- We should already know this

          if (studio[0] !== undefined) {
            searchedTitle = searchedTitle.replace(studio[0].toString().toLowerCase(), "");

            searchedTitle = searchedTitle.replace(
              studio[0].toString().toLowerCase().replace(" ", ""),
              ""
            );

            matchTitle = matchTitle.replace(studio[0].toString().toLowerCase(), "").trim();
          }

          // Only Run a match if there is a searched title to execute a match on

          if (matchTitle !== undefined) {
            $log(
              `     SRCH: Trying to match TPD title: ` +
                matchTitle.toString().trim() +
                " --with--> " +
                searchedTitle.toString().trim()
            );

            const matchTitleRegex = new RegExp(escapeRegExp(matchTitle.toString().trim()), "i");

            if (searchedTitle !== undefined) {
              if (searchedTitle.toString().trim().match(matchTitleRegex)) {
                correctSceneIdx = sceneIdx;

                break;
              }
            }
          }
        }
      }

      // making sure the scene was found (-1 is not a proper scene value)
      if (correctSceneIdx === -1) {
        // Will provide a list back the user if no Scene was found

        if (sceneSearchResult.data.length > 1 && args?.ManualTouch === true) {
          $log(" ERR: TPDB Could NOT find correct scene info, here were the results");

          return allTitles;
        }

        $log(" ERR: TPDB Could NOT find correct scene info");

        const manualInfo = await makeChoices();
        return manualInfo;
      }
    }

    const tpdbSceneSearchData = sceneSearchResult.data[correctSceneIdx];

    // return all of the information to TPM

    if (tpdbSceneSearchData.title !== "") {
      // Is there a duplicate scene already in the Database with that name?
      let foundDupScene = false;
      // If i decide to do anything with duplicate scenes, this variable on the next line will come into play
      // let TheDupedScene = [];
      if (args?.SceneDuplicationCheck && args?.source_settings?.Scenes) {
        const lines = $fs.readFileSync(args.source_settings.Scenes, "utf8").split("\n");

        let line = lines.shift();
        while (!foundDupScene && line) {
          if (!line || !stripStr(JSON.parse(line).name.toString())) {
            line = lines.shift();
            continue;
          }

          let matchScene = new RegExp(
            escapeRegExp(stripStr(JSON.parse(line).name.toString())),
            "gi"
          );

          const foundSceneMatch = stripStr(tpdbSceneSearchData.title).match(matchScene);

          if (foundSceneMatch !== null) {
            foundDupScene = true;
            // TheDupedScene = stripStr(JSON.parse(line).name.toString());
          } else if (stripStr(JSON.parse(line).name.toString()) !== null) {
            matchScene = new RegExp(
              escapeRegExp(stripStr(JSON.parse(line).name.toString()).replace(/ /g, "")),
              "gi"
            );

            const foundSceneMatch = stripStr(tpdbSceneSearchData.title).match(matchScene);

            if (foundSceneMatch !== null) {
              // TheDupedScene = stripStr(JSON.parse(line).name.toString());
              foundDupScene = true;
            }
          }

          line = lines.shift();
        }
      }
      if (foundDupScene) {
        // Found a possible duplicate

        $log(" [Title Duplication check] === Found a possible duplicate title in the database");

        // Exit? Break? Return?

        result.name = tpdbSceneSearchData.title;
      } else {
        result.name = tpdbSceneSearchData.title;
      }
    }

    if (tpdbSceneSearchData.description !== "") {
      result.description = tpdbSceneSearchData.description;
    }

    if (tpdbSceneSearchData.date !== "") {
      result.releaseDate = new Date(tpdbSceneSearchData.date).getTime();
    }

    if (
      tpdbSceneSearchData.background.large !== "" &&
      tpdbSceneSearchData.background.large !== "https://cdn.metadataapi.net/default.png"
    ) {
      result.thumbnail = tpdbSceneSearchData.background.large;
    }

    if (tpdbSceneSearchData.performers) {
      result.actors = tpdbSceneSearchData.performers.map((p) => p.name);
    }

    if (tpdbSceneSearchData.site.name !== "") {
      if (Array.isArray(studio) && studio.length) {
        result.studio = studio.toString().trim();
      } else {
        result.studio = tpdbSceneSearchData.site.name;
      }
    }

    $log(" Returning the results");

    return result;
  }

  /**
   * Grabs a list of all the searchable Studios or websites available in TPDB
   *
   * @returns either an array of all the Porn Database hosted sites, or no data
   */
  async function grabSites(): Promise<string[]> {
    try {
      const siteListRes = await tpdbApi.getSites();
      $log(`MSG: Grabbing all available Studios on Metadataapi: ${siteListRes.config.url}`);

      if (
        siteListRes.status !== 200 ||
        !siteListRes.data ||
        (testMode?.testSiteUnavailable !== undefined && testMode?.testSiteUnavailable)
      ) {
        $log(" ERR: TPDB site Not Available OR the API query failed");

        if (testMode?.status && !testMode?.testSiteUnavailable) {
          $log("!! This will impact the test if it was not expecting a failure !!");
        }

        return [];
      }

      const siteListResult = siteListRes.data;

      // loops through all of the sites and grabs the "shortname" for the Studio or website

      const allSites = siteListResult.data.map((el) => el.short_name);

      return allSites;
    } catch (err) {
      $log("Error returning results from TPD...", err);
      return [];
    }
  }

  /**
   * The (Backbone) main Search function for the plugin
   *
   * @param searchActor - The URL API that has the sites hosted on TPD
   * @param searchStudio - The URL API that has the sites hosted on TPD
   * @param searchFuncTimestamp - The URL API that has the sites hosted on TPD
   * @returns return the proper scene information (either through manual questions or automatically)
   */
  async function doASearch(
    searchActor: string[] | string,
    searchStudio: string[] | string,
    searchFuncTimestamp: number
  ): Promise<SceneOutput | TitleObj[] | undefined> {
    // check to see if the Studio and Actor are available for searching.

    if (
      Array.isArray(searchStudio) &&
      searchStudio.length &&
      Array.isArray(searchActor) &&
      searchActor.length
    ) {
      // Grabs the searchable sites in TPM

      const studioShortNames = await grabSites();

      let doesSiteExist;

      let compareHighScore = 5000;

      for (const studioName of studioShortNames) {
        const siteNoSpaces = new RegExp(escapeRegExp(studioName), "gi");

        const studioWithNoSpaces = searchStudio.toString().replace(/ /gi, "");

        const foundStudioInAPI = studioWithNoSpaces.match(siteNoSpaces);

        if (foundStudioInAPI !== null) {
          const levenFound = levenshtein(foundStudioInAPI.toString(), searchStudio.toString());

          if (levenFound < compareHighScore) {
            compareHighScore = levenFound;
            doesSiteExist = foundStudioInAPI;
          }
        }
      }

      if (!doesSiteExist) {
        $log(
          " ERR: This Studio does not exist in ThePornDatabase.  No searches are possible with this Studio / Network"
        );

        const manualInfo = await makeChoices();
        return manualInfo;
      }

      $log(":::::MSG: Checking TPDB for Data Extraction");

      let tpdbParseQuery = "";

      // making the search string based on the timestamp or not

      if (isNaN(searchFuncTimestamp)) {
        $log(":::::MSG: Placing TPDB Search string without timestamp...");

        tpdbParseQuery = `${searchStudio[0]} ${searchActor[0]}`;
      } else {
        $log(":::::MSG: Placing TPDB Search string");

        tpdbParseQuery = `${searchStudio[0]} ${searchActor[0]} ${timeConverter(
          searchFuncTimestamp
        )}`;
      }

      // Grabbing the results using the "Normal" Search methods (comparing against scene name)

      $log(":::::MSG: Running TPDB Primary Search on: " + tpdbParseQuery);

      const grabResults = await run(tpdbParseQuery);
      // Once the results have been searched, we need to do something with them
      if (grabResults && Array.isArray(grabResults)) {
        // Run through the list of titles and ask if they would like to choose one.
        $log("#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#");

        const answersList: string[] = [];
        const possibleTitles: string[] = [];
        for (let titleIdx = 0; titleIdx < Object.keys(grabResults).length; titleIdx++) {
          answersList.push(grabResults[titleIdx].title);
          possibleTitles.push(grabResults[titleIdx].title);
        }

        const questionAsync = createQuestionPrompter($inquirer, testMode?.status, $log);
        answersList.push((new $inquirer.Separator() as any) as string);
        answersList.push("== None of the above == ");
        answersList.push("== Manual Search == ");

        const { searchedTitles: multipleSitesAnswer } = await questionAsync<{
          searchedTitles: string;
        }>({
          type: "rawlist",
          name: "searchedTitles",
          message: "Which Title would you like to use?",
          testAnswer: testMode?.questionAnswers?.multipleChoice ?? "",
          choices: answersList,
        });

        const findResultIndex = possibleTitles.indexOf(multipleSitesAnswer.trim());

        if (findResultIndex < 0) {
          if (args?.ManualTouch) {
            const manualInfo = await makeChoices();
            return manualInfo;
          } else {
            return {};
          }
        } else {
          const selectedTitle = grabResults[possibleTitles.indexOf(multipleSitesAnswer)]?.slug;

          $log(" MSG: Running Aggressive-Grab Search on: " + selectedTitle);
          const goGetIt = await run(selectedTitle, true);

          if (!goGetIt) {
            $log("Failed to run, quitting");
            return {};
          }

          if (Array.isArray(goGetIt)) {
            $log("run() gave unexpected result, quitting");
            return {};
          }

          $log("====  Final Entry =====");

          applyStudioAndActors(goGetIt, actor, studio);
          logResultObject(goGetIt);

          if (args?.ManualTouch) {
            const { correctImportInfo: resultsConfirmation } = await questionAsync<{
              correctImportInfo: string;
            }>({
              type: "input",
              name: "correctImportInfo",
              message: "Does this information look like the correct information to import? (y/N)",
              testAnswer: testMode ? testMode.CorrectImportInfo : "",
            });

            if (isPositiveAnswer(resultsConfirmation)) {
              if (goGetIt.thumbnail) {
                try {
                  const thumbnailFile = await $createImage(
                    goGetIt.thumbnail,
                    goGetIt.name || "",
                    true
                  );
                  goGetIt.thumbnail = thumbnailFile.toString();
                } catch (e) {
                  $log("No thumbnail found");
                }
              }

              return goGetIt;
            } else {
              const res = await makeChoices();
              return res;
            }
          } else {
            if (goGetIt.thumbnail) {
              try {
                const thumbnailFile = await $createImage(
                  goGetIt.thumbnail,
                  goGetIt.name || "",
                  true
                );

                goGetIt.thumbnail = thumbnailFile.toString();
              } catch (e) {
                $log("No thumbnail found");
              }
            }

            return goGetIt;
          }
        }
      } else if (grabResults && typeof grabResults === "object") {
        // Will return any of the values found
        const questionAsync = createQuestionPrompter($inquirer, testMode?.status, $log);

        $log("====  Final Entry =====");

        applyStudioAndActors(grabResults, actor, studio);
        logResultObject(grabResults);

        if (args?.ManualTouch) {
          const { correctImportInfo: resultsConfirmation } = await questionAsync<{
            correctImportInfo: string;
          }>({
            type: "input",
            name: "correctImportInfo",
            message: "Does this information look like the correct information to import? (y/N)",
            testAnswer: testMode ? testMode.CorrectImportInfo : "",
          });

          if (isPositiveAnswer(resultsConfirmation)) {
            if (grabResults.thumbnail) {
              try {
                const thumbnailFile = await $createImage(
                  grabResults.thumbnail,
                  grabResults.name || "",
                  true
                );

                grabResults.thumbnail = thumbnailFile.toString();
              } catch (e) {
                $log("No thumbnail found");
              }
            }

            return grabResults;
          } else {
            const res = await makeChoices();
            return res;
          }
        } else {
          if (grabResults.thumbnail) {
            try {
              const thumbnailFile = await $createImage(
                grabResults.thumbnail,
                grabResults.name || "",
                true
              );

              grabResults.thumbnail = thumbnailFile.toString();
            } catch (e) {
              $log("No thumbnail found");
            }
          }

          return grabResults;
        }
      }

      // If there was no studio or Actor, and the "Manual Touch" arg is set to TRUE, it will prompt you for entries manually.
    } else {
      $log(" ERR:Could not find a Studio or Actor in the SceneName");
      const res = await makeChoices();
      return res;
    }
  }
};
