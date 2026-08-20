import { corsHeaders } from '../_shared/cors.ts'
import {
    buildReportGenerationContextBlock,
    REPORT_GENERATION_SYSTEM_PROMPT,
} from '../_shared/prompts.ts'

type GenerateReportPayload = {
    mode?: 'am' | 'detailed' | 'coach' | string
    userMessage?: string
    context?: Record<string, unknown>
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

function resolveModelForMode(mode: string) {
    const fallbackModel = Deno.env.get('NIM_MODEL') || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'

    if (mode === 'am') {
        return Deno.env.get('NIM_AM_MODEL') || fallbackModel
    }

    if (mode === 'detailed') {
        return Deno.env.get('NIM_DETAILED_MODEL') || fallbackModel
    }

    if (mode === 'coach') {
        return Deno.env.get('NIM_COACH_MODEL') || fallbackModel
    }

    return fallbackModel
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
        return toJsonResponse({ error: 'Method not allowed.' }, 405)
    }

    const nimApiKey = Deno.env.get('NIM_API_KEY') || ''
    const nimBaseUrl = (Deno.env.get('NIM_BASE_URL') || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '')

    if (!nimApiKey.trim()) {
        return toJsonResponse({ error: 'NIM_API_KEY is not configured.' }, 500)
    }

    let payload: GenerateReportPayload
    try {
        payload = await request.json()
    } catch {
        return toJsonResponse({ error: 'Invalid JSON body.' }, 400)
    }

    const mode = String(payload.mode || 'am').trim().toLowerCase()
    const userMessage = String(payload.userMessage || '').trim()
    const context = payload.context || {}

    if (!userMessage) {
        return toJsonResponse({ error: 'userMessage is required.' }, 400)
    }

    const model = resolveModelForMode(mode)

    const contextBlock = buildReportGenerationContextBlock(mode, context)

    const providerResponse = await fetch(`${nimBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${nimApiKey}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0.2,
            stream: false,
            messages: [
                { role: 'system', content: REPORT_GENERATION_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `${contextBlock}\n\nUser request:\n${userMessage}`,
                },
            ],
        }),
    })

    if (!providerResponse.ok) {
        const errorText = await providerResponse.text()
        return toJsonResponse(
            {
                error: 'Provider request failed.',
                status: providerResponse.status,
                details: errorText.slice(0, 1000),
            },
            502,
        )
    }

    const completion = await providerResponse.json()
    const text = String(completion?.choices?.[0]?.message?.content || '').trim()

    if (!text) {
        return toJsonResponse({ error: 'Provider returned an empty response.' }, 502)
    }

    return toJsonResponse({
        text,
        providerId: 'nim',
        model,
    })
})
