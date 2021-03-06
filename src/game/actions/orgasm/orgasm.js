import store from "store";
import createNotification, { dismissNotification } from "engine/createNotification";
import { randomStrokeSpeed, setStrokeSpeed } from "game/utils/strokeSpeed";
import delay from "utils/delay";
import play from "engine/audio";
import audioLibrary, { getRandomAudioVariation } from "audio";
import { strokerRemoteControl } from "game/loops/strokerLoop";
import determineEdge from "./edge";
import { chance, getRandomInclusiveInteger } from "utils/math";
import elapsedGameTime from "game/utils/elapsedGameTime";
import { stopGame } from "game";
import { getRandomOrgasm } from "game/actions/orgasm/orgasmInTime";
import {
  getRandom_denied_message,
  getRandom_edgeAndHold_message,
  getRandom_ruinOrgasm_message
} from "game/texts/messages";
import createProbability from "game/utils/createProbability";
import { applyProbability } from "game/actions/generateAction";

/**
 * Determines whether all initially specified bounds that are necessary to be fulfilled before orgasm are fulfilled.
 *
 * @returns {boolean}
 *   Whether these bounds are fulfilled (`true`) or not (`false`)
 */
export const allowedOrgasm = () => {
  const {
    game: { ruins, edges },
    config: { minimumRuinedOrgasms, minimumEdges, minimumGameTime }
  } = store;

  return minimumRuinedOrgasms <= ruins && minimumEdges <= edges && elapsedGameTime("minutes") >= minimumGameTime;
};

/**
 * Determines whether it is the right time to orgasm.
 *
 * @returns {boolean}
 *   (`true`) if the user should orgasm now.
 */
export const shouldOrgasm = () => {
  const { config: { maximumGameTime, actionFrequency } } = store;

  let result = false;
  const isAllowedChance = allowedOrgasm();

  if (isAllowedChance) {
    const rand = Math.random();
    const gameCompletionPercent =
      elapsedGameTime("seconds") / (maximumGameTime * 60);

    if (elapsedGameTime("minutes") >= maximumGameTime) {
      // If the game time has gone over return true
      result = true;
    } else {
      // Probability Graph: https://www.desmos.com/calculator/xhyaj1gxuc
      result = gameCompletionPercent ** 4 / actionFrequency > rand;
    }
  }

  return result;
};

/**
 * Makes the user ruin their orgasm.
 * Duplicate code is necessary due to game end functionality.
 *
 * @returns {Promise<done>}
 */
export const doRuin = async () => {
  const { config: { fastestStrokeSpeed } } = store;

  setStrokeSpeed(fastestStrokeSpeed);

  if (store.config.enableVoice) {
    play(audioLibrary.RuinItForMe);
  }

  const nid = createNotification(getRandom_ruinOrgasm_message());

  const done = async () => {
    dismissNotification(nid);
    store.game.ruins++;
    await end();
  };
  done.label = "Ruined";

  return done;
};

/**
 * Selects the standard orgasm or a random advanced if enabled
 *
 * @returns {Promise<*>} action - the action to be executed next
 */
export const advancedOrNotOrgasm = async () => {
  let trigger;
  if (store.config.advancedOrgasm) {
    trigger = getRandomOrgasm();

    // Overwrite if user should be denied instead - only applies to advanced orgasm games
    // denial Chance may increase if user does not behave as expected.
    if (chance(store.game.chanceForDenial)) {
      trigger = doDenied;
    }
  } else {
    trigger = doOrgasm;
  }
  return await trigger();
};

/**
 * Allow the user to cum.
 *
 * @returns {Promise<*[]>}
 */
export const doOrgasm = async () => {
  const { config: { fastestStrokeSpeed } } = store;

  setStrokeSpeed(fastestStrokeSpeed);

  if (store.config.enableVoice) {
    play(getRandomAudioVariation("Orgasm"));
  }

  const nid = createNotification("You have permission to have a full orgasm");

  const done = async () => {
    dismissNotification(nid);

    await postOrgasmTorture();
    await end();
  };
  done.label = "Orgasmed";

  return [done, skip];
};

