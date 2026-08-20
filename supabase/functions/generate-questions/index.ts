import { corsHeaders } from '../_shared/cors.ts'
import {
    buildQuestionGenerationContextBlock,
    buildQuestionGenerationUserPrompt,
    buildQuestionTypeInstruction,
    QUESTION_GENERATION_SYSTEM_PROMPT,
    type QuestionTypes,
} from '../_shared/prompts.ts'

type GenerateQuestionsPayload = {
    questionCount?: number
    jdOnlyQuestionCount?: number
    questionTypes?: QuestionTypes
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

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
        return toJsonResponse({ error: 'Method not allowed.' }, 405)
    }

    const nimApiKey = Deno.env.get('NIM_API_KEY') || ''
    const nimBaseUrl = (Deno.env.get('NIM_BASE_URL') || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '')
    const nimModel = Deno.env.get('NIM_MODEL') || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'

    if (!nimApiKey.trim()) {
        return toJsonResponse({ error: 'NIM_API_KEY is not configured.' }, 500)
    }

    let payload: GenerateQuestionsPayload
    try {
        payload = await request.json()
    } catch {
        return toJsonResponse({ error: 'Invalid JSON body.' }, 400)
    }

    const questionCount = Math.max(2, Math.min(25, Number(payload.questionCount) || 10))
    const jdOnlyQuestionCount = Math.max(0, Math.min(questionCount, Number(payload.jdOnlyQuestionCount) || 0))
    const questionTypeInstruction = buildQuestionTypeInstruction(payload.questionTypes || {})

    const context = payload.context || {}
    const generationGuidelines = String(context.generationGuidelines || '')
    const companyName = String(context.companyName || '(not provided)')
    const jobTitle = String(context.jobTitle || '(not provided)')
    const cv = String(context.cv || '(not provided)')
    const jobDescription = String(context.jobDescription || '(not provided)')
    const priorFeedback = String(context.priorFeedback || '')

    const userPrompt = buildQuestionGenerationUserPrompt(questionCount, jdOnlyQuestionCount)

    const contextBlock = buildQuestionGenerationContextBlock({
        generationGuidelines,
        questionTypeInstruction,
        companyName,
        jobTitle,
        cv,
        jobDescription,
        priorFeedback,
    })

    const providerResponse = await fetch(`${nimBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${nimApiKey}`,
        },
        body: JSON.stringify({
            model: nimModel,
            temperature: 0.3,
            stream: false,
            messages: [
                { role: 'system', content: QUESTION_GENERATION_SYSTEM_PROMPT },
                { role: 'user', content: `${contextBlock}\n\nUser request:\n${userPrompt}` },
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
        model: nimModel,
    })
})
