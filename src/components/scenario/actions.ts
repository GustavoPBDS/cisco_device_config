'use server'

export const analyzeScenario = async (scenario: Array<Record<string, string>>) => {
    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/analyze-scenario`

    const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify({ scenario }),
        headers: { "Content-Type": "application/json" },
    })
    const response = await res.json()

    return response.data
}