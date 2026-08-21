export function getCombinedReportPanels({ am, coach, detailed }) {
    return {
        leftColumn: [
            { title: 'AM Report', content: am },
            { title: 'Coach Report', content: coach },
        ],
        rightColumn: [{ title: 'Detailed Report', content: detailed }],
    }
}
