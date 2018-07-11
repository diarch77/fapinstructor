import createNotification from "engine/createNotification";
import {randomStrokeSpeed, setStrokeSpeed,} from "game/utils/strokeSpeed";
import {getRandomRubStrength} from "game/enums/RubStrength"
import {getRandomLeftOrRight} from "game/enums/HandSide";
import {getRandomInclusiveInteger} from "utils/math";
import delay from "utils/delay";
import {setRandomStrokeStyle, setRandomStrokeStyle_OneHand} from "game/enums/StrokeStyle";

/**
 * Task to play with ones nipples while stroking ones cock.
 *
 * @since      11.07.2018
 * @author     the1nstructor
 *
 * @alias   nipplesAndStroke
 * @memberof actions
 */
const nipplesAndStroke = async () => {
  // get Random strength
  const strength = getRandomRubStrength();
  const left_or_right = getRandomLeftOrRight();

  // task duration (= total time in this case)
  const taskDuration = getRandomInclusiveInteger(10, 25);
  await setRandomStrokeStyle_OneHand();
  createNotification(`Use one of your hands to ${strength}play with your ${left_or_right} nipple`, {
    time: taskDuration * 1000
  });

  await delay((taskDuration + 1) * 1000);

  setStrokeSpeed(randomStrokeSpeed());
  await setRandomStrokeStyle();

};
nipplesAndStroke.label = "Nipple and Stroke";

export default nipplesAndStroke;
