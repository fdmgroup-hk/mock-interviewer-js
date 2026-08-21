export const DEFAULT_QUESTION_GENERATION_GUIDELINES =
    'Generate concise, role-relevant interview questions. Cover technical depth, behavioral examples, and company alignment. Avoid duplicates. Return one question per line.'

export const DEFAULT_AM_REPORT_GENERATION_GUIDELINES =
    'Generate a report for an account-manager at a consulting firm regarding the Answers provided in context, which were answered by a consultant. Provide feedback grounded in the interview answer transcript, answer metrics, JD and CV. Be specific, concise, and evidence-based. Do not generate per-question feedback. Use markdown only (no HTML) and follow this structure: ## Summary, ## Key Strengths, ## Key Weaknesses, ## Domain Knowledge Assessment, ## Recommended Coach Actions, ## Final Recommendation.'

export const DEFAULT_DETAILED_REPORT_GENERATION_GUIDELINES =
    'Generate an in-depth report with an executive summary first, then detailed per-question analysis. For each question include strengths, weaknesses, metric interpretation, and a suggested improved answer. Tailor suggested answers to CV/JD/company/job title when relevant, and explicitly state when profile context is not relevant to that specific question.'

export function buildQuestionGenerationUserMessage(questionCount, jdOnlyQuestionCount) {
    return `Generate ${questionCount} concise mock interview questions based on the provided CV, job description, and company. If a job description is provided, include at least ${jdOnlyQuestionCount} questions that are derived only from the job description requirements and are not based on the CV. Return only the questions, one per line, no intro or explanation.`
}

export function buildQuestionTypePromptInstruction(questionTypes = {}) {
    const selectedLabels = [
        questionTypes.behavioural ? 'Behavioural' : '',
        questionTypes.technical ? 'Technical' : '',
        questionTypes.situational ? 'Situational' : '',
    ].filter(Boolean)

    const situationalTheoreticalInstruction =
        'When generating situational questions, use theoretical scenario-based prompts (e.g., "What would you do if...") rather than asking about past experiences.'

    if (!selectedLabels.length) {
        return `Include a balanced mix of Behavioural, Technical, and Situational interview questions. ${situationalTheoreticalInstruction}`
    }

    if (selectedLabels.length === 1) {
        if (questionTypes.situational) {
            return `Generate only Situational interview questions. ${situationalTheoreticalInstruction}`
        }

        return `Generate only ${selectedLabels[0]} interview questions.`
    }

    return `Generate only these question types: ${selectedLabels.join(', ')}.${questionTypes.situational ? ` ${situationalTheoreticalInstruction}` : ''}`
}

export const AM_REPORT_USER_MESSAGE =
    'You are an Interview Expert for a Consulting Firm. You are writing feedback for mock interview answers. Using interview Job Title, Q&A transcript, Q&A metrics, JD and CV, return concise, evidence-based markdown in this exact section order: 1) ## Overall Verdict, 2) ## Key Strengths, 3) ## Key Weaknesses, 4) ## Domain Knowledge Assessment, 5) ## Recommended Coach Actions, 6) ## Final Recommendation. Keep it account-manager friendly and do not include per-question analysis.'

export const COACH_REPORT_USER_MESSAGE =
    'Write only the final coach report in markdown. Do not reveal analysis, reasoning, planning, deliberation, instruction restatement, or self-critique. Do not begin with a preamble. The first characters of your response must be "## Overall Verdict" and the response must end after "## Final Recommendation". Use only evidence present in the interview questions, interview answer transcripts, and answer metrics for performance judgments. CV, JD, company, and job title may provide context but must not create evidence of interview performance. Return concise markdown in exactly this order: ## Overall Verdict, ## Preparedness Grade, ## Key Strengths, ## Key Weaknesses, then conditionally ## Domain Knowledge Assessment if the interview type includes Technical, conditionally ## Behavioural Assessment if it includes Behavioural, ## Recommended Coach Actions, and ## Final Recommendation. Overall Verdict must contain bullet points, never one summary paragraph. Preparedness Grade must contain exactly one grade from A+ to F and one short sentence explaining the preparedness level and performance-based reason. For Key Strengths and Key Weaknesses, assess each of these six aspects exactly once: Clarity and Structure, Relevance and Depth, Evidence and Examples, Communication, Confidence and Engagement, and Impact and Conclusion. Each aspect must be classified exclusively as either a strength or a weakness. Put an aspect in Key Strengths only when a specific positive performance is directly evidenced in a non-empty answer; otherwise put it in Key Weaknesses only when a specific deficiency is evidenced. Never infer a positive from silence, missing answers, short answers, no hesitations, speaking speed, or the fact that an answer was recorded. If no genuine strengths are evidenced, write only "- None demonstrated." Do not mention Odoo or any other technology in Domain Knowledge Assessment unless that topic was explicitly asked about in an interview question and the candidate gave a substantive answer about it. Domain Knowledge Assessment must use subject or tool bullets with square-bracket proficiency tags and concise evidence comments. Behavioural Assessment must use competency bullets with square-bracket proficiency tags and concise evidence comments. Do not include per-question analysis.'

export const DETAILED_REPORT_USER_MESSAGE =
    'You are an Interview Expert for a Consulting Firm. Using the provided interview context, return markdown with these exact top-level sections in order: 1) Initial Feedback, 2) Overall Rating (out of 10), 3) Answer Strengths, 4) Answer Weaknesses, 5) Future Directions For Improvement, 6) Detailed Per-Question Analysis. In section 6, create one subsection per answer using heading format "### Question N: <question>" and include: Candidate Answer Snapshot, Strengths, Weaknesses, Metric Interpretation, Suggested Improved Answer. The Suggested Improved Answer must describe an ideal answer and tailor it to CV/JD/company/job title context when relevant; if not relevant, explicitly state that no CV/JD tailoring applies. Keep feedback specific, concise, and evidence-based using transcript and metrics.'

export function buildCoachReportGenerationGuidelines(interviewType) {
    return `Interview type: ${interviewType}. Include Domain Knowledge Assessment only when Technical is selected, and use only technical topics explicitly asked and substantively answered in the interview. Include Behavioural Assessment only when Behavioural is selected. Return final markdown only; do not expose reasoning or repeat the instructions.`
}
