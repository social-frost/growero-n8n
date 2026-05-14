/**
 * Growero n8n node — action node.
 *
 * Operations:
 *   posts: list, get, create, update, delete
 *
 * Real-time event subscription is in the separate GroweroTrigger node.
 *
 * Notable surface (matches /api/v1):
 *   - create accepts platforms[] (multi-channel), mediaUrls[], idempotencyKey
 *   - list supports cursor pagination + platform / from / to / q filters
 *   - update edits PENDING posts only
 */
class Growero {
  constructor() {
    this.description = {
      displayName: 'Growero',
      name: 'growero',
      icon: 'file:growero.png',
      group: ['output'],
      version: 1,
      description: 'Schedule and manage Growero social posts via the public API.',
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
            { name: 'Create', value: 'create', action: 'Schedule a new post' },
            { name: 'Update', value: 'update', action: 'Update a scheduled post' },
            { name: 'Delete', value: 'delete', action: 'Delete a post' },
          ],
          default: 'list',
        },

        // -------- LIST --------
        {
          displayName: 'Return all',
          name: 'returnAll',
          type: 'boolean',
          default: false,
          description: 'Whether to follow pagination until the end (uses cursor)',
          displayOptions: { show: { resource: ['post'], operation: ['list'] } },
        },
        {
          displayName: 'Limit',
          name: 'limit',
          type: 'number',
          typeOptions: { minValue: 1, maxValue: 200 },
          default: 50,
          displayOptions: { show: { resource: ['post'], operation: ['list'], returnAll: [false] } },
        },
        {
          displayName: 'Filters',
          name: 'filters',
          type: 'collection',
          placeholder: 'Add filter',
          default: {},
          displayOptions: { show: { resource: ['post'], operation: ['list'] } },
          options: [
            {
              displayName: 'Status',
              name: 'status',
              type: 'options',
              default: '',
              options: [
                { name: 'Any', value: '' },
                { name: 'Scheduled', value: 'scheduled' },
                { name: 'Published', value: 'published' },
                { name: 'Failed', value: 'failed' },
              ],
            },
            {
              displayName: 'Platform',
              name: 'platform',
              type: 'options',
              default: '',
              options: [
                { name: 'Any', value: '' },
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
            },
            { displayName: 'From (ISO 8601)', name: 'from', type: 'string', default: '' },
            { displayName: 'To (ISO 8601)', name: 'to', type: 'string', default: '' },
            { displayName: 'Search text', name: 'q', type: 'string', default: '' },
          ],
        },

        // -------- GET / DELETE --------
        {
          displayName: 'Post ID',
          name: 'postId',
          type: 'string',
          required: true,
          default: '',
          displayOptions: { show: { resource: ['post'], operation: ['get', 'delete', 'update'] } },
        },

        // -------- CREATE --------
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
          displayName: 'Platforms',
          name: 'platforms',
          type: 'multiOptions',
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
          default: ['linkedin'],
          displayOptions: { show: { resource: ['post'], operation: ['create'] } },
          description: 'One or more platforms. Cross-posting in one call.',
        },
        {
          displayName: 'Scheduled at (ISO 8601)',
          name: 'scheduledAt',
          type: 'string',
          default: '',
          displayOptions: { show: { resource: ['post'], operation: ['create'] } },
          description: 'Leave empty to publish on the next cron tick.',
        },
        {
          displayName: 'Media URLs',
          name: 'mediaUrls',
          type: 'string',
          typeOptions: { rows: 3 },
          default: '',
          placeholder: 'https://… , https://… (comma- or newline-separated)',
          displayOptions: { show: { resource: ['post'], operation: ['create', 'update'] } },
        },
        {
          displayName: 'Idempotency key',
          name: 'idempotencyKey',
          type: 'string',
          default: '',
          displayOptions: { show: { resource: ['post'], operation: ['create'] } },
          description: 'Optional. Same key within 24h returns the original post — safe under n8n retries.',
        },

