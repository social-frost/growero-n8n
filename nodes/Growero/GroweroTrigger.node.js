/**
 * Growero trigger node — receives publish events via webhook.
 *
 * Lifecycle:
 *   - On workflow activation, we register a webhook endpoint with Growero
 *     using the user's API key (scope: webhooks:write). The signing secret
 *     is returned ONCE by Growero and stored as static workflow data so we
 *     can verify subsequent deliveries.
 *   - On workflow deactivation, we delete the endpoint from Growero so it
 *     stops receiving events.
 *   - On every incoming HTTP, we verify the X-Growero-Signature header
 *     (Stripe-format HMAC-SHA256 with 5-min replay tolerance) and emit
 *     the event payload into the workflow.
 *
 * Signature spec: see webhookSignature.js in the backend.
 */
const crypto = require('crypto');

const TOLERANCE_SECONDS = 5 * 60;

function parseSignatureHeader(header) {
  if (!header || typeof header !== 'string') return null;
  const out = {};
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === 't') out.t = parseInt(v, 10);
    else if (k === 'v1') out.v1 = v;
  }
  if (!out.t || !out.v1) return null;
  return out;
}

function constantTimeEqualHex(aHex, bHex) {
  if (aHex.length !== bHex.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(aHex, 'hex'), Buffer.from(bHex, 'hex'));
  } catch {
    return false;
  }
}

function verifySignature(secret, rawBody, header) {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.t) > TOLERANCE_SECONDS) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parsed.t}.${rawBody}`)
    .digest('hex');
  return constantTimeEqualHex(expected, parsed.v1);
}

const EVENT_OPTIONS = [
  { name: 'Post published', value: 'post.published' },
  { name: 'Post failed', value: 'post.failed' },
  { name: 'Post created', value: 'post.created' },
  { name: 'Post updated', value: 'post.updated' },
  { name: 'Post deleted', value: 'post.deleted' },
  { name: 'All post events (post.*)', value: 'post.*' },
  { name: 'All events (*)', value: '*' },
];

class GroweroTrigger {
  constructor() {
    this.description = {
      displayName: 'Growero Trigger',
      name: 'groweroTrigger',
      icon: 'file:growero.png',
      group: ['trigger'],
      version: 1,
      description: 'Starts the workflow when a Growero event fires (post published, failed, etc.).',
      defaults: { name: 'Growero Trigger' },
      inputs: [],
      outputs: ['main'],
      credentials: [{ name: 'groweroApi', required: true }],
      webhooks: [
        {
          name: 'default',
          httpMethod: 'POST',
          responseMode: 'onReceived',
          path: 'growero',
        },
      ],
      properties: [
        {
          displayName: 'Events',
          name: 'events',
          type: 'multiOptions',
          required: true,
          default: ['post.published'],
          options: EVENT_OPTIONS,
          description: 'Which Growero events should trigger this workflow.',
        },
        {
          displayName: 'Description',
          name: 'description',
          type: 'string',
          default: 'n8n trigger',
          description: 'Stored on Growero side so you can identify the endpoint in your dashboard.',
        },
      ],
    };

    this.webhookMethods = {
      default: {
        checkExists: async function checkExists() {
          const webhookData = this.getWorkflowStaticData('node');
          if (!webhookData.endpointId) return false;
          try {
            const credentials = await this.getCredentials('groweroApi');
            const resp = await this.helpers.httpRequest({
              method: 'GET',
              url: `${credentials.baseUrl}/api/v1/webhooks/endpoints`,
              headers: { Authorization: `Bearer ${credentials.apiKey}` },
              json: true,
            });
            const found = (resp && resp.data || []).some((e) => e.id === webhookData.endpointId);
            if (!found) {
              delete webhookData.endpointId;
              delete webhookData.signingSecret;
              return false;
            }
            return true;
          } catch (e) {
            // If we can't reach Growero we don't claim the webhook exists;
            // n8n will call create() next, which is idempotent enough.
            return false;
          }
        },

        create: async function create() {
          const webhookUrl = this.getNodeWebhookUrl('default');
          const events = this.getNodeParameter('events');
          const description = this.getNodeParameter('description');
          const credentials = await this.getCredentials('groweroApi');

          const resp = await this.helpers.httpRequest({
            method: 'POST',
            url: `${credentials.baseUrl}/api/v1/webhooks/endpoints`,
            headers: { Authorization: `Bearer ${credentials.apiKey}` },
            body: { url: webhookUrl, events, description },
            json: true,
          });

          if (!resp || !resp.data || !resp.data.id) {
            throw new Error('Growero did not return an endpoint ID');
          }

          const webhookData = this.getWorkflowStaticData('node');
          webhookData.endpointId = resp.data.id;
          // signingSecret is returned ONCE — persist it now, can't fetch later.
          webhookData.signingSecret = resp.data.signingSecret;
          return true;
        },

        delete: async function deleteEndpoint() {
          const webhookData = this.getWorkflowStaticData('node');
          if (!webhookData.endpointId) return true;
          try {
            const credentials = await this.getCredentials('groweroApi');
            await this.helpers.httpRequest({
              method: 'DELETE',
              url: `${credentials.baseUrl}/api/v1/webhooks/endpoints/${webhookData.endpointId}`,
              headers: { Authorization: `Bearer ${credentials.apiKey}` },
              json: true,
            });
          } catch (e) {
            // Swallow — n8n still considers the webhook deactivated locally.
          }
          delete webhookData.endpointId;
          delete webhookData.signingSecret;
          return true;
        },
      },
    };
  }

  async webhook() {
    const req = this.getRequestObject();
    const webhookData = this.getWorkflowStaticData('node');
    const secret = webhookData.signingSecret;
    const header = req.headers['x-growero-signature'];

    // raw body for HMAC: n8n parses JSON body, so we re-stringify with the
    // same canonical form Growero used. Growero signs JSON.stringify(payload)
    // — see webhookSignature.sign() in the backend service.
    const rawBody = JSON.stringify(req.body || {});

    if (!secret) {
      return { webhookResponse: { statusCode: 401, body: 'No signing secret stored' } };
    }
    if (!verifySignature(secret, rawBody, header)) {
      return { webhookResponse: { statusCode: 401, body: 'Invalid signature' } };
    }

    const payload = req.body || {};
    return {
      workflowData: [
        [
          {
            json: {
              eventId: payload.id,
              eventType: payload.type,
              created: payload.created,
              data: payload.data,
            },
          },
        ],
      ],
    };
  }
}

module.exports = { GroweroTrigger };
