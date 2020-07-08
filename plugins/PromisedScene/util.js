/**
 * @param {string} answer - string to compare
 * @returns {boolean} if the answer is a positive confirmation (i.e. "yes")
 */
const isPositiveAnswer = (answer = "") => ["y", "yes"].includes(answer.toLowerCase());

/**
 * @param {number} timestamp - Time string to be converted to timestamp
 * @returns TODO:
 */
function timeConverter(timestamp) {
  const dateNotFormatted = new Date(timestamp);

  let formattedString = dateNotFormatted.getFullYear() + "-";

  if (dateNotFormatted.getMonth() < 9) {
    formattedString += "0";
  }

  formattedString += dateNotFormatted.getMonth() + 1;

  formattedString += "-";

  if (dateNotFormatted.getDate() < 10) {
    formattedString += "0";
  }
  formattedString += dateNotFormatted.getDate();

  return formattedString;
}

/**
 * @param {string} str - String to be cleaned of: "P.O.V." "/[^a-zA-Z0-9'/\\,(){}]/" (i should make this a file of customizable strings to clean? maybe?)
 * @param {boolean} [keepDate=false] - Boolean that identifies if it should clean a string with dates or not | True = does not remove zeros in front of a number from 1 - 9
 * @returns {string} return the string with all of the unwanted characters removed from the string
 */
function stripStr(str, keepDate = false) {
  str = str.toString();

  str = str.toLowerCase().replace("'", "");
  str = str.toLowerCase().replace(/P.O.V./gi, "pov");
  if (!keepDate) {
    str = str.toLowerCase().replace(/\b0+/g, "");
  }

  str = str.replace(/[^a-zA-Z0-9'/\\,(){}]/g, " ");

  str = str.replace(/  +/g, " ");
  return str;
}

/**
 * @param {*} rl - the readline interface to use
 * @param {boolean} TestingStatus - if should just print test questions and use the param answer
 * @param {*} $log - logger function
 * @returns {(question: string, testQuestion: string, testAnswer: string) => Promise<string>} the question prompt function
 */
const createQuestionPrompter = (rl, TestingStatus, $log) => {
  /**
   * @param {string} question - the question to ask
   * @param {string} testQuestion - the name of the question (for test mode)
   * @param {string} testAnswer - the answer that will be returned (for test mode)
   * @returns {Promise<string>} the result of the question, or the inputted answer for test mode
   * @async
   */
  const questionAsync = async (question, testQuestion, testAnswer) => {
    if (TestingStatus) {
      $log(`:::::${testQuestion}:::: ${testAnswer}`);
      return testAnswer;
    }

    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  };

  return questionAsync;
};

module.exports = {
  isPositiveAnswer,
  timeConverter,
  stripStr,
  createQuestionPrompter,
};
