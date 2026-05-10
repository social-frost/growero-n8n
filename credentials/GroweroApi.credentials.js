/**
 * n8n credentials definition for Growero API key auth.
 */
class GroweroApi {
  constructor() {
    this.name = 'groweroApi';
    this.displayName = 'Growero API';
    this.documentationUrl = 'https://api.growero.io/api/v1/docs';
    this.properties = [
      {
        displayName: 'API Key',
        name: 'apiKey',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        required: true,
        description: 'Your Growero API key (growero_live_<...>). Generate at app.growero.io/settings/api-keys.',
      },
      {
        displayName: 'Base URL',
        name: 'baseUrl',
        type: 'string',
        default: 'https://api.growero.io',
        description: 'Override for self-hosted or staging instances.',
      },
    ];
    // Verifies the credential at save time by calling /v1/whoami.
    this.test = {
      request: {
        baseURL: '={{$credentials.baseUrl}}',
        url: '/api/v1/whoami',
        method: 'GET',
        headers: {
          Authorization: '=Bearer {{$credentials.apiKey}}',
          Accept: 'application/json',
        },
      },
    };
    this.authenticate = {
      type: 'generic',
      properties: {
        headers: {
          Authorization: '=Bearer {{$credentials.apiKey}}',
        },
      },
    };
  }
}
module.exports = { GroweroApi };