/**
 * If postOrgasmTorture is active, this task lets the user stroke on with the current stroking style, grip and speed.
 *
 * @returns {Promise<void>}
 */
export const postOrgasmTorture = async () => {
  const {
    config: {
      postOrgasmTorture,
      postOrgasmTortureMinimumTime,
      postOrgasmTortureMaximumTime
    }
  } = store;

  if (postOrgasmTorture) {
    const nid = createNotification("Time for a little post-orgasm torture, don't you dare stop!");

    await delay(
      getRandomInclusiveInteger(
        postOrgasmTortureMinimumTime,
        postOrgasmTortureMaximumTime
      ) * 1000
    );

    dismissNotification(nid);

    createNotification("I guess you've had enough.  You may stop.");
    setStrokeSpeed(0);
    await delay(3 * 1000);
  }

};

/**
 * The user is __not__ allowed to cum and has to end the session.
 *
 * @returns {Promise<done>}
 */
export const doDenied = async () => {
  const { config: { fastestStrokeSpeed } } = store;

  setStrokeSpeed(fastestStrokeSpeed);

  if (store.config.enableVoice) {
    play(getRandomAudioVariation("Denied"));
  }

  const nid = createNotification(getRandom_denied_message());

  const done = async () => {
    dismissNotification(nid);
    await end();
  };
  done.label = "Denied";

  return done;
};



/**
 * Let the game go on by increasing the maximum game time by 20%.
 *
 * @returns {Promise<void>}
 */
export const skip = async () => {
  setStrokeSpeed(randomStrokeSpeed());

  // extend the game by 20%
  store.config.maximumGameTime *= 1.2;

  // Mistress did not like that. 10% Denial Chance Increase!
  store.config.chanceForDenial += 5;
};
skip.label = "Skip & Add Time";

/**
 * "Should I stay or should I go now?"
 *
 * If the maximum number of orgasms is not reached yet, the game will go on.
 * Else it will end at this point.
 *
 * @returns {Promise<void>}
 */
export const end = async () => {
  const { maximumOrgasms } = store.config;
  strokerRemoteControl.pause();
  store.game.orgasms++;

  // should continue?
  if (parseInt(store.game.orgasms, 10) < parseInt(maximumOrgasms, 10)) {
    setStrokeSpeed(randomStrokeSpeed());
    strokerRemoteControl.play();
    createNotification("Start stroking again");
    play(audioLibrary.StartStrokingAgain);
    await delay(3000);
  } else {
    setStrokeSpeed(0);
    stopGame();
  }
};

/**
 * Let the user do edge and hold edgingTime seconds
 *
 * @param edgingTime
 *   how long the final edge will last
 * @returns {Promise<function(): *[]>}
 */
const finalEdgeAndHold = async (edgingTime = getRandomInclusiveInteger(15, 60)) => {
  //const notificationId = await getToTheEdge(getRandom_edgeAndHold_message());
  return determineEdge(edgingTime, getRandom_edgeAndHold_message());
};

/**
 * let the user have the initially specified ending (ruin, denied or orgasm).
 *
 * The game end can be chosen at random by using this function.
 * Fetches one of all game ends.
 * @returns {action}
 *   A random game end.
 */
export const getRandomGameEnd = async () => {
  //reset in case of multiple ends.
  store.game.orgasm = false;
  const chosenActions = determineGameEnd();
  return await applyProbability(chosenActions, 1)[0]();
};

/**
 * Manually created list of all game ends with probabilities required in final game phase.
 *
 * @returns {*[]}
 *   an array with all the function-probability pairs: {func, probability}
 */
export const determineGameEnd = () =>
  [
    // list of all available orgasms
    !!store.config.finalOrgasmAllowed && createProbability(advancedOrNotOrgasm, parseInt(store.config.allowedProbability, 10)),
    !!store.config.finalOrgasmDenied && createProbability(doDenied, parseInt(store.config.deniedProbability, 10)),
    !!store.config.finalOrgasmRuined && createProbability(doRuin, parseInt(store.config.ruinedProbability, 10)),
  ].filter(action => !!action);


export default finalEdgeAndHold;
