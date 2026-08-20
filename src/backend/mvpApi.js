import { getSupabaseClient, isSupabaseMvpEnabled } from './supabaseClient'

function toSupabaseFunctionError(error, fallbackMessage) {
    const details = String(
        error?.message || error?.error_description || error?.details || fallbackMessage,
    ).trim()

    const normalized = details || fallbackMessage
    const wrapped = new Error(normalized)
    wrapped.code = error?.code || 'supabase-function-error'
    return wrapped
}

function getSupabaseOrThrow() {
    if (!isSupabaseMvpEnabled()) {
        const error = new Error('Supabase MVP backend mode is disabled.')
        error.code = 'supabase-mvp-disabled'
        throw error
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
        const error = new Error(
            'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        )
        error.code = 'supabase-not-configured'
        throw error
    }

    return supabase
}

async function blobToBase64(blob) {
    const buffer = await blob.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const chunkSize = 0x8000

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        const chunk = bytes.subarray(offset, offset + chunkSize)
        binary += String.fromCharCode(...chunk)
    }

    return btoa(binary)
}

export async function requestGeneratedQuestionsFromBackend({
    questionCount,
    jdOnlyQuestionCount,
    questionTypes,
    context,
    onChunk,
}) {
    const supabase = getSupabaseOrThrow()

    const payload = {
        questionCount,
        jdOnlyQuestionCount,
        questionTypes,
        context,
    }

    const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: payload,
    })

    if (error) {
        throw toSupabaseFunctionError(error, 'Supabase function request failed.')
    }

    const text = String(data?.text || '').trim()
    if (!text) {
        throw toSupabaseFunctionError(null, 'Supabase function returned an empty questions payload.')
    }

    if (typeof onChunk === 'function') {
        onChunk(text)
    }

    return {
        text,
        providerId: String(data?.providerId || 'supabase'),
        model: String(data?.model || ''),
    }
}

export async function requestGeneratedReportFromBackend({
    mode,
    userMessage,
    context,
    onChunk,
}) {
    const supabase = getSupabaseOrThrow()

    const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
            mode,
            userMessage,
            context,
        },
    })

    if (error) {
        throw toSupabaseFunctionError(error, 'Supabase report function request failed.')
    }

    const text = String(data?.text || '').trim()
    if (!text) {
        throw toSupabaseFunctionError(null, 'Supabase report function returned an empty payload.')
    }

    if (typeof onChunk === 'function') {
        onChunk(text)
    }

    return {
        text,
        providerId: String(data?.providerId || 'supabase'),
        model: String(data?.model || ''),
    }
}

export async function requestTranscriptionFromBackend({ audioBlob }) {
    const supabase = getSupabaseOrThrow()

    if (!(audioBlob instanceof Blob)) {
        const error = new Error('Audio payload is required for backend transcription.')
        error.code = 'transcription-invalid-audio'
        throw error
    }

    const base64Audio = await blobToBase64(audioBlob)
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: {
            mimeType: String(audioBlob.type || 'audio/webm'),
            audioBase64: base64Audio,
        },
    })

    if (error) {
        throw toSupabaseFunctionError(error, 'Supabase transcription function request failed.')
    }

    const text = String(data?.text || '').trim()
    if (!text) {
        throw toSupabaseFunctionError(null, 'Supabase transcription function returned an empty payload.')
    }

    return {
        text,
        meta: {
            providerUsed: String(data?.meta?.providerUsed || 'deepgram'),
            fallbackApplied: Boolean(data?.meta?.fallbackApplied),
            fallbackReason: String(data?.meta?.fallbackReason || ''),
        },
    }
}

function normalizeQuestionSource(value) {
    const normalized = String(value || '').trim().toLowerCase()
    return normalized || 'generated'
}

function normalizeQuestionType(value) {
    const normalized = String(value || '').trim().toLowerCase()
    return normalized || 'technical'
}

