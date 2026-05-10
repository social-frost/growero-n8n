/**
 * Growero n8n node.
 *
 * Operations:
 *   posts: list, get, create, delete
 *   webhooks: list, fire-test (admin only — uses session JWT, deferred)
 *
 * Triggers (separate trigger node) are a follow-up; today this node covers
 * the imperative side.
 */
class Growero {
  constructor() {
    this.description = {
      displayName: 'Growero',
      name: 'growero',
      icon: 'file:growero.png',
      group: ['output'],
      version: 1,
      description: 'Read and write Growero posts via the public API.',
      defaults: { name: 'Growero' },
      inputs: ['main'],
      outputs: ['main'],
      credentials: [
        { name: 'groweroApi', required: true },
      ],
      requestDefaults: {
        baseURL: '={{$credentials.baseUrl}}',
        headers: { Accept: 'application/json' },
      },
      properties: [
        {
          displayName: 'Resource',
          name: 'resource',
          type: 'options',
          noDataExpression: true,
          options: [{ name: 'Post', value: 'post' }],
          default: 'post',
        },
        {
          displayName: 'Operation',
          name: 'operation',
          type: 'options',
          noDataExpression: true,
          displayOptions: { show: { resource: ['post'] } },
          options: [
            { name: 'List', value: 'list', action: 'List posts' },
            { name: 'Get', value: 'get', action: 'Get a post' },
            { name: 'Create', value: 'create', action: 'Create a scheduled post' },
            { name: 'Delete', value: 'delete', action: 'Delete a post' },
          ],
          default: 'list',
        },
        {
          displayName: 'Limit',
          name: 'limit',
          type: 'number',
          typeOptions: { minValue: 1, maxValue: 200 },
          default: 50,
          displayOptions: { show: { resource: ['post'], operation: ['list'] } },
        },
        {
          displayName: 'Status filter',
          name: 'status',
          type: 'options',
          options: [
            { name: 'Any', value: '' },
            { name: 'Scheduled', value: 'scheduled' },
            { name: 'Published', value: 'published' },
            { name: 'Failed', value: 'failed' },
          ],
          default: '',
          displayOptions: { show: { resource: ['post'], operation: ['list'] } },
        },
        {
          displayName: 'Post ID',
          name: 'postId',
          type: 'string',
          required: true,
          default: '',
          displayOptions: { show: { resource: ['post'], operation: ['get', 'delete'] } },
        },
        {
          displayName: 'Text',
          name: 'text',
          type: 'string',
          typeOptions: { rows: 4 },
          required: true,
          default: '',
          displayOptions: { show: { resource: ['post'], operation: ['create'] } },
        },
        {
          displayName: 'Platform',
          name: 'platform',
          type: 'options',
          required: true,
          options: [
            { name: 'LinkedIn', value: 'linkedin' },
            { name: 'X (Twitter)', value: 'x' },
            { name: 'Facebook', value: 'facebook' },
            { name: 'Instagram', value: 'instagram' },
            { name: 'Threads', value: 'threads' },
            { name: 'Bluesky', value: 'bluesky' },
            { name: 'TikTok', value: 'tiktok' },
            { name: 'Reddit', value: 'reddit' },
            { name: 'Pinterest', value: 'pinterest' },
          ],
          default: 'linkedin',
          displayOptions: { show: { resource: ['post'], operation: ['create'] } },
        },
        {
          displayName: 'Scheduled at (ISO 8601)',
          name: 'scheduledAt',
          type: 'string',
          default: '',
          displayOptions: { show: { resource: ['post'], operation: ['create'] } },
        },
      ],
    };
  }

  async execute() {
    // n8n provides `this.helpers.httpRequestWithAuthentication` to attach the
    // configured credential's auth headers. We use it for every call.
    const items = this.getInputData();
    const out = [];

    for (let i = 0; i < items.length; i++) {
      const resource = this.getNodeParameter('resource', i);
      const operation = this.getNodeParameter('operation', i);

      let response;
      if (resource === 'post' && operation === 'list') {
        const limit = this.getNodeParameter('limit', i);
        const status = this.getNodeParameter('status', i);
        const qs = { limit };
        if (status) qs.status = status;
        response = await this.helpers.httpRequestWithAuthentication.call(
          this, 'groweroApi',
          { method: 'GET', url: '/api/v1/posts', qs },
        );
      } else if (resource === 'post' && operation === 'get') {
        const postId = this.getNodeParameter('postId', i);
        response = await this.helpers.httpRequestWithAuthentication.call(
          this, 'groweroApi',
          { method: 'GET', url: `/api/v1/posts/${encodeURIComponent(postId)}` },
        );
      } else if (resource === 'post' && operation === 'create') {
        const body = {
          text: this.getNodeParameter('text', i),
          platform: this.getNodeParameter('platform', i),
        };
        const scheduledAt = this.getNodeParameter('scheduledAt', i);
        if (scheduledAt) body.scheduledAt = scheduledAt;
        response = await this.helpers.httpRequestWithAuthentication.call(
          this, 'groweroApi',
          { method: 'POST', url: '/api/v1/posts', body, json: true },
        );
      } else if (resource === 'post' && operation === 'delete') {
        const postId = this.getNodeParameter('postId', i);
        response = await this.helpers.httpRequestWithAuthentication.call(
          this, 'groweroApi',
          { method: 'DELETE', url: `/api/v1/posts/${encodeURIComponent(postId)}` },
        );
        response = response || { deleted: true };
      } else {
        throw new Error(`Unsupported ${resource}/${operation}`);
      }

      out.push({ json: response });
    }
    return [out];
  }
}

module.exports = { Growero };
