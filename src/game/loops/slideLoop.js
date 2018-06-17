import shuffle from "lodash.shuffle";
import uniq from "lodash.uniq";
import store from "store";
import fetchTumblrPics from "api/fetchTumblrPics";
import fetchRedditPics from "api/fetchRedditPics";
import remoteControl from "./remoteControl";

export const slideRemoteControl = Object.create(remoteControl);

export const nextSlide = async () => {
  // load more pictures when close to running out
  if (5 > store.game.pictures.length - store.game.pictureIndex) {
    await fetchPictures();
  }

  store.game.pictureIndex++;

  // cache the next image
  if (store.game.pictureIndex + 1 < store.game.pictures.length) {
    new Image().src = store.game.pictures[store.game.pictureIndex + 1];
  }

  // set the active picture to a fetched image
  store.game.mediaPlayerUrl = store.game.pictures[store.game.pictureIndex];
};

const fetchPictures = () => {
  const { tumblrId, redditId } = store.config;

  const tumblrIds =
    tumblrId.length > 0 && tumblrId.split(",").map(id => id.trim());
  const redditIds =
    redditId.length > 0 && redditId.split(",").map(id => id.trim());

  let fetches = [];

  if (tumblrIds) {
    // make a fetch to tumblr for each tumblr id
    const tumblrFetches = tumblrIds.map((id, index) =>
      fetchTumblrPics(id, {
        pictures: store.config.pictures,
        gifs: store.config.gifs,
        video: store.config.video
      })
    );
    fetches = fetches.concat(tumblrFetches);
  }

  if (redditIds) {
    // make a fetch to tumblr for each tumblr id
    const redditFetches = redditIds.map((id, index) =>
      fetchRedditPics(id, {
        pictures: store.config.pictures,
        gifs: store.config.gifs,
        video: store.config.video
      })
    );
    fetches = fetches.concat(redditFetches);
  }

  // execute the array of promises and append the randomized pictures to the global array
  return Promise.all(fetches).then(results => {
    let newImages = [];

    results.forEach(images => {
      newImages = newImages.concat(images);
    });

    store.game.pictures = [...store.game.pictures, ...uniq(shuffle(newImages))];

    if (newImages.length === 0) {
      store.game.pictureIndex = 0;
    }
  });
};

let lastSlideChange = -1;
const slideLoop = progress => {
  if (!slideRemoteControl.paused) {
    if (
      lastSlideChange >= store.config.slideDuration * 1000 ||
      lastSlideChange === -1
    ) {
      nextSlide();
      lastSlideChange = 0;
    } else {
      lastSlideChange += progress;
    }
  }
};

slideLoop.onSubscribe = () => {
  lastSlideChange = -1;
};

export default slideLoop;
