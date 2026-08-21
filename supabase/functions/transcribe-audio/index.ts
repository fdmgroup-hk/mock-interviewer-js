import { corsHeaders } from '../_shared/cors.ts'

type TranscribeAudioPayload = {
    mimeType?: string
    audioBase64?: string
}

function toJsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
    })
}

function decodeBase64ToBytes(base64Text: string) {
    try {
        const binaryString = atob(base64Text)
        const bytes = new Uint8Array(binaryString.length)
        for (let index = 0; index < binaryString.length; index += 1) {
            bytes[index] = binaryString.charCodeAt(index)
        }
        return bytes
    } catch {
        return null
    }
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
        return toJsonResponse({ error: 'Method not allowed.' }, 405)
    }

    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY') || ''
    const deepgramListenUrl = Deno.env.get('DEEPGRAM_LISTEN_URL') || 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&filler_words=true'

    if (!deepgramApiKey.trim()) {
        return toJsonResponse({ error: 'DEEPGRAM_API_KEY is not configured.' }, 500)
    }

    let payload: TranscribeAudioPayload
    try {
        payload = await request.json()
    } catch {
        return toJsonResponse({ error: 'Invalid JSON body.' }, 400)
    }

    const mimeType = String(payload.mimeType || 'audio/webm').trim() || 'audio/webm'
    const audioBase64 = String(payload.audioBase64 || '').trim()

    if (!audioBase64) {
        return toJsonResponse({ error: 'audioBase64 is required.' }, 400)
    }

    const bytes = decodeBase64ToBytes(audioBase64)
    if (!bytes || !bytes.length) {
        return toJsonResponse({ error: 'Invalid base64 audio payload.' }, 400)
    }

    const deepgramResponse = await fetch(deepgramListenUrl, {
        method: 'POST',
        headers: {
            Authorization: `Token ${deepgramApiKey}`,
            'Content-Type': mimeType,
        },
        body: bytes,
    })

    if (!deepgramResponse.ok) {
        const errorText = await deepgramResponse.text()
        return toJsonResponse(
            {
                error: 'Deepgram transcription request failed.',
                status: deepgramResponse.status,
                details: errorText.slice(0, 1000),
            },
            502,
        )
    }

    const payloadJson = await deepgramResponse.json()
    const transcript = String(
        payloadJson?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '',
    ).trim()

    if (!transcript) {
        return toJsonResponse({ error: 'No transcript returned from Deepgram.' }, 502)
    }

    return toJsonResponse({
        text: transcript,
        meta: {
            providerUsed: 'deepgram',
            fallbackApplied: false,
            fallbackReason: '',
        },
    })
})
