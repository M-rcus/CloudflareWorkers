addEventListener('fetch', async (event) => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(req)
{
    const headers = req.headers;
    const userAgent = headers.get('user-agent');

    return new Response(userAgent || '', {
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}