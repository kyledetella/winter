const framesData = require('../../data/frames')

function composeItem(frame) {
  return {
    media_url: frame.imageUrl,
    media_type: 'image/jpeg',
    description: frame.description,
    title: frame.title,
    actions: [
      {
        type: 'postback',
        text: 'Frame',
        payload: {
          data: {
            action: 'frame',
            park: 'white'
          },
          version: '1',
          stream: 'selectPark', // TODO: Map to a stream
        },
      },
    ],
  }
}

module.exports = function composeFramesCarouselItems() {
  // NOTE: This will eventually be a network request
  // so let's treat it as async from the start
  return Promise.resolve(framesData.map(composeItem))
}