export async function persistMockInterviewRecords({
    sessionTitle,
    interviewType,
    questions = [],
    answerSummaries = [],
    reports = [],
}) {
    const supabase = getSupabaseOrThrow()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user?.id) {
        throw toSupabaseFunctionError(userError, 'Could not resolve the signed-in user.')
    }

    const userId = user.id

    const { data: createdSession, error: sessionError } = await supabase
        .from('interview_sessions')
        .insert({
            user_id: userId,
            title: String(sessionTitle || 'Mock Interview Session').trim() || 'Mock Interview Session',
            interview_type: String(interviewType || 'mixed').trim() || 'mixed',
            status: 'completed',
        })
        .select('id')
        .single()

    if (sessionError || !createdSession?.id) {
        throw toSupabaseFunctionError(sessionError, 'Could not save interview session.')
    }

    const sessionId = createdSession.id

    const questionRows = questions
        .map((question, index) => {
            const questionText = String(question?.questionText || '').trim()
            if (!questionText) return null

            return {
                session_id: sessionId,
                user_id: userId,
                position: Number.isFinite(Number(question?.position))
                    ? Number(question.position)
                    : index,
                question_type: normalizeQuestionType(question?.questionType),
                question_text: questionText,
                source: normalizeQuestionSource(question?.source),
            }
        })
        .filter(Boolean)

    let createdQuestions = []
    if (questionRows.length) {
        const { data, error } = await supabase
            .from('session_questions')
            .insert(questionRows)
            .select('id, position, question_text')

        if (error) {
            throw toSupabaseFunctionError(error, 'Could not save session questions.')
        }

        createdQuestions = Array.isArray(data) ? data : []
    }

    const questionIdByText = new Map(
        createdQuestions.map((item) => [String(item?.question_text || '').trim().toLowerCase(), item?.id]),
    )

    const summaryRows = answerSummaries
        .map((summary) => {
            const transcript = String(summary?.transcript || '').trim()
            const questionText = String(summary?.question || '').trim()
            if (!transcript) return null

            return {
                session_id: sessionId,
                user_id: userId,
                question_id: questionIdByText.get(questionText.toLowerCase()) || null,
                transcript,
                summary_markdown: String(summary?.summaryMarkdown || '').trim(),
                metrics:
                    summary?.metrics && typeof summary.metrics === 'object'
                        ? summary.metrics
                        : {},
                captured_at: summary?.capturedAt || null,
            }
        })
        .filter(Boolean)

    if (summaryRows.length) {
        const { error } = await supabase.from('answer_summaries').insert(summaryRows)
        if (error) {
            throw toSupabaseFunctionError(error, 'Could not save answer summaries.')
        }
    }

    const reportRows = reports
        .map((report) => {
            const reportType = String(report?.reportType || '').trim().toLowerCase()
            const contentMarkdown = String(report?.contentMarkdown || '').trim()
            if (!reportType || !contentMarkdown) return null

            return {
                session_id: sessionId,
                user_id: userId,
                report_type: reportType,
                status: String(report?.status || 'ready').trim() || 'ready',
                model: String(report?.model || '').trim(),
                provider: String(report?.provider || '').trim(),
                content_markdown: contentMarkdown,
                error_message: String(report?.errorMessage || '').trim(),
            }
        })
        .filter(Boolean)

    if (reportRows.length) {
        const { error } = await supabase.from('reports').insert(reportRows)
        if (error) {
            throw toSupabaseFunctionError(error, 'Could not save report records.')
        }
    }

    return {
        sessionId,
        insertedQuestions: questionRows.length,
        insertedSummaries: summaryRows.length,
        insertedReports: reportRows.length,
    }
}

export async function listSavedMockInterviews({ limit = 20 } = {}) {
    const supabase = getSupabaseOrThrow()

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user?.id) {
        throw toSupabaseFunctionError(userError, 'Could not resolve the signed-in user.')
    }

    const normalizedLimit = Number.isFinite(Number(limit))
        ? Math.max(1, Math.min(100, Number(limit)))
        : 20

    const { data, error } = await supabase
        .from('interview_sessions')
        .select(
            'id, title, interview_type, status, created_at, reports(report_type, status, model, provider, content_markdown, created_at)',
        )
        .order('created_at', { ascending: false })
        .limit(normalizedLimit)

    if (error) {
        throw toSupabaseFunctionError(error, 'Could not load saved mock interviews.')
    }

    const rows = Array.isArray(data) ? data : []

    return rows.map((row) => {
        const reports = Array.isArray(row?.reports) ? row.reports : []
        const amReport = reports.find(
            (report) => String(report?.report_type || '').trim().toLowerCase() === 'am',
        )

        return {
            id: row?.id || '',
            title: String(row?.title || '').trim() || 'Mock Interview Session',
            interviewType: String(row?.interview_type || '').trim() || 'mixed',
            status: String(row?.status || '').trim() || 'completed',
            createdAt: row?.created_at || null,
            amReportMarkdown: String(amReport?.content_markdown || '').trim(),
            amReportStatus: String(amReport?.status || '').trim() || '',
            amReportProvider: String(amReport?.provider || '').trim() || '',
            amReportModel: String(amReport?.model || '').trim() || '',
            amReportCreatedAt: amReport?.created_at || null,
        }
    })
}
