module.exports = (client) => {
  return client.createStep({
    satisfied() {
      return Boolean(client.getConversationState().onboardingComplete)
    },

    prompt() {
      client.addResponse('welcome/request_artwork_type')
      client.updateConversationState({onboardingComplete: true})
      client.done()
    }
  })
}
