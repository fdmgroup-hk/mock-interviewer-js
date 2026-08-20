export type QuestionTypes = {
    behavioural?: boolean
    technical?: boolean
    situational?: boolean
}

export type ReportContext = {
    question?: unknown
    answer?: unknown
    generationGuidelines?: unknown
    metricSummary?: unknown
    companyName?: unknown
    consultantFullName?: unknown
    jobTitle?: unknown
    interviewType?: unknown
    cv?: unknown
    jobDescription?: unknown
}

export const DEFAULT_QUESTION_GENERATION_GUIDELINES =
    'Generate concise, role-relevant interview questions at a slightly easier, recent-graduate level by default. Assume the candidate is a recent graduate unless the CV clearly demonstrates more professional experience, seniority, or specialized expertise. Prefer foundational concepts, approachable scenarios, and questions that can be answered using academic projects, internships, or early-career experience; only increase difficulty when the CV supports it. Cover technical depth, behavioral examples, and company alignment. Avoid duplicates. Return one question per line.'

export const DEFAULT_AM_REPORT_GENERATION_GUIDELINES =
    'Generate a report for an account-manager at a consulting firm regarding the Answers provided in context, which were answered by a consultant. Provide feedback grounded in the interview answer transcript, answer metrics, JD and CV. Be specific, concise, and evidence-based. Do not generate per-question feedback. Use markdown only (no HTML) and follow this structure: ## Summary, ## Key Strengths, ## Key Weaknesses, ## Domain Knowledge Assessment, ## Recommended Coach Actions, ## Final Recommendation.'

export const DEFAULT_DETAILED_REPORT_GENERATION_GUIDELINES =
    'Generate an in-depth report with an executive summary first, then detailed per-question analysis. For each question include strengths, weaknesses, metric interpretation, and a suggested improved answer. Tailor suggested answers to CV/JD/company/job title when relevant, and explicitly state when profile context is not relevant to that specific question.'

export const QUESTION_GENERATION_USER_MESSAGE = (questionCount: number, jdOnlyQuestionCount: number) =>
    `Generate ${questionCount} concise mock interview questions based on the provided CV, job description, and company. If a job description is provided, include at least ${jdOnlyQuestionCount} questions that are derived only from the job description requirements and are not based on the CV. Return only the questions, one per line, no intro or explanation.`

export const QUESTION_GENERATION_SYSTEM_PROMPT =
    'You are an expert interview coach. Generate realistic, role-relevant interview questions that are concise and actionable.'

export const REPORT_GENERATION_SYSTEM_PROMPT =
    'You are an expert interview coach and reviewer. Return final markdown only. Be concise, specific, and evidence-based.'

export function buildQuestionTypeInstruction(questionTypes: QuestionTypes = {}) {
    const selected = [
        questionTypes.behavioural ? 'Behavioural' : '',
        questionTypes.technical ? 'Technical' : '',
        questionTypes.situational ? 'Situational' : '',
    ].filter(Boolean)

    const situationalInstruction =
        'When generating situational questions, use theoretical scenario prompts such as What would you do if.'

    if (!selected.length) {
        return `Include a balanced mix of Behavioural, Technical, and Situational questions. ${situationalInstruction}`
    }

    if (selected.length === 1) {
        return selected[0] === 'Situational'
            ? `Generate only Situational questions. ${situationalInstruction}`
            : `Generate only ${selected[0]} questions.`
    }

    return `Generate only the following question types: ${selected.join(', ')}. ${questionTypes.situational ? situationalInstruction : ''}`.trim()
}

export function buildQuestionGenerationUserPrompt(questionCount: number, jdOnlyQuestionCount: number) {
    return QUESTION_GENERATION_USER_MESSAGE(questionCount, jdOnlyQuestionCount)
}

export function buildQuestionGenerationContextBlock({
    generationGuidelines,
    questionTypeInstruction,
    companyName,
    jobTitle,
    cv,
    jobDescription,
    priorFeedback,
}: {
    generationGuidelines: string
    questionTypeInstruction: string
    companyName: string
    jobTitle: string
    cv: string
    jobDescription: string
    priorFeedback: string
}) {
    return [
        'Interview context:',
        `- Generation guidelines: ${generationGuidelines}`,
        `- Question type instruction: ${questionTypeInstruction}`,
        `- Company: ${companyName}`,
        `- Job Title: ${jobTitle}`,
        '- CV:',
        cv,
        '- Job Description:',
        jobDescription,
        ...(priorFeedback ? ['- Prior Interview Feedback:', priorFeedback] : []),
    ].join('\n')
}

export function buildReportGenerationContextBlock(mode: string, context: ReportContext = {}) {
    return [
        'Interview context:',
        `- Requested mode: ${mode}`,
        `- Question: ${String(context.question || '(not provided)')}`,
        '- Answer transcript or summary:',
        String(context.answer || '(not provided)'),
        '- Generation guidelines:',
        String(context.generationGuidelines || '(not provided)'),
        `- Metrics summary: ${String(context.metricSummary || '(not provided)')}`,
        `- Company: ${String(context.companyName || '(not provided)')}`,
        `- Consultant Full Name: ${String(context.consultantFullName || '(not provided)')}`,
        `- Job Title: ${String(context.jobTitle || '(not provided)')}`,
        `- Interview Type: ${String(context.interviewType || '(not provided)')}`,
        '- CV:',
        String(context.cv || '(not provided)'),
        '- Job Description:',
        String(context.jobDescription || '(not provided)'),
    ].join('\n')
}
