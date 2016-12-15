'use strict'

const untrainedStep = require('./lib/steps/untrained')
const welcomeStep = require('./lib/steps/welcome')
const parseArtworkSize = require('./lib/parseArtworkSize')
const composeFramesCarouselItems = require('./lib/composeFramesCarouselItems')

exports.handle = (client) => {
  const untrained = untrainedStep(client)
  const welcome = welcomeStep(client)

  console.log('################################################')
  console.log(client.getUsers())
  console.log('################################################')

  // TODO: Decomp into module
  const getArtworkType = client.createStep({
    satisfied() {
      // Determine if we already have a selected artwork type selected
      const artwork = client.getConversationState().artwork || {}

      return Boolean(artwork.type)
    },

    // TODO: Write an extractInfo handler to catch extraneous comments that may describe artwork type
    // extractInfo() {...}

    prompt() {
      console.log('>>>>>>>>>>>>>>>>', client.getFirstEntityWithRole(client.getMessagePart(), 'artwork_type'))
      const artworkType = client.getFirstEntityWithRole(client.getMessagePart(), 'artwork_type').value
      const newArtwork = client.getConversationState().artwork || {}

      // TODO: We will need to lookup this value to normalize it: "a personal photo -> Types.PERSONAL_PHOTO"
      // TODO: We may be able to do this via entity tagging
      // TODO: Will need to handle the case where an invalid/indeterminate value is provided
      newArtwork.type = artworkType

      client.updateConversationState({artwork: newArtwork})

      if (newArtwork.size) {
        if (newArtwork.size.width && !newArtwork.size.height) {
          client.addResponse('request_artwork_size/height')
        } else if (!newArtwork.size.width && newArtwork.size.height) {
          client.addResponse('request_artwork_size/width')
        } else if (!newArtwork.size.width && !newArtwork.size.height) {
          client.addResponse('request_artwork_size/width_and_height')
        } else {
          // TODO: Need to move on to different Step or Stream?
        }
      } else {
        client.addResponse('request_artwork_size/width_and_height')
      }

      client.done()
    }
  })

  // TODO: Decomp into module
  const getArtworkSize = client.createStep({
    satisfied() {
      // Determine if we already have determined artwork size
      const artworkSize = (client.getConversationState().artwork || {}).size

      return (
        artworkSize &&
        artworkSize.hasOwnProperty('width') &&
        artworkSize.hasOwnProperty('height')
      )
    },

    // TODO: Write an extractInfo handler to catch extraneous comments that may describe artwork type
    // extractInfo() {...}

    prompt() {
      const providedSize = client.getEntities(client.getMessagePart(), 'artwork_size')
      const previousArtwork = client.getConversationState().artwork || {}
      const newArtworkSize = previousArtwork.size || {}

      if (providedSize.width_and_height) {
        let parsedSize = parseArtworkSize(providedSize.width_and_height[0].value)

        newArtworkSize.width = parsedSize.width
        newArtworkSize.height = parsedSize.height
      }

      // TODO: This value will need to be normalized to a number: '11" wide' -> 11
      // TODO: Try using "number" base_type?
      if (providedSize.width) {
        newArtworkSize.width = providedSize.width[0].value
      }

      // TODO: This value will need to be normalized to a number: '14" tall' -> 14
      // TODO: Try using "number" base_type?
      if (providedSize.height) {
        newArtworkSize.height = providedSize.height[0].value
      }

      client.updateConversationState({
        artwork: Object.assign({}, previousArtwork, {size: newArtworkSize})
      })

      if (newArtworkSize.width && newArtworkSize.height) {
        composeFramesCarouselItems().then((items) => {
          console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
          console.log(items)
          client.addTextResponse('=_******_=Which one of these frames do you like?')
          client.addCarouselListResponse({items: items})
          client.done()
        })
      } else {
        if (!newArtworkSize.width) {
          client.addResponse('request_artwork_size/width')
        } else if (!newArtworkSize.height) {
          client.addResponse('request_artwork_size/height')
        }

        client.done()
      }
    }
  })

  const getItemCount = client.createStep({
    satisfied() {
      // Determine if we already have determined artwork size
      const itemCount = client.getConversationState().itemCount

      return (itemCount)
    },

    prompt() {
      client.addResponse('welcome/request_item_count')
      client.done()
    }
  })

  client.runFlow({
    classifications: {
      // map inbound message classifications to names of streams
      provide_artwork_type: 'getArtwork',
      'provide_artwork_size/width_and_height': 'getArtwork',
      'provide_artwork_size/width': 'getArtwork',
      'provide_artwork_size/height': 'getArtwork',
      'request_framing_service': 'getItemCount',
    },
    autoResponses: {
      // configure responses to be automatically sent as predicted by the machine learning model
    },
    streams: {
      main: 'onboarding',
      getItemCount: [getItemCount],
      getArtwork: [getArtworkType, getArtworkSize],
      onboarding: [welcome],
      end: [untrained],
    },
  })
}
