import { describe, expect, it } from 'vitest'
import { getCombinedReportPanels } from './reportLayout'

describe('combined report layout', () => {
    it('keeps AM and Coach in the left column beside the Detailed Report on the right', () => {
        const layout = getCombinedReportPanels({
            am: 'AM markdown',
            coach: 'Coach markdown',
            detailed: 'Detailed markdown',
        })

        expect(layout.leftColumn.map((panel) => panel.title)).toEqual([
            'AM Report',
            'Coach Report',
        ])
        expect(layout.rightColumn.map((panel) => panel.title)).toEqual(['Detailed Report'])
        expect(layout.leftColumn[1].content).toBe('Coach markdown')
    })
})
