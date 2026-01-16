# API Rate Limits

Rate limiting is implemented to prevent abuse and ensure fair usage of the API. Limits are applied per IP address.

## Rate Limit Configuration

| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/api/scans` | POST | 10/minute | Create new scans (resource intensive) |
| `/api/scans/{scan_id}` | GET | 60/minute | Get scan status (allows polling) |
| `/api/scans/{scan_id}/report` | GET | 30/minute | Get full scan report |
| `/api/scans/{scan_id}/graph` | GET | 30/minute | Get graph visualization data |
| `/api/scans` | GET | 30/minute | List recent scans |
| `/api/compare` | POST | 20/minute | Compare two scans |
| `/health` | GET | Unlimited | Health check endpoint |

## Rate Limit Headers

When you make a request, the following headers are included in the response:

- `X-RateLimit-Limit`: Maximum requests allowed in the time window
- `X-RateLimit-Remaining`: Requests remaining in current time window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

## Rate Limit Exceeded Response

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response:

```json
{
  "error": "Rate limit exceeded: 10 per 1 minute"
}
```

## Best Practices

1. **Implement exponential backoff** when you receive 429 responses
2. **Cache responses** when appropriate to reduce API calls
3. **Use webhooks** (if available) instead of polling for status updates
4. **Monitor rate limit headers** to avoid hitting limits

## Rate Limit Strategy

Rate limits are designed to:
- Allow reasonable usage for legitimate users
- Prevent accidental infinite loops or runaway scripts
- Protect backend resources from abuse
- Enable status polling (higher limit on GET endpoints)

## Production Deployment

For production deployments:
- Configure rate limits based on your expected traffic
- Use Redis-backed storage for distributed rate limiting
- Consider implementing API keys for authenticated users with higher limits
- Monitor rate limit metrics to adjust thresholds

## Implementation Details

Rate limiting is implemented using [SlowAPI](https://github.com/laurentS/slowapi), which provides:
- In-memory storage (development)
- Redis backend support (production)
- Per-IP rate limiting
- Customizable time windows
- Automatic header injection
