addEventListener('fetch', function(event) {
    const { request } = event;
    const response = handleRequest(request).catch(console.error);
    event.respondWith(response);
});

const ofRulesUrl = 'https://raw.githubusercontent.com/DATAHOARDERS/dynamic-rules/main/onlyfans.json';

async function getChecksumData()
{
    const response = await fetch(ofRulesUrl, {
        cf: {
            cacheTtl: 60,
        },
    });

    const data = await response.json();
    return data;
}

const appToken = '33d57ade8c02dbc5a333db99ff9ae26a';

/**
 * @param {String} username
 */
async function getOnlyFansUser(username)
{
    /**
     * Calculate checksum
     */
    const checksumData = await getChecksumData();
    const { checksum_indexes, checksum_constant, static_param, format } = checksumData;

    const timestamp = Date.now();
    const ofPath = `/api2/v2/users/${username}`;
    const stuff = [static_param, timestamp, ofPath, '0'];
    const message = new TextEncoder('UTF-8').encode(stuff.join('\n'));
    const hashBfr = await crypto.subtle.digest('SHA-1', message);
    const hex = [...new Uint8Array(hashBfr)].map(x => x.toString(16).padStart(2, '0')).join('');

    const checksumBfr = hex.split ('').map (function (c) { return c.charCodeAt (0); });
    let checksum = 0;
    for (const idx of checksum_indexes)
    {
        checksum += checksumBfr[idx];
    }
    
    checksum = Math.abs(checksum + checksum_constant);

    const sign = format.replace('{}', hex).replace('{:x}', checksum.toString(16));
    const apiHeaders = {
        accept: 'application/json',
        'app-token': appToken,
        sign: sign,
        time: timestamp,
    };

    const apiResponse = await fetch(`https://onlyfans.com${ofPath}`, {
        headers: apiHeaders,
    });

    const data = await apiResponse.json();
    return data;
}

function htmlEscape(str)
{
    const escape = str.replace(/[\u00A0-\u9999<>\&]/g, function(i) {
        return '&#'+i.charCodeAt(0)+';';
    });

    return escape;
}

/**
 * @param {Object} user
 */
async function htmlEmbed(user)
{
    const { avatar, name, username, postsCount, rawAbout } = user;

    const url = `https://onlyfans.com/${username}`;
    const title = `${name} (@${username}) has ${postsCount} posts on OnlyFans!`;
    const about = htmlEscape(rawAbout);

    let html = `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta property="og:url" content="${url}" />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${about}" />
                <meta property="og:image" content="${avatar}" />

                <meta name="twitter:image" content="${avatar}" />
                <meta name="twitter:title" content="${title}" />
                <meta name="twitter:description" content="${about}" />
                
                <meta http-equiv="refresh" content="1; url=${url}">
            </head>
            <body></body>
            </html>`;
    return new Response(html, {
        headers: {
            'Content-Type': 'text/html',
        },
    });
}

/**
 * Receives a HTTP request and replies with a response.
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleRequest(request) {
    const { method, url } = request;
    const { host, pathname, searchParams } = new URL(url);

    if (!searchParams.has('user')) {
        return new Response('{"error": "Specify `user` parameter"}', {
            status: 400,
        });
    }

    const username = searchParams.get('user');
    const user = await getOnlyFansUser(username);

    const apiPath = pathname.replace('/', '').split('/')[0];
    if (apiPath === 'embed') {
        return await htmlEmbed(user);
    }

    return new Response(JSON.stringify(user), {
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

async function handleError(err)
{
    return new Response(JSON.stringify({error: err}), {
        status: 500,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}