        // -------- UPDATE --------
        {
          displayName: 'Text (leave blank to keep)',
          name: 'updateText',
          type: 'string',
          typeOptions: { rows: 4 },
          default: '',
          displayOptions: { show: { resource: ['post'], operation: ['update'] } },
        },
        {
          displayName: 'Reschedule to (ISO 8601, blank to keep)',
          name: 'updateScheduledAt',
          type: 'string',
          default: '',
          displayOptions: { show: { resource: ['post'], operation: ['update'] } },
        },
        {
          displayName: 'Replace platforms (blank to keep)',
          name: 'updatePlatforms',
          type: 'multiOptions',
          default: [],
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
          displayOptions: { show: { resource: ['post'], operation: ['update'] } },
        },
      ],
    };
  }

  async execute() {
    const items = this.getInputData();
    const out = [];

    const parseMediaCsv = (s) => {
      if (!s) return [];
      return String(s).split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
    };

    for (let i = 0; i < items.length; i++) {
      const resource = this.getNodeParameter('resource', i);
      const operation = this.getNodeParameter('operation', i);

      if (resource !== 'post') throw new Error(`Unsupported resource ${resource}`);

      if (operation === 'list') {
        const filters = this.getNodeParameter('filters', i) || {};
        const returnAll = this.getNodeParameter('returnAll', i);
        const limit = returnAll ? 200 : this.getNodeParameter('limit', i);
        let cursor = null;
        let pageNo = 0;
        const collected = [];
        do {
          const qs = { limit };
          if (filters.status) qs.status = filters.status;
          if (filters.platform) qs.platform = filters.platform;
          if (filters.from) qs.from = filters.from;
          if (filters.to) qs.to = filters.to;
          if (filters.q) qs.q = filters.q;
          if (cursor) qs.cursor = cursor;

          const resp = await this.helpers.httpRequestWithAuthentication.call(
            this, 'groweroApi',
            { method: 'GET', url: '/api/v1/posts', qs },
          );
          for (const row of (resp.data || [])) collected.push(row);
          cursor = resp.pagination && resp.pagination.nextCursor;
          pageNo += 1;
          // Hard ceiling to prevent runaway loops.
          if (pageNo > 50) break;
        } while (returnAll && cursor);

        for (const row of collected) out.push({ json: row });
        continue;
      }

      let response;
      if (operation === 'get') {
        const postId = this.getNodeParameter('postId', i);
        response = await this.helpers.httpRequestWithAuthentication.call(
          this, 'groweroApi',
          { method: 'GET', url: `/api/v1/posts/${encodeURIComponent(postId)}` },
        );
      } else if (operation === 'create') {
        const body = {
          text: this.getNodeParameter('text', i),
          platforms: this.getNodeParameter('platforms', i) || [],
        };
        const scheduledAt = this.getNodeParameter('scheduledAt', i);
        if (scheduledAt) body.scheduledAt = scheduledAt;
        const mediaUrls = parseMediaCsv(this.getNodeParameter('mediaUrls', i));
        if (mediaUrls.length) body.mediaUrls = mediaUrls;

        const headers = {};
        const idempotencyKey = this.getNodeParameter('idempotencyKey', i);
        if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

        response = await this.helpers.httpRequestWithAuthentication.call(
          this, 'groweroApi',
          { method: 'POST', url: '/api/v1/posts', body, json: true, headers },
        );
      } else if (operation === 'update') {
        const postId = this.getNodeParameter('postId', i);
        const body = {};
        const t = this.getNodeParameter('updateText', i);
        if (t) body.text = t;
        const s = this.getNodeParameter('updateScheduledAt', i);
        if (s) body.scheduledAt = s;
        const p = this.getNodeParameter('updatePlatforms', i);
        if (Array.isArray(p) && p.length) body.platforms = p;
        const mediaUrls = parseMediaCsv(this.getNodeParameter('mediaUrls', i));
        if (mediaUrls.length) body.mediaUrls = mediaUrls;

        response = await this.helpers.httpRequestWithAuthentication.call(
          this, 'groweroApi',
          { method: 'PATCH', url: `/api/v1/posts/${encodeURIComponent(postId)}`, body, json: true },
        );
      } else if (operation === 'delete') {
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
