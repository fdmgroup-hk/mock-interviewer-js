export default function GenerateQuestionsCountModal({
    isOpen,
    value,
    onValueChange,
    onConfirm,
    onClose,
    questionTypes,
    onQuestionTypeChange,
    min = 2,
    max = 25,
}) {
    if (!isOpen) return null

    const selectedQuestionTypes = questionTypes || {
        behavioural: true,
        technical: true,
        situational: true,
    }

    return (
        <div
            className="overlay"
            role="presentation"
            onPointerDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose()
                }
            }}
        >
            <div
                className="modal compact question-count-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="question-count-title"
                onClick={(event) => event.stopPropagation()}
            >
                <h2 id="question-count-title">Number of Interview Questions to Generate</h2>
                <input
                    id="question-count-input"
                    type="number"
                    className="field"
                    aria-label="Number of interview questions to generate"
                    min={min}
                    max={max}
                    step={1}
                    value={value}
                    onChange={(event) => onValueChange(event.target.value)}
                    autoFocus
                />
                <div className="question-count-type-options" role="group" aria-label="Question types">
                    <label className="debug-toggle">
                        <input
                            type="checkbox"
                            checked={Boolean(selectedQuestionTypes.behavioural)}
                            onChange={(event) =>
                                onQuestionTypeChange?.('behavioural', event.target.checked)
                            }
                        />
                        <span>Behavioural</span>
                    </label>
                    <label className="debug-toggle">
                        <input
                            type="checkbox"
                            checked={Boolean(selectedQuestionTypes.technical)}
                            onChange={(event) =>
                                onQuestionTypeChange?.('technical', event.target.checked)
                            }
                        />
                        <span>Technical</span>
                    </label>
                    <label className="debug-toggle">
                        <input
                            type="checkbox"
                            checked={Boolean(selectedQuestionTypes.situational)}
                            onChange={(event) =>
                                onQuestionTypeChange?.('situational', event.target.checked)
                            }
                        />
                        <span>Situational</span>
                    </label>
                </div>
                <div className="actions">
                    <button
                        type="button"
                        className="btn"
                        onClick={onConfirm}
                    >
                        Generate Questions
                    </button>
                    <button
                        type="button"
                        className="btn ghost"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    )
}
