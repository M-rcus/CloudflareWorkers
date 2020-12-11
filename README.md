# Cloudflare Workers
Various [Cloudflare Workers](https://workers.cloudflare.com/) for simple "APIs" and whatever.

## user-agent
Any request sent to the [`user-agent`](user-agent) worker will get a response with the `User-Agent` header they're using.  
If no `User-Agent` is sent, an empty string will be returned